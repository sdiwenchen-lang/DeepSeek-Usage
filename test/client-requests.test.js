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
  const shown = { ...h.state.data, local: { coverage: { complete: false, failed: 2 }, costMeta: { complete: false, unpricedTokens: 50 } }, sessionError: "暂不可用" };
  const messages = vm.runInNewContext(notes + '\nnotes;', { page: "detail", data: shown, today: null });
  const status = source.slice(source.indexOf('        jsxs("span", { role: "status",'), source.indexOf('\n        err ? jsx("span",', source.indexOf('        jsxs("span", { role: "status",'))).trim().replace(/,$/, "");
  const render = (updatedAt, busy = false, switching = false) => vm.runInNewContext(status, {
    switching, busy, shown: { updatedAt }, notes: messages, UpdatedTime: function UpdatedTime() {},
    jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props) => ({ type, props }),
  });
  const first = render(123456), next = render(124456);
  assert.equal(first.props.children[0].type.name, "UpdatedTime", "the timestamp starts the status line so refresh text cannot shift it");
  assert.equal(first.props.children[0].props.value, 123456);
  assert.equal(next.props.children[0].props.value, 124456);
  assert.equal(first.props.children[0].key, next.props.children[0].key, "the timestamp component stays mounted");
  assert.equal(first.props.children[2], next.props.children[2], "timestamp updates leave warning text stable");
  const refreshing = render(123456, true);
  assert.equal(refreshing.props.children[0].type.name, "UpdatedTime");
  assert.equal(refreshing.props.children[1].props.children, " · 正在刷新…");
  assert.equal(refreshing.props.children[0].props.value, first.props.children[0].props.value, "refresh text lands after the timestamp instead of pushing it sideways");
  const switching = render(123456, true, true);
  assert.equal(switching.props.children[1].props.children, " · 正在切换数据源…");
  assert.equal(switching.props.children[0].type.name, "UpdatedTime");
  assert.match(messages.join(" "), /2 个会话日志读取失败/);
  assert.match(messages.join(" "), /暂无费率/);
  assert.match(messages.join(" "), /会话排行不可用/);
});

test("historical replies without usage do not imply unreadable logs, while actual scan failures stay visible", () => {
  const fragment = source.slice(source.indexOf('  var shown = page === "calendar" ? cal : data;'), source.indexOf('  var content = jsxs("section", {'));
  const messages = (coverage, costMeta = { complete: true, unpricedTokens: 0 }, page = "detail") => {
    const data = { local: { coverage, costMeta } };
    return Array.from(vm.runInNewContext(fragment + '\nnotes;', { page, data, cal: data, today: null }));
  };
  for (const page of ["detail", "calendar"]) {
    assert.deepEqual(messages({ complete: false, missingUsage: 12, failed: 0, truncated: false, error: null }, undefined, page), []);
    assert.deepEqual(messages({ failed: 0 }, { unpricedTokens: 0 }, page), [], "absent optional completeness flags do not produce warnings");
    assert.deepEqual(messages({ failed: 2 }, undefined, page), ["2 个会话日志读取失败"]);
    assert.deepEqual(messages({ truncated: true }, undefined, page), ["会话数量超过扫描上限，仅统计部分会话"]);
    assert.deepEqual(messages({ error: "list-failed" }, undefined, page), ["本地日志扫描失败，请重试"]);
    assert.deepEqual(messages({ complete: true }, { complete: false, unpricedTokens: 30 }, page), ["部分模型暂无费率，金额仅含已计价部分"]);
  }
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


test("automatic refresh uses each selected interval and requests fresh view data in both modes", async () => {
  const start = source.lastIndexOf("  useEffect(function () {", source.indexOf("    if (!auto || !ready) return;"));
  const effect = source.slice(start, source.indexOf("  function loadView(force)", start));
  for (const mode of ["official", "local"]) for (const seconds of [5, 10, 30, 60, 120]) {
    const h = harness({ mode });
    let timer, cleanup, pending;
    const summaries = [];
    const load = h.context.loadView;
    Object.assign(h.context, {
      auto: true, interval: seconds, switching: false,
      todayLoad: (sourceMode, force) => summaries.push([sourceMode, force]),
      loadView: force => { pending = load(force); return pending; },
      window: { setInterval(callback, delay) { timer = { callback, delay }; return 123; } },
      clearInterval: id => { assert.equal(id, 123); },
      useEffect: callback => { cleanup = callback(); },
    });
    vm.runInContext(effect, h.context);
    assert.equal(timer.delay, seconds * 1000);
    timer.callback();
    assert.match(h.requests[0].url, /[?&]force=1(?:&|$)/);
    assert.deepEqual(summaries, [[mode, true]]);
    timer.callback();
    assert.equal(h.requests.length, 1, "a slow view must not overlap the next scheduled refresh");
    h.requests[0].respond({ ...payload(), fetchedAt: 100, coverage: { lastSweepAt: 100 } });
    await pending;
    assert.equal(h.state.data.updatedAt, 100);
    h.context.switching = true;
    timer.callback();
    assert.equal(h.requests.length, 1, "switching must suppress polling the old source");
    h.context.switching = false;
    timer.callback();
    h.requests[1].respond({ ...payload(20), fetchedAt: 200, coverage: { lastSweepAt: 200 } });
    await pending;
    assert.equal(h.state.data.updatedAt, 200);
    assert.equal(h.state.data.days[0].tokens, 20);
    cleanup();
    h.context.auto = false;
    timer = null;
    vm.runInContext(effect, h.context);
    assert.equal(timer, null, "disabled auto refresh creates no timer");
    h.context.auto = true;
    h.context.ready = false;
    vm.runInContext(effect, h.context);
    assert.equal(timer, null, "host pricing must restore before polling begins");
  }
});

test("forced shared today refresh bypasses browser and server caches in either mode", async () => {
  for (const mode of ["official", "local"]) {
    const h = harness();
    h.context.todayEmit = () => {};
    h.context.todayKey = mode => mode;
    h.context.total = rows => ({ tokens: rows[0].tokens });
    vm.runInContext('var TODAY = { key: "", value: null, at: 0, promise: null, seq: 0 }, todayController;' + between("function todayLoad(", "function modelsOf("), h.context);
    let pending = h.context.todayLoad(mode, false);
    h.requests[0].respond(payload(10));
    await pending;
    assert.equal((await h.context.todayLoad(mode, false)).tokens, 10);
    assert.equal(h.requests.length, 1, "passive sidebar reads still use the short browser cache");
    pending = h.context.todayLoad(mode, true);
    assert.equal(h.requests.length, 2);
    assert.match(h.requests[1].url, /[?&]force=1(?:&|$)/);
    h.requests[1].respond(payload(25));
    assert.equal((await pending).tokens, 25);
  }
});


test("timestamp flip changes only updated digits, preserves accessible text and cancels obsolete timers", () => {
  let state, effect, dependencies, cleanup;
  const timers = new Map();
  let timerId = 0, clock = 0, cleanupDelay;
  function advance(ms) {
    clock += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= clock) { timers.delete(id); timer.callback(); }
    }
  }
  const context = vm.createContext({
    Date,
    useState(initial) { if (state === undefined) state = initial; return [state, value => { state = value; }]; },
    useEffect(callback, deps) {
      if (!dependencies || deps[0] !== dependencies[0]) { cleanup?.(); dependencies = deps; effect = callback; }
    },
    window: { setTimeout(callback, delay) { assert.equal(delay, 700); cleanupDelay = delay; timers.set(++timerId, { callback, at: clock + delay }); return timerId; }, clearTimeout(id) { timers.delete(id); } },
    jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props) => ({ type, props }),
  });
  vm.runInContext(between("function updateTimeText(", "function Dialog("), context);
  function render(value) {
    const result = context.UpdatedTime({ value });
    if (effect) { const callback = effect; effect = null; cleanup = callback(); }
    return result;
  }
  const start = new Date(2026, 10, 18, 14, 52, 3).getTime();
  const first = render(start);
  assert.match(first.props["aria-label"], /^上次更新 2026\/11\/18 14:52:03$/);
  assert.ok(first.props.children.every(char => char.props.className.startsWith("d-update-char") && !char.props.className.includes("flip")), "first display does not animate placeholder characters");
  assert.equal(timers.size, 0);
  assert.equal(render(start + 5000).props["aria-label"], first.props["aria-label"], "keep the old value until both animation layers are ready");
  const flipping = render(start + 5000);
  const changed = flipping.props.children.filter(char => char.props.className.includes("d-update-flip"));
  assert.equal(changed.length, 1, "only the changed seconds digit flips");
  assert.equal(changed[0].props.children.find(layer => layer.props.className === "d-update-old").props.children, "3");
  assert.equal(changed[0].props.children.find(layer => layer.props.className === "d-update-new").props.children, "8");
  assert.ok(flipping.props.children.every(char => char.props["aria-hidden"]), "read the complete timestamp once instead of individual animation layers");
  assert.match(flipping.props["aria-label"], /14:52:08$/);
  for (let i = 0; i < flipping.props.children.length - 1; i++) {
    assert.equal(flipping.props.children[i].key, first.props.children[i].key, "unchanged characters keep their nodes");
  }
  const oldTimer = [...timers.keys()][0];
  render(start + 5100);
  assert.equal(timers.size, 1, "millisecond-only changes must not interrupt a flip");
  assert.ok(timers.has(oldTimer));
  render(start + 6000);
  const newest = render(start + 6000);
  assert.equal(timers.size, 1, "a newer update cancels the obsolete cleanup timer");
  assert.equal(timers.has(oldTimer), false, "the superseded timeout cannot remove the newer animation layers");
  assert.notEqual(newest.props.children.at(-1).key, flipping.props.children.at(-1).key, "a newer digit restarts its animation");
  assert.equal(newest.props.children.at(-1).props.children[0].props.children, "8");
  advance(599);
  assert.ok(render(start + 6000).props.children.some(char => char.props.className.includes("flip")), "keep both digit layers through the 600ms roll");
  advance(100);
  assert.equal(timers.size, 1, "do not clean up before the 700ms deadline");
  advance(1);
  assert.ok(render(start + 6000).props.children.every(char => !char.props.className.includes("flip")), "remove old layers after animation finishes");
  assert.equal(timers.size, 0, "an unchanged settled timestamp does not restart the animation");
  const midnight = new Date(2027, 0, 1, 0, 0, 0).getTime();
  render(midnight);
  const nextDay = render(midnight);
  assert.match(nextDay.props["aria-label"], /^上次更新 2027\/01\/01 00:00:00$/);
  assert.equal(nextDay.props.children.length, first.props.children.length, "padded dates preserve character positions across midnight and year changes");
  assert.ok(nextDay.props.children.filter(char => char.props.className.includes("flip")).every(char => char.props.className.includes("digit")));
  const css = readFileSync(new URL("../src/panel.css", import.meta.url), "utf8");
  assert.match(css, /d-update-flip\s*\{\s*display:\s*inline-grid;\s*overflow:\s*hidden/);
  assert.match(css, /d-update-old[^}]*animation:\s*d-update-roll-out\s+600ms/);
  assert.match(css, /d-update-new[^}]*animation:\s*d-update-roll-in\s+600ms\s+cubic-bezier/);
  assert.doesNotMatch(css, /d-update-new[^}]*animation:[^;]*\s600ms\s+600ms/, "both layers roll at the same time, so the digit is never blank");
  assert.match(css, /translateY\(-100%\)/);
  assert.match(css, /translateY\(100%\)/);
  assert.doesNotMatch(css, /rotateX\(/);
  assert.doesNotMatch(css, /d-update-flip\s*\{[^}]*perspective:/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*?d-update-old\s*\{\s*display:\s*none;\s*\}[\s\S]*?d-update-new\s*\{\s*animation:\s*none/);
  assert.doesNotMatch(css, /d-update-top|d-update-bottom|clip-path/, "no leftover half pages that could flash during the roll");
  cleanup();
  assert.equal(timers.size, 0, "unmount cancels the pending cleanup");
});
