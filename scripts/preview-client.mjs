/**
 * 用真实 src/client.js + 假的宿主/React 跑一遍面板，产出可截图的 HTML。
 *
 * 目的：截图来自"要发布的那份组件"，而不是手抄的 mock；同时把渲染期的
 * ReferenceError / undefined 调用暴露在终端里。
 *
 * 用法：node scripts/preview-client.mjs [detail|calendar]
 *       → output/preview-<page>.html
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = process.argv[2] ?? "detail";
const OPEN = process.argv[3] ?? "";

/* ---------------- 假数据 ---------------- */
const MODELS = ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"];
const money = (n) => Math.round(n * 100) / 100;
function dayOf(date, seed) {
  const models = MODELS.map((model, i) => {
    const tokens = Math.round(180_000 + ((seed * (i + 3) * 37) % 900_000));
    return {
      model,
      tokens,
      requests: Math.max(1, Math.round(tokens / (2400 + i * 180))),
      cost: money(tokens / 1_000_000 * (0.9 + i * 0.45)),
    };
  });
  const sum = (k) => models.reduce((n, m) => n + m[k], 0);
  return {
    date,
    hit: Math.round(sum("tokens") * 0.52),
    miss: Math.round(sum("tokens") * 0.31),
    output: Math.round(sum("tokens") * 0.17),
    requests: sum("requests"),
    cost: money(sum("cost")),
    models,
  };
}
function monthPayload(year, month) {
  const count = month === new Date().getMonth() + 1 && year === new Date().getFullYear() ? new Date().getDate() : new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= count; d += 1) {
    const seed = year * 372 + month * 31 + d;
    if (seed % 9 === 0) continue; // 空档日，看看 0 用量的格子
    days.push(dayOf(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`, seed));
  }
  return { ok: true, days, balance: { total: 3108.05, consumedTotal: 12873.44 } };
}
const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const thisMonth = monthPayload(now.getFullYear(), now.getMonth() + 1);

function official(range) {
  if (range === "today") {
    const day = thisMonth.days.find((d) => d.date === todayIso) || dayOf(todayIso, 7);
    const hours = Math.max(2, new Date().getHours());
    const weights = [];
    for (let h = 0; h <= hours; h += 1) weights.push(0.45 + Math.abs(Math.sin((h + 1) * 1.7)));
    const totalWeight = weights.reduce((n, w) => n + w, 0);
    const points = weights.map((w, h) => {
      const share = w / totalWeight;
      const models = day.models.map((m) => ({
        model: m.model,
        tokens: Math.round(m.tokens * share),
        requests: Math.round(m.requests * share),
        cost: money(m.cost * share),
      }));
      const sum = (k) => models.reduce((n, m) => n + m[k], 0);
      const tokens = sum("tokens");
      return {
        key: `${todayIso}T${String(h).padStart(2, "0")}`,
        date: todayIso,
        label: `${String(h).padStart(2, "0")}:00`,
        hour: h,
        hit: Math.round(tokens * 0.52),
        miss: Math.round(tokens * 0.31),
        output: Math.round(tokens * 0.17),
        requests: sum("requests"),
        cost: money(sum("cost")),
        models,
      };
    });
    const agg = {
      date: todayIso,
      hit: points.reduce((n, p) => n + p.hit, 0),
      miss: points.reduce((n, p) => n + p.miss, 0),
      output: points.reduce((n, p) => n + p.output, 0),
      requests: points.reduce((n, p) => n + p.requests, 0),
      cost: money(points.reduce((n, p) => n + p.cost, 0)),
      models: day.models,
    };
    return { ok: true, range, granularity: "hour", points, days: [agg], balance: thisMonth.balance, window: {} };
  }
  const days = thisMonth.days.slice(-14);
  return { ok: true, range, granularity: "day", points: days, days, balance: thisMonth.balance, window: {} };
}

/* ---------------- 假宿主 ---------------- */
const store = new Map();
const noop = () => {};
const fakeElement = { setAttribute: noop, appendChild: noop, remove: noop, style: {}, textContent: "", id: "" };
const documentStub = {
  head: { appendChild: noop },
  getElementById: () => null,
  createElement: () => ({ ...fakeElement }),
  addEventListener: noop,
  removeEventListener: noop,
};

globalThis.document = documentStub;
globalThis.window = {
  addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
  setInterval: () => 0, clearInterval: noop,
  __ModuleLoader__: { load: (entry) => { captured = entry; } },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
  },
};
globalThis.fetch = (url) => {
  const u = String(url);
  let payload;
  if (u.includes("/official")) {
    const m = /range=([a-z0-9]+)/i.exec(u);
    payload = official(m ? m[1] : "today");
  } else if (u.includes("/pricing")) {
    const snap = JSON.parse(readFileSync(join(ROOT, "src", "pricing.snapshot.json"), "utf8"));
    const models = {}; const names = {};
    for (const row of snap.models) {
      const [id, name, input, output, cacheRead, cacheWrite] = row;
      models[id] = { input, output, cacheRead, cacheWrite };
      names[id] = name || id;
    }
    payload = { ok: true, schema: 2, currency: "USD", usdToCny: 0, models, names };
  } else if (u.includes("/local")) {
    payload = { ok: true, points: official("today").days, balance: {} };
  } else if (u.includes("/status")) {
    payload = { ok: true, account: true, local: { available: true } };
  } else if (u.includes("/summary")) {
    const year = Number(/year=(\d+)/.exec(u)[1]);
    const month = Number(/month=(\d+)/.exec(u)[1]);
    payload = monthPayload(year, month);
  } else {
    payload = { ok: false };
  }
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });
};

/* ---------------- 迷你 React（只够跑本组件） ---------------- */
const inst = { hooks: [], effects: [], cursor: 0, dirty: false };
let captured;
function useState(init) {
  const i = inst.cursor++;
  if (!(i in inst.hooks)) inst.hooks[i] = typeof init === "function" ? init() : init;
  return [inst.hooks[i], (v) => {
    inst.hooks[i] = typeof v === "function" ? v(inst.hooks[i]) : v;
    inst.dirty = true;
  }];
}
function useEffect(fn, deps) {
  const i = inst.cursor++;
  const prev = inst.effects[i];
  const changed = !prev || !deps || deps.some((d, k) => d !== prev.deps[k]);
  inst.effects[i] = changed ? { fn, deps: deps || [], due: true } : { ...prev, fn, due: false };
}
function useRef(init) {
  const i = inst.cursor++;
  if (!inst.hooks[i]) inst.hooks[i] = { current: init };
  return inst.hooks[i];
}
const reactStub = { useState, useEffect, useRef };
const create = (type, props) => ({ type, props: props || {} });
const runtimeStub = { jsx: create, jsxs: create, Fragment: "fragment" };

/* ---------------- 装载 bundle ---------------- */
const code = readFileSync(join(ROOT, "src", "client.js"), "utf8");
new Function("window", code)(globalThis.window);
if (!captured) throw new Error("bundle 没有调用 __ModuleLoader__.load");

const mod = captured.factory((spec) => {
  if (spec === "react") return reactStub;
  if (spec === "react/jsx-runtime") return runtimeStub;
  throw new Error("unexpected require: " + spec);
});
let Seat;
mod.apply({ slots: { inject: (_, f) => f(), register: (_, c) => { Seat = c; } } });

/* 默认打开弹窗：席位第一个 hook 就是 open */
inst.hooks[0] = true;
if (PAGE === "calendar") inst.hooks[14] = "calendar";
if (OPEN === "week" || OPEN === "month") inst.hooks[18] = OPEN;
else if (OPEN === "day") inst.hooks[18] = { title: "10月27日", eyebrow: "日期详情", day: { hit: 1_652_000, miss: 984_000, output: 539_000, requests: 1252, cost: 4.35, tokens: 3_175_000 } };
else if (OPEN) inst.hooks[18] = OPEN;

function commitEffects() {
  inst.effects.forEach((e) => {
    if (!e || !e.due) return;
    e.due = false;
    const cleanup = e.fn();
    if (typeof cleanup === "function") e.cleanup = cleanup;
  });
}
let lastTree = null;
const flush = async (rounds = 20) => {
  for (let i = 0; i < rounds; i += 1) {
    inst.cursor = 0;
    lastTree = Seat({ wide: true });
    render(lastTree); // 必须整棵树渲染一次，子组件的 hooks/effects 才会注册
    commitEffects();
    await new Promise((r) => setTimeout(r, 0));
    if (!inst.dirty) break;
    inst.dirty = false;
  }
  return lastTree;
};

/* ---------------- 树 → HTML ---------------- */
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "path", "circle", "rect", "ellipse", "stop", "line", "polyline", "polygon"]);
const KEEP_CASE = new Set(["viewBox", "preserveAspectRatio", "strokeWidth"]);
const escapeText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function styleString(style) {
  return Object.keys(style).map((k) => {
    const v = style[k];
    if (v === null || v === undefined) return "";
    const name = k.startsWith("--") ? k : k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
    return `${name}:${typeof v === "number" && !["opacity", "flex", "zIndex", "fontWeight", "lineHeight", "strokeWidth"].includes(k) ? v + "px" : v}`;
  }).filter(Boolean).join(";");
}
function render(node) {
  if (node === null || node === undefined || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return escapeText(node);
  if (Array.isArray(node)) return node.map(render).join("");
  if (typeof node.type === "function") return render(node.type(node.props));
  if (node.type === "fragment") return render(node.props.children);
  const p = node.props || {};
  const attrs = [];
  for (const key of Object.keys(p)) {
    const v = p[key];
    if (key === "children" || key === "key" || key.startsWith("on") || v === null || v === undefined || v === false) continue;
    if (key === "style") { const s = styleString(v); if (s) attrs.push(`style="${s}"`); continue; }
    if (key === "className") { attrs.push(`class="${escapeText(v)}"`); continue; }
    if (v === true) { attrs.push(key); continue; }
    attrs.push(`${key}="${escapeText(v)}"`);
  }
  const tag = node.type;
  const open = `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
  if (VOID.has(tag)) return open;
  return open + render(p.children) + `</${tag}>`;
}

await flush();
inst.cursor = 0;
const html = render(Seat({ wide: true }));
const css = readFileSync(join(ROOT, "src", "panel.css"), "utf8");

const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>DeepMeter preview · ${PAGE}</title>
<style>
html, body { margin: 0; height: 100%; background: #eef1f6; font-family: -apple-system, "PingFang SC", sans-serif; }
/* 预览页里把遮罩层还原成有背景的舞台，方便看清弹窗本体 */
/* 截图前把动画冻到终态，否则会拍到淡入中间帧 */
* { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; }
.d-usage { background: #e6eaf2; }
${css}
</style></head><body>${html}</body></html>`;

mkdirSync(join(ROOT, "output"), { recursive: true });
const out = join(ROOT, "output", `preview-${PAGE}${OPEN ? "-" + OPEN : ""}.html`);
writeFileSync(out, page, "utf8");
console.log(`wrote ${out}`);

const png = join(ROOT, "output", `preview-${PAGE}${OPEN ? "-" + OPEN : ""}.png`);
execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=3000", "--window-size=1280,900", `--screenshot=${png}`, `file://${out}`,
], { stdio: "ignore" });
console.log(`wrote ${png}`);
