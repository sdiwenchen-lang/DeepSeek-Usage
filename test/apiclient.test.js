import test from "node:test";
import assert from "node:assert/strict";
import { createApiClient, normalizeRangeAmount, normalizeRangeCost, UpstreamAuthError, UpstreamError } from "../src/apiclient.js";

const TIME = 1794178800;
const window = { start: TIME, end: TIME + 3600, tz: 28800 };
const usage = () => ({ PROMPT_TOKEN: "3", PROMPT_CACHE_HIT_TOKEN: "1", PROMPT_CACHE_MISS_TOKEN: 2, RESPONSE_TOKEN: "4", REQUEST: 1 });
const amount = () => ({ bucket: 3600, series: [{ model: "deepseek-chat", buckets: [{ time: TIME, usage: usage() }] }] });
const cost = () => ({ bucket: 3600, data: [{ currency: "CNY", series: [{ model: "deepseek-chat", buckets: [{ time: TIME, cost: "0.25" }] }] }] });
const response = (value, status = 200) => ({
  status, ok: status >= 200 && status < 300,
  json: async () => ({ code: 0, data: { biz_data: value } }),
  text: async () => "upstream error",
});
const invalid = (error) => error instanceof UpstreamError && error.code === "invalid-upstream-response" && error.status === 502;
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

test("range normalizers retain real series/buckets shapes and numeric strings", () => {
  assert.deepEqual(normalizeRangeAmount(amount()), { bucket: 3600, rows: [{ ts: TIME, model: "deepseek-chat", hit: 1, miss: 2, output: 4, requests: 1 }] });
  const value = cost();
  value.data.push({ currency: "USD", series: [{ model: "other", buckets: [{ time: TIME, cost: 5 }] }] });
  assert.deepEqual(normalizeRangeCost(value), { bucket: 3600, rows: [{ ts: TIME, model: "deepseek-chat", cost: 0.25 }] });
});

test("explicit empty series and zero-valued buckets remain legitimate zero data", () => {
  for (const bucket of [3600, 86400, "3600"]) {
    assert.deepEqual(normalizeRangeAmount({ bucket, series: [] }), { bucket: Number(bucket), rows: [] });
    assert.deepEqual(normalizeRangeCost({ bucket, data: [] }), { bucket: Number(bucket), rows: [] });
  }
  const a = amount(), c = cost();
  for (const key of Object.keys(a.series[0].buckets[0].usage)) a.series[0].buckets[0].usage[key] = "0";
  c.data[0].series[0].buckets[0].cost = 0;
  assert.equal(normalizeRangeAmount(a).rows[0].hit, 0);
  assert.equal(normalizeRangeAmount(a).rows[0].requests, 0);
  assert.equal(normalizeRangeCost(c).rows[0].cost, 0);
  a.series[0].buckets = []; c.data[0].series = [];
  assert.deepEqual(normalizeRangeAmount(a).rows, []);
  assert.deepEqual(normalizeRangeCost(c).rows, []);
});

test("range normalizers reject missing or malformed containers rather than return zero", () => {
  for (const value of [undefined, null, [], {}, { unexpected: true }, { bucket: 3600 }]) {
    assert.throws(() => normalizeRangeAmount(value), invalid);
    assert.throws(() => normalizeRangeCost(value), invalid);
  }
  for (const bucket of [undefined, null, true, "", "bad", -3600, 0, 1, 3600.5, Infinity, NaN]) {
    assert.throws(() => normalizeRangeAmount({ bucket, series: [] }), invalid);
    assert.throws(() => normalizeRangeCost({ bucket, data: [] }), invalid);
  }
  for (const series of [null, {}, [null], [{}], [{ model: "", buckets: [] }], [{ model: "x", buckets: {} }]]) {
    assert.throws(() => normalizeRangeAmount({ bucket: 3600, series }), invalid);
    assert.throws(() => normalizeRangeCost({ bucket: 3600, data: [{ currency: "CNY", series }] }), invalid);
  }
  for (const data of [null, {}, [null], [{}], [{ currency: "", series: [] }]]) {
    assert.throws(() => normalizeRangeCost({ bucket: 3600, data }), invalid);
  }
});

test("range values reject missing, negative, nonfinite and coerced non-numbers", () => {
  for (const value of [undefined, null, true, [], {}, "", " ", "bad", "Infinity", -1, Infinity, NaN]) {
    for (const key of ["PROMPT_CACHE_HIT_TOKEN", "PROMPT_CACHE_MISS_TOKEN", "RESPONSE_TOKEN", "REQUEST"]) {
      const a = amount(); a.series[0].buckets[0].usage[key] = value;
      assert.throws(() => normalizeRangeAmount(a), invalid, `${key}: ${String(value)}`);
    }
    const c = cost(); c.data[0].series[0].buckets[0].cost = value;
    assert.throws(() => normalizeRangeCost(c), invalid);
  }
  const a = amount(); a.series[0].buckets[0].usage = null;
  assert.throws(() => normalizeRangeAmount(a), invalid);
  for (const time of [undefined, null, true, "", -1, Infinity, 0.5, TIME * 1000]) {
    const a = amount(), c = cost();
    a.series[0].buckets[0].time = time; c.data[0].series[0].buckets[0].time = time;
    assert.throws(() => normalizeRangeAmount(a), invalid);
    assert.throws(() => normalizeRangeCost(c), invalid);
  }
});

test("all five fetch methods still unwrap their existing successful envelopes", async () => {
  const values = [{ normal_wallets: [{ currency: "CNY", balance: "2" }] }, { days: [] }, [], amount(), cost()];
  const api = createApiClient({ fetch: async () => response(values.shift()) });
  assert.equal((await api.fetchSummary("token")).total, 2);
  assert.deepEqual(await api.fetchUsageAmount("token", { year: 2026, month: 11 }), []);
  assert.deepEqual(await api.fetchUsageCost("token", { year: 2026, month: 11 }), []);
  assert.equal((await api.fetchRangeAmount("token", window)).rows[0].hit, 1);
  assert.equal((await api.fetchRangeCost("token", window)).rows[0].cost, 0.25);
  api.dispose();
});

test("malformed successful HTTP payloads reject with a structured upstream error", async () => {
  const api = createApiClient({ fetch: async () => response({ unexpected: true }) });
  await assert.rejects(api.fetchRangeAmount("token", window), invalid);
  await assert.rejects(api.fetchRangeCost("token", window), invalid);
});

test("deadline covers a stalled JSON body even when fetch ignores cancellation", async () => {
  let signal, released = 0;
  const api = createApiClient({ timeoutMs: 20, fetch: async (_url, init) => {
    signal = init.signal;
    return { ...response({}), json: () => new Promise(() => {}), body: { cancel: async () => { released++; } } };
  } });
  await assert.rejects(api.fetchSummary("token"), { name: "TimeoutError" });
  assert.equal(signal.aborted, true);
  assert.equal(released, 1);
});

test("deadline also covers a stalled fetch and an error response body", async () => {
  const api = createApiClient({ timeoutMs: 20, fetch: () => new Promise(() => {}) });
  await assert.rejects(api.fetchSummary("token"), { name: "TimeoutError" });
  const failure = createApiClient({ timeoutMs: 20, fetch: async () => ({ ...response({}, 400), text: () => new Promise(() => {}) }) });
  await assert.rejects(failure.fetchSummary("token"), { name: "TimeoutError" });
});

test("retry responses release their bodies before waiting or fetching again", async () => {
  const events = [];
  const api = createApiClient({ backoffMs: [0, 0], fetch: async () => {
    events.push("fetch");
    if (events.filter((event) => event === "fetch").length < 3) return { ...response({}, 503), body: { cancel: async () => { events.push("cancel"); } } };
    return response(amount());
  } });
  assert.equal((await api.fetchRangeAmount("token", window)).rows.length, 1);
  assert.deepEqual(events, ["fetch", "cancel", "fetch", "cancel", "fetch"]);
});

test("the total deadline cancels retry backoff without another fetch", async () => {
  let calls = 0;
  const api = createApiClient({ timeoutMs: 20, backoffMs: [1000], fetch: async () => { calls++; return response({}, 429); } });
  await assert.rejects(api.fetchSummary("token"), { name: "TimeoutError" });
  assert.equal(calls, 1);
});

test("dispose cancels retry waits and prevents every subsequent API request", async () => {
  const released = deferred();
  let calls = 0;
  const api = createApiClient({ backoffMs: [1000], fetch: async () => {
    calls++; return { ...response({}, 429), body: { cancel: async () => { released.resolve(); } } };
  } });
  const pending = assert.rejects(api.fetchSummary("token"), { name: "AbortError" });
  await released.promise;
  await new Promise(setImmediate); // Let the retry enter its backoff timer.
  api.dispose(); api.dispose();
  await pending;
  for (const operation of [
    () => api.fetchSummary("token"),
    () => api.fetchUsageAmount("token", { year: 2026, month: 11 }),
    () => api.fetchUsageCost("token", { year: 2026, month: 11 }),
    () => api.fetchRangeAmount("token", window),
    () => api.fetchRangeCost("token", window),
  ]) await assert.rejects(operation(), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("dispose aborts all concurrent fetches and body reads, not only the latest", async () => {
  const bodyReady = deferred(), fetchReady = deferred(), signals = [];
  const api = createApiClient({ fetch: async (_url, { signal }) => {
    signals.push(signal);
    if (signals.length === 2) { fetchReady.resolve(); return new Promise(() => {}); }
    return { ...response({}), json: () => { bodyReady.resolve(); return new Promise(() => {}); } };
  } });
  const pending = [api.fetchSummary("a"), api.fetchRangeAmount("b", window)].map((promise) => assert.rejects(promise, { name: "AbortError" }));
  await Promise.all([bodyReady.promise, fetchReady.promise]);
  api.dispose();
  await Promise.all(pending);
  assert.equal(signals.length, 2);
  assert.ok(signals.every((signal) => signal.aborted));
});

test("401 and ordinary 4xx errors are not retried and preserve existing error types", async () => {
  for (const status of [401, 400]) {
    let calls = 0, released = 0;
    const api = createApiClient({ fetch: async () => { calls++; return { ...response({}, status), body: { cancel: async () => { released++; } } }; } });
    await assert.rejects(api.fetchSummary("token"), (error) => error.status === status && error instanceof (status === 401 ? UpstreamAuthError : UpstreamError));
    assert.equal(calls, 1);
    assert.equal(released, 1);
  }
});
