import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/client.js", import.meta.url), "utf8");
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const payload = (tokens = 10) => ({ points: [{ date: "2026-11-16", tokens }], granularity: "day", balance: { total: 20 } });
function harness(extra = {}) {
  const requests = [];
  const state = { data: null, cal: null, err: "", busy: false };
  const context = vm.createContext({
    AbortController, Date, BASE: "/api/deepseek-usage", TZ: 28800,
    ready: true, mode: "official", page: "detail", range: "today", custom: null,
    anchor: { year: 2026, month: 11 }, dim: "day", sessionsNeeded: false,
    requestRef: { current: 0 }, viewAbort: { current: null }, viewPending: { current: false },
    setData: value => { state.data = value; }, setCal: value => { state.cal = value; },
    setErr: value => { state.err = value; }, setBusy: value => { state.busy = value; },
    normalizeDays: value => value, ratesParam: () => "",
    rangeDates: () => ({ from: "2026-11-16", to: "2026-11-16" }),
    iso: date => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"),
    // Deliberately ignore abort, to also verify late-result guards.
    fetch: (url, options) => new Promise((resolve, reject) => {
      requests.push({ url, signal: options.signal, reject,
        respond(value = payload(), status = 200) { resolve({ ok: status < 400, status, json: async () => value }); } });
    }),
    ...extra,
  });
  vm.runInContext(between("function getJSON(", "function blankUsage(") + between("function usageView(", "var TZ = ") + between("  function loadView(force)", "  function loadToday("), context);
  return { context, state, requests, load: force => context.loadView(force) };
}

test("official model trend does not read local logs; selecting sessions loads both with one signal", async () => {
  const h = harness();
  let pending = h.load(false);
  assert.equal(h.requests.length, 1);
  assert.match(h.requests[0].url, /\/official\?/);
  h.requests[0].respond();
  await pending;
  h.context.sessionsNeeded = true;
  pending = h.load(false);
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[1].signal, h.requests[2].signal);
  h.requests[1].respond();
  h.requests[2].respond({ sessions: [{ sessionId: "local" }] });
  await pending;
  assert.equal(h.state.data.sessions[0].sessionId, "local");
});

test("a replacement refresh aborts the previous request and ignores its late result", async () => {
  const h = harness();
  const old = h.load(false);
  const latest = h.load(true);
  assert.equal(h.requests[0].signal.aborted, true);
  assert.equal(h.requests[1].signal.aborted, false);
  h.requests[0].respond(payload(999));
  await old;
  assert.equal(h.state.data, null);
  assert.equal(h.state.busy, true);
  h.requests[1].respond(payload(20));
  await latest;
  assert.equal(h.state.data.days[0].tokens, 20);
  assert.equal(h.state.busy, false);
  assert.equal(h.context.viewPending.current, false);
});

test("effect cleanup cancels the view on range/source/page changes and unmount", async () => {
  for (const property of ["range", "mode", "page", "unmount"]) {
    const h = harness();
    let cleanup, pending;
    h.context.useEffect = callback => { cleanup = callback(); };
    const load = h.context.loadView;
    h.context.loadView = force => { pending = load(force); return pending; };
    vm.runInContext(between("  useEffect(function () { loadView(false);", "  useEffect(function () { loadToday();"), h.context);
    assert.equal(typeof cleanup, "function");
    h.context[property] = "changed";
    cleanup();
    assert.equal(h.requests[0].signal.aborted, true);
    h.requests[0].respond();
    await pending;
    assert.equal(h.state.data, null);
    assert.equal(h.state.err, "");
  }
});

test("refresh failures retain successful data and timestamp, while a successful retry clears the error", async () => {
  const h = harness();
  let pending = h.load(false);
  h.requests[0].respond();
  await pending;
  const original = h.state.data;
  pending = h.load(true);
  h.requests[1].reject(new TypeError("Failed to fetch"));
  await pending;
  assert.equal(h.state.data, original);
  assert.equal(h.state.data.updatedAt, original.updatedAt);
  assert.match(h.state.err, /检查连接.*重试/);
  assert.equal(h.state.busy, false);
  pending = h.load(true);
  h.requests[2].respond(payload(30));
  await pending;
  assert.equal(h.state.err, "");
  assert.equal(h.state.data.days[0].tokens, 30);
});

test("authentication failures clear retained account data, and cancellation stays silent", async () => {
  const h = harness();
  let pending = h.load(false);
  h.requests[0].respond();
  await pending;
  pending = h.load(true);
  h.requests[1].respond({}, 401);
  await pending;
  assert.equal(h.state.data, null);
  assert.match(h.state.err, /登录/);
  h.state.err = "";
  pending = h.load(true);
  h.context.viewAbort.current.abort();
  h.requests[2].reject(new DOMException("Aborted", "AbortError"));
  await pending;
  assert.equal(h.state.err, "");
  assert.equal(h.context.viewPending.current, false);
});

test("calendar local ranges forward cancellation and keep coverage/pricing metadata", async () => {
  const h = harness({ mode: "local", page: "calendar" });
  const pending = h.load(false);
  assert.match(h.requests[0].url, /\/local\?from=2026-11-01&to=2026-11-30/);
  assert.equal(h.requests[0].signal, h.context.viewAbort.current.signal);
  h.requests[0].respond({ ...payload(), coverage: { complete: false, lastSweepAt: 123 }, costMeta: { complete: false } });
  await pending;
  assert.equal(h.state.cal.local.coverage.complete, false);
  assert.equal(h.state.cal.local.costMeta.complete, false);
  assert.equal(h.state.cal.updatedAt, 123);
});

test("custom ranges and legacy official fallback share the view cancellation signal", async () => {
  const h = harness({ range: "custom", custom: { from: "2026-11-01", to: "2026-11-02" } });
  let pending = h.load(true);
  assert.match(h.requests[0].url, /from=2026-11-01&to=2026-11-02/);
  h.requests[0].respond();
  await pending;
  h.context.range = "today";
  h.context.custom = null;
  pending = h.load(true);
  h.requests[1].respond({}, 404);
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[1].signal, h.requests[2].signal);
  assert.match(h.requests[2].url, /force=1/);
  h.requests[2].respond();
  await pending;
});

test("a failed session log query reports unavailable separately and preserves the official bill", async () => {
  const h = harness({ sessionsNeeded: true });
  const pending = h.load(false);
  h.requests[0].respond(payload(77));
  h.requests[1].respond({}, 503);
  await pending;
  assert.equal(h.state.data.days[0].tokens, 77);
  assert.match(h.state.data.sessionError, /暂不可用/);
  assert.equal(h.state.err, "");
});

test("a shared today request survives dialog cleanup, but a newer source cancels and silences its predecessor", async () => {
  const h = harness();
  const emissions = [];
  h.context.todayEmit = (mode, value, key) => emissions.push({ mode, value, key });
  h.context.todayKey = mode => mode;
  h.context.total = rows => ({ tokens: rows[0].tokens });
  vm.runInContext('var TODAY = { key: "", value: null, at: 0, promise: null, seq: 0 }, todayController;' + between("function todayLoad(", "function modelsOf("), h.context);
  const old = h.context.todayLoad("official", false);
  assert.equal(h.context.todayLoad("official", false), old, "sidebar and panel share a single pending request");
  let view;
  const load = h.context.loadView;
  h.context.loadView = force => { view = load(force); return view; };
  let cleanup;
  h.context.useEffect = callback => { cleanup = callback(); };
  vm.runInContext(between("  useEffect(function () { loadView(false);", "  useEffect(function () { loadToday();"), h.context);
  cleanup();
  assert.equal(h.requests[0].signal.aborted, false, "closing a panel must not cancel sidebar's shared usage");
  assert.equal(h.requests[1].signal.aborted, true);
  h.requests[1].respond();
  await view;
  const newer = h.context.todayLoad("local", false);
  assert.equal(h.requests[0].signal.aborted, true);
  h.requests[0].respond(payload(999));
  await old;
  assert.equal(emissions.length, 0, "old source responses must not emit");
  h.requests[2].respond(payload(12));
  await newer;
  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].mode, "local");
  assert.equal(emissions[0].value.tokens, 12);
});

test("freshness follows the API timestamp and session errors have separate status text", async () => {
  const h = harness();
  const pending = h.load(false);
  h.requests[0].respond({ ...payload(), fetchedAt: 123456 });
  await pending;
  assert.equal(h.state.data.updatedAt, 123456);
  const notes = source.slice(source.indexOf('  var shown = page === "calendar" ? cal : data;'), source.indexOf('  var content = jsxs("section", {'));
  const shown = { ...h.state.data, local: { coverage: { complete: false }, costMeta: { complete: false } }, sessionError: "暂不可用" };
  const messages = vm.runInNewContext(notes + '\nnotes;', { page: "detail", data: shown, today: null });
  const status = source.slice(source.indexOf('        jsxs("span", { role: "status",'), source.indexOf('\n        err ? jsx("span",', source.indexOf('        jsxs("span", { role: "status",'))).trim().replace(/,$/, "");
  const render = updatedAt => vm.runInNewContext(status, {
    switching: false, busy: false, shown: { updatedAt }, notes: messages,
    jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props) => ({ type, props }),
  });
  const first = render(123456), next = render(124456);
  assert.equal(first.props.children[1].type, "time");
  assert.match(first.props.children[1].props.children, /上次更新/);
  assert.notEqual(first.props.children[1].key, next.props.children[1].key);
  assert.equal(first.props.children[2], next.props.children[2], "timestamp updates leave warning text stable");
  assert.match(messages.join(" "), /统计不完整/);
  assert.match(messages.join(" "), /暂无费率/);
  assert.match(messages.join(" "), /会话排行不可用/);
});

test("confirmed mode changes reset the lazy session-view flag before changing sources", () => {
  let accept, requested = true, mode = "official";
  const fragment = between('  if (!sourceRef.current) sourceRef.current = createSourceSync(', '  useEffect(function () { sourceRef.current.load();');
  vm.runInNewContext(fragment, {
    sourceRef: { current: null }, getBudget() {}, postBudget() {}, acceptBudget() {},
    createSourceSync(_read, _write, callback) { accept = callback; return {}; },
    readSourceMode: () => mode, setSessionsNeeded: value => { requested = value; },
    setMode: value => { mode = value; }, writeSourceMode() {}, window: { alert() {} },
  });
  accept({ config: { mode: "local" } });
  assert.equal(mode, "local");
  assert.equal(requested, false);
  requested = true;
  accept({ config: { mode: "official" } });
  assert.equal(requested, false);
});

test("today failures emit an explicit error rather than a fabricated zero, and recover on retry", async () => {
  const h = harness();
  const emissions = [];
  h.context.todayEmit = (_mode, value) => emissions.push(value);
  h.context.todayKey = mode => mode;
  h.context.total = rows => ({ tokens: rows[0].tokens });
  vm.runInContext('var TODAY = { key: "", value: null, at: 0, promise: null, seq: 0 }, todayController;' + between("function todayLoad(", "function modelsOf("), h.context);
  let pending = h.context.todayLoad("official", false);
  h.requests[0].reject(new TypeError("Failed to fetch"));
  await pending;
  assert.match(emissions[0].error, /重试/);
  assert.equal(emissions[0].tokens, undefined);
  pending = h.context.todayLoad("official", true);
  h.requests[1].respond(payload(15));
  await pending;
  assert.equal(emissions.at(-1).error, undefined);
  assert.equal(emissions.at(-1).tokens, 15);
});
