/**
* DeepMeter — 浏览器半边（__ModuleLoader__ bundle）。
* 视觉严格对齐 UI 稿 deepseek-usage-popup 2.html；点侧边栏「用量」开居中弹窗。
* 不提供登录：账号由服务端读宿主已登录的 DeepSeek 账号记录。
*
* @module deepseek-usage/client
*/

window.__ModuleLoader__.load({
id: "deepseek-usage",
factory: function (require) {
var module = { exports: {} };
var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

var react;
var jsx;
var jsxs;
try {
  react = require("react");
  var _j = require("react/jsx-runtime");
  jsx = _j.jsx;
  jsxs = _j.jsxs;
} catch (e) {
  console.error("[deepseek-usage] a require failed; the panel cannot mount:", e);
  throw e;
}

var useState = react.useState;
var useEffect = react.useEffect;
var useRef = react.useRef;

var STYLE_ID = "deepseek-usage-styles";
var SEAT_STYLE_ID = "deepseek-usage-seat-styles";
var CSS_PATH = "/api/deepseek-usage/panel.css";

function injectSeatStyles() {
  if (document.getElementById(SEAT_STYLE_ID)) return;
  var style = document.createElement("style");
  style.id = SEAT_STYLE_ID;
  style.textContent = "div:has(> [data-slot='sidebar.footer.action']){flex-wrap:wrap}.d-seat-layer{flex:0 0 100%;width:100%;min-width:0;margin:8px 0 0;display:flex;align-items:center;position:relative}.d-seat-layer.d-seat-rail{flex:none;width:36px;height:36px;margin:0}.d-seat{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:6px;border:0;border-radius:12px;background:transparent;color:inherit;font:inherit;font-size:14px;cursor:pointer;text-align:left;transition:background .15s ease}.d-seat:hover{background:color-mix(in srgb, var(--d-fg) 6%, transparent)}.d-seat:focus-visible{outline:2px solid var(--d-accent);outline-offset:-2px}.d-seat .d-seat-metric b{font-family:var(--d-font-mono)}.d-seat-layer.d-seat-rail .d-seat{width:36px;height:36px;padding:0;justify-content:center;border-radius:50%}.d-seat-layer.d-seat-rail .d-seat span,.d-seat-layer.d-seat-rail .d-seat em{display:none}";
  document.head.appendChild(style);
}

function injectPeriodStyles() {
  if (document.getElementById("d-usage-period-style")) return;
  var style = document.createElement("style");
  style.id = "d-usage-period-style";
  style.textContent = ".d-usage .d-heat-cell.d-today::after,.d-usage .d-week-cell.d-current-period::after,.d-usage .d-month-cell.d-current-period::after{content:'';position:absolute;top:6px;right:6px;width:6px;height:6px;border-radius:50%;background:var(--d-danger);box-shadow:0 0 0 2px var(--d-surface);animation:d-usage-dot-pulse 1.8s ease-in-out infinite}.d-usage .d-week-cell.d-current-period,.d-usage .d-month-cell.d-current-period{position:relative;outline:1px solid color-mix(in srgb, var(--d-danger) 62%, transparent);outline-offset:-1px}@keyframes d-usage-dot-pulse{0%,100%{transform:scale(.82);box-shadow:0 0 0 2px var(--d-surface),0 0 0 2px color-mix(in srgb, var(--d-danger) 22%, transparent)}50%{transform:scale(1.18);box-shadow:0 0 0 2px var(--d-surface),0 0 0 5px color-mix(in srgb, var(--d-danger) 12%, transparent)}}";
  document.head.appendChild(style);
}

function injectLocalStyles() {
  if (document.getElementById("d-usage-local-style")) return;
  var style = document.createElement("style");
  style.id = "d-usage-local-style";
  style.textContent = ".d-usage .d-recon{margin:0;border:1px solid var(--d-border);border-radius:12px;overflow:hidden;background:var(--d-surface)}.d-usage .d-recon-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 10px;font-size:11px;color:var(--d-muted)}.d-usage .d-recon-bar b{color:var(--d-fg);font-family:var(--d-font-mono);font-size:12px}.d-usage .d-recon-bar button{margin-left:auto;border:0;border-radius:999px;background:var(--d-accent-weak);color:var(--d-accent-strong);font:11px var(--d-font-body);padding:3px 9px;cursor:pointer}.d-usage .d-recon-panel{border-top:1px solid var(--d-border);padding:6px 10px 9px;max-height:210px;overflow:auto}.d-usage .d-recon-row{display:grid;grid-template-columns:1.15fr 1fr 1fr .9fr;gap:8px;padding:3px 0;font-size:11px;color:var(--d-fg);font-variant-numeric:tabular-nums}.d-usage .d-recon-head{color:var(--d-muted);font-size:10px;border-bottom:1px solid var(--d-border);padding-bottom:4px;margin-bottom:3px}.d-usage .d-recon-note{margin:6px 0 0;color:var(--d-muted);font-size:10px;line-height:1.5}";
  document.head.appendChild(style);
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  var link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = CSS_PATH;
  document.head.appendChild(link);
}

function svg(paths, size) {
  var list = [];
  (Array.isArray(paths) ? paths : [paths]).forEach(function (p) {
    if (Array.isArray(p)) list = list.concat(p);
    else list.push(p);
  });
  return jsx("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.8",
    "aria-hidden": "true",
    width: size || null,
    height: size || null,
    children: list.map(function (d, i) {
      return jsx("path", { d: d, key: i });
    }),
  });
}
var ICONS = {
  layers: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5M3 16l9 5 9-5"],
  coins: ["M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Z", "M3 8v3a5 5 0 0 0 9.6 2M16 11a5 5 0 1 1-5 5", "M16 8v3m-2-1h4"],
  activity: ["M3 12h4l3-8 4 16 3-8h4"],
  wallet: ["M3 6h18v13H3z", "M3 10h18M7 15h4"],
  sparkles: ["m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z", "m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"],
  chart: ["M4 20V10m5 10V4m5 16v-7m5 7H2"],
  bolt: ["m13 2-9 12h7l-1 8 10-13h-7l1-7Z"],
  gauge: ["M4.5 19a9 9 0 1 1 15 0", "m12 13 4-4m-4 4-2 2", "M7 19h10"],
  hash: ["M5 9h14M4 15h14M10 3 8 21m8-18-2 18"],
  clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "M12 7v5l3 2"],
  database: ["M12 5a8 3 0 1 0 0 0Z", "M4 5v14c0 1.7 16 1.7 16 0V5M4 12c0 1.7 16 1.7 16 0"],
  cpu: ["M6 6h12v12H6z", "M9 9h6v6H9z", "M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"],
  yen: ["M7 4.5 12 11.5 17 4.5", "M12 11.5V20", "M7 13.5h10", "M7 16.5h10"],
  banknote: ["M2.5 6.5h19v11h-19z", "M12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0", "M6 10v4M18 10v4"],
  receipt: ["M6 3h12v18l-3-2-3 2-3-2-3 2V3Z", "M9 8h6M9 12h6"],
  card: ["M2.5 6h19v12h-19z", "M2.5 10.5h19M6.5 15h3"],
  piggy: ["M4 12a6 6 0 0 1 6-5h4a6 6 0 0 1 6 5v3a3 3 0 0 1-3 3h-1l-1 2h-3l-1-2H8a4 4 0 0 1-4-4v-2Z", "M8 10h.01M16 13h2M4 12c-1 0-2-.7-2-1.7 0-.9.8-1.6 1.8-1.6"],
};
var ICON_KEYS = ["yen", "banknote", "receipt", "card", "piggy", "layers", "coins", "activity", "wallet", "sparkles", "chart", "bolt", "gauge", "hash", "clock", "database", "cpu"];
var ICON_LABELS = { yen: "日元符号", banknote: "钞票", receipt: "账单", card: "银行卡", piggy: "存钱罐", layers: "图层", coins: "硬币", activity: "活动", wallet: "钱包", sparkles: "闪光", chart: "图表", bolt: "闪电", gauge: "仪表", hash: "数字", clock: "时钟", database: "数据", cpu: "芯片" };
function icon(name, size) {
  return svg(ICONS[name] || ICONS.layers, size);
}

var P = {
  bolt: "M13 2 4.5 13.5H11L9.5 22 19.5 9.5H13L13 2Z",
  trend: ["M3 17l5-6 4 3 6-8 3 4", "M3 21h18"],
  cal: "M3 5h18v16H3zM8 3v4M16 3v4M3 10h18",
  pulse: "M4 12h4l3-8 4 16 3-8h2",
  refresh: ["M20 11a8 8 0 0 0-14.9-3L4 10", "M4 5v5h5", "M4 13a8 8 0 0 0 14.9 3L20 14", "M20 19v-5h-5"],
  settings: ["M4 6h16", "M4 12h16", "M4 18h16", "M9 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M15 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M10 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4"],
  swap: ["M4 7h15l-3-3M20 17H5l3 3"],
  chevron: "m6 9 6 6 6-6",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  close: "m6 6 12 12M18 6 6 18",
  box: ["M12 3 4 7v10l8 4 8-4V7l-8-4Z", "m4 7 8 4 8-4M12 11v10"],
  tokens: ["M12 3 3 7.5l9 4.5 9-4.5L12 3Z", "m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"],
  bars: ["M4 20V10M10 20V4M16 20v-8M22 20H2"],
};

function fmtMoney(n) {
  return "¥" + (Number(n) || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTokens(n) {
  return fmtInt(n);
}
function fmtK(n) {
  var v = Number(n) || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(Math.round(v));
}
function fmtInt(n) {
  return (Number(n) || 0).toLocaleString("zh-CN");
}
function fmtSigned(n) {
  var value = Number(n) || 0;
  return (value > 0 ? "+" : value < 0 ? "-" : "") + fmtTokens(Math.abs(value));
}
function p2(n) {
  return n < 10 ? "0" + n : String(n);
}
function iso(d) {
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
}
function mdLabel(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? Number(m[2]) + "月" + Number(m[3]) + "日" : s;
}
function mdShort(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? Number(m[2]) + "/" + Number(m[3]) : s;
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

var BASE = "/api/deepseek-usage";
var AI = ["var(--d-accent)", "#0E9F6E", "#D97706", "#6E56CF", "#64748B"];
var RANGES = [
  { k: "today", l: "今天" },
  { k: "yesterday", l: "昨天" },
  { k: "last7", l: "近 7 天" },
  { k: "last30", l: "近 30 天" },
  { k: "thisMonth", l: "本月" },
  { k: "lastMonth", l: "上月" },
];

function getJSON(path) {
  return fetch(BASE + path, { headers: { Accept: "application/json" } }).then(function (r) {
    if (!r.ok) {
      var e = new Error("http " + r.status);
      e.status = r.status;
      return r.json().catch(function () { return {}; }).then(function (b) { e.body = b; throw e; });
    }
    return r.json();
  });
}

function total(days, models) {
  var o = { tokens: 0, requests: 0, cost: 0, hit: 0, miss: 0, cacheWrite: 0, output: 0, pricedTokens: 0, unpricedTokens: 0 };
  days.forEach(function (d) {
    o.hit += d.hit || 0;
    o.miss += d.miss || 0;
    o.cacheWrite += d.cacheWrite || 0;
    o.output += d.output || 0;
    if (!Array.isArray(d.models) || !d.models.length) {
      if (models === null) {
        o.tokens += (d.hit || 0) + (d.miss || 0) + (d.cacheWrite || 0) + (d.output || 0);
        o.requests += d.requests || 0;
        o.cost += d.cost || 0;
        o.pricedTokens += d.pricedTokens || 0;
        o.unpricedTokens += d.unpricedTokens || 0;
      }
      return;
    }
    d.models.forEach(function (m) {
      if (models !== null && models.indexOf(m.model) < 0) return;
      o.tokens += m.tokens || 0;
      o.requests += m.requests || 0;
      o.cost += m.cost || 0;
      o.pricedTokens += m.pricedTokens || 0;
      o.unpricedTokens += m.unpricedTokens || 0;
    });
  });
  return o;
}

function modelsOf(days) {
  var map = {};
  days.forEach(function (d) {
    (d.models || []).forEach(function (m) {
      var row = map[m.model] || { model: m.model, tokens: 0, requests: 0, cost: 0 };
      row.tokens += m.tokens || 0;
      row.requests += m.requests || 0;
      row.cost += m.cost || 0;
      map[m.model] = row;
    });
  });
  return Object.keys(map)
    .map(function (k) { return map[k]; })
    .filter(function (m) { return m.tokens || m.cost || m.requests; })
    .sort(function (a, b) { return b.tokens - a.tokens; });
}

function tokensForDay(day, models) {
  return (day.models || []).reduce(function (sum, m) {
    return (models === null || models.indexOf(m.model) >= 0) ? sum + (m.tokens || 0) : sum;
  }, 0);
}

function level(v, max) {
  if (!v || !max) return 0;
  var q = v / max;
  return q > 0.72 ? 4 : q > 0.45 ? 3 : q > 0.18 ? 2 : 1;
}

function rangeDates(k) {
  var today = new Date();
  var end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (k === "yesterday") return { from: addDays(end, -1), to: addDays(end, -1) };
  if (k === "last7") return { from: addDays(end, -6), to: end };
  if (k === "last30") return { from: addDays(end, -29), to: end };
  if (k === "thisMonth") return { from: new Date(end.getFullYear(), end.getMonth(), 1), to: end };
  if (k === "lastMonth") return { from: new Date(end.getFullYear(), end.getMonth() - 1, 1), to: new Date(end.getFullYear(), end.getMonth(), 0) };
  return { from: end, to: end };
}
function monthsBetween(from, to) {
  var out = [];
  var cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  var stop = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= stop && out.length < 24) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return out;
}

function loadRange(from, to, force) {
  var fromIso = iso(from);
  var toIso = iso(to);
  return Promise.all(monthsBetween(from, to).map(function (m) {
    return getJSON("/summary?year=" + m.year + "&month=" + m.month + "&tz=" + TZ + (force ? "&force=1" : ""));
  })).then(function (pages) {
    var days = [];
    pages.forEach(function (page) {
      (page.days || []).forEach(function (d) {
        if (d.date >= fromIso && d.date <= toIso) days.push(d);
      });
    });
    days.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return { days: days, balance: (pages[0] && pages[0].balance) || {} };
  });
}

function loadLocalRange(from, to, force) {
  var fromIso = iso(from);
  var toIso = iso(to);
  return getJSON("/local?from=" + fromIso + "&to=" + toIso + "&tz=" + TZ + "&scope=all" + ratesParam() + (force ? "&force=1" : "")).then(function (payload) {
    var days = (payload.points || payload.days || []).filter(function (d) { return d.date >= fromIso && d.date <= toIso; });
    return { days: days, balance: {}, granularity: payload.granularity || "day", local: payload };
  });
}

// 官方接口用 tz 切日/小时桶，不带会按 UTC 切。
var TZ = -new Date().getTimezoneOffset() * 60;
function plabel(d, hourly) { return hourly ? d.label || "" : mdLabel(d.date); }
function pshort(d, hourly) { return hourly ? d.label || "" : mdShort(d.date); }
function ptitle(d, hourly) {
  if (!hourly) return mdLabel(d.date);
  var h = Number(String(d.key || "").slice(-2)) || 0;
  return mdLabel(d.date) + " " + p2(h) + ":00–" + p2((h + 1) % 24) + ":00";
}
var MODEL_ALIASES = {
  "deepseek-flash": "DeepSeek-V4-Flash",
  "deepseek-v4-flash": "DeepSeek-V4-Flash",
  "deepseek-v4-pro": "DeepSeek-V4-Pro",
  "deepseek-chat & deepseek-reasoner": "DeepSeek-Chat / Reasoner",
  "deepseek-v4-flash-vision-exp": "DeepSeek-V4-Flash-Vision",
};
function normModel(name) { return MODEL_ALIASES[name] || name; }
function normalizeDays(days) {
  return (days || []).map(function (d) {
    var map = {};
    (d.models || []).forEach(function (m) {
      var name = normModel(m.model);
      var row = map[name] || (map[name] = { model: name, tokens: 0, requests: 0, cost: 0, pricedTokens: 0, unpricedTokens: 0 });
      row.tokens += m.tokens || 0; row.requests += m.requests || 0; row.cost += m.cost || 0;
      row.pricedTokens += m.pricedTokens || 0; row.unpricedTokens += m.unpricedTokens || 0;
    });
    var copy = {};
    Object.keys(d).forEach(function (k) { copy[k] = d[k]; });
    copy.models = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.tokens - a.tokens; });
    return copy;
  });
}

function aggDays(days, sel) {
  var acc = { hit: 0, miss: 0, cacheWrite: 0, output: 0, requests: 0, cost: 0, tokens: 0, pricedTokens: 0, unpricedTokens: 0, models: [] };
  var map = {};
  days.forEach(function (d) {
    acc.hit += d.hit || 0; acc.miss += d.miss || 0; acc.cacheWrite += d.cacheWrite || 0; acc.output += d.output || 0;
    acc.requests += d.requests || 0;
    var hasModels = Array.isArray(d.models) && d.models.length > 0;
    if (!hasModels) {
      acc.cost += d.cost || 0;
      acc.pricedTokens += d.pricedTokens || 0;
      acc.unpricedTokens += d.unpricedTokens || 0;
    }
    (d.models || []).forEach(function (m) {
      if (sel !== null && sel.indexOf(m.model) < 0) return;
      var row = map[m.model] || (map[m.model] = { model: m.model, tokens: 0, requests: 0, cost: 0, pricedTokens: 0, unpricedTokens: 0 });
      row.tokens += m.tokens || 0; row.requests += m.requests || 0; row.cost += m.cost || 0;
      row.pricedTokens += m.pricedTokens || 0; row.unpricedTokens += m.unpricedTokens || 0;
    });
  });
  acc.models = Object.keys(map).map(function (k) { return map[k]; }).filter(function (m) { return m.tokens > 0 || m.cost > 0; });
  acc.tokens = acc.hit + acc.miss + acc.cacheWrite + acc.output;
  return acc;
}
function pkey(d) { return d.key || d.date; }

function readJSON(key, fallback) {
  try {
    var raw = window.localStorage.getItem(key);
    var value = raw ? JSON.parse(raw) : null;
    return value && typeof value === "object" ? value : fallback;
  } catch (e) { return fallback; }
}
function readRaw(key, fallback) {
  try {
    var raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    var value = JSON.parse(raw);
    return value === null || value === undefined ? fallback : value;
  } catch (e) { return fallback; }
}
function writeJSON(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {  }
}

// 数据源是面板与侧边栏共享的状态：面板切换后，侧边栏立即按同一口径取今日数据。
var MODE_KEY = "deepseekUsageMode";
var RATES_KEY = "deepseekUsageRates";
var RATE_DEFAULTS = {
  "deepseek-flash": {
    peak: { hit: 0.04, miss: 2, cacheWrite: 0, output: 8 },
    offpeak: { hit: 0.02, miss: 1, cacheWrite: 0, output: 4 },
  },
  "deepseek-v4-pro": {
    peak: { hit: 0.3, miss: 9, cacheWrite: 0, output: 27 },
    offpeak: { hit: 0.15, miss: 4.5, cacheWrite: 0, output: 13.5 },
  },
};
function readSourceMode() { return readRaw(MODE_KEY, "official") === "local" ? "local" : "official"; }
function readRates() {
  var rates = readJSON(RATES_KEY, null);
  return rates && !Array.isArray(rates) && Object.keys(rates).length > 0 ? rates : null;
}
function ratesParam() {
  var rates = readRates();
  return rates ? "&rates=" + encodeURIComponent(JSON.stringify(rates)) : "";
}
function notifySource() {
  try { window.dispatchEvent(new Event("deepseek-usage:source")); } catch (e) {  }
}
function writeSourceMode(next) {
  writeJSON(MODE_KEY, next === "local" ? "local" : "official");
  notifySource();
}

var CARD_ICONS = { tokens: "layers", spend: "yen", requests: "activity", balance: "wallet" };
var SEAT_KEY = "deepseekUsageSeat";
var defaultSeat = {
  tokens: { on: true, label: "用量", icon: "layers", img: "" },
  requests: { on: false, label: "请求", icon: "activity", img: "" },
  spend: { on: false, label: "消费", icon: "yen", img: "" },
};
function readSeat() {
  var saved = readJSON(SEAT_KEY, null) || {};
  var out = {};
  Object.keys(defaultSeat).forEach(function (k) {
    var base = defaultSeat[k];
    var row = saved[k] || {};
    out[k] = {
      on: row.on === undefined ? base.on : !!row.on,
      label: row.label === undefined ? base.label : String(row.label).slice(0, 8),
      icon: row.icon === undefined ? base.icon : row.icon,
      img: row.img || "",
    };
  });
  return out;
}
function seatGlyph(m, size) {
  if (!m) return null;
  if (m.img) return jsx("img", { src: m.img, alt: "", style: { display: "block", width: size, height: size, borderRadius: Math.max(3, size / 5), objectFit: "contain" } });
  return m.icon ? icon(m.icon, size) : null;
}

function Metric(props) {
  return jsxs("div", {
    className: "d-metric" + (props.onClick ? " d-metric-action" : ""),
    "aria-live": "polite",
    title: props.title,
    role: props.onClick ? "button" : undefined,
    tabIndex: props.onClick ? 0 : undefined,
    onClick: props.onClick,
    onKeyDown: props.onClick ? function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); props.onClick(); } } : undefined,
    children: [
      jsxs("span", {
        className: "d-metric-label",
        children: [
          jsx("span", { "data-metric-icon": props.id, "aria-hidden": "true", children: icon(props.icon, 14) }),
          jsx("span", { children: props.label }),
        ],
      }),
      jsxs("span", {
        className: "d-metric-line",
        children: [
          jsx("span", { className: "d-metric-value", style: String(props.value).length > 9 ? { fontSize: 16 } : null, children: props.value }),
          props.unit ? jsx("span", { className: "d-metric-unit", children: props.unit }) : null,
        ],
      }),
      jsx("span", { className: "d-metric-caption", children: props.caption }),
    ],
  });
}

function ReconcileStrip(props) {
  var recon = props.recon;
  if (!recon || recon.ok === false) return null;
  var official = recon.official || {};
  var local = recon.local || {};
  var coverage = recon.coverage === null || recon.coverage === undefined ? "—" : (recon.coverage * 100).toFixed(1) + "%";
  var both = official.available && local.available;
  return jsxs("div", {
    className: "d-recon",
    children: [
      jsxs("div", {
        className: "d-recon-bar",
        children: [
          jsx("span", { children: "官方 DeepSeek" }),
          jsx("b", { children: official.available ? fmtTokens(official.tokens) : "未连接" }),
          jsx("span", { children: "本地 DeepSeek" }),
          jsx("b", { children: local.available ? fmtTokens(local.tokens) : "不可用" }),
          jsx("span", { children: "覆盖" }),
          jsx("b", { children: coverage }),
          jsx("span", { children: "差额" }),
          jsx("b", { children: both ? fmtSigned(recon.delta.tokens) : "—" }),
          jsx("button", { type: "button", onClick: props.onToggle, children: props.open ? "收起" : "查看差额" }),
        ],
      }),
      props.open ? jsxs("div", {
        className: "d-recon-panel",
        children: [
          jsxs("div", {
            className: "d-recon-row d-recon-head",
            children: ["日期", "官方", "本地", "官方 − 本地"].map(function (label) {
              return jsx("span", { children: label }, label);
            }),
          }),
          (recon.points || []).slice(-31).map(function (point) {
            var key = point.key || point.date || "";
            var label = key.indexOf("T") >= 0 ? mdShort(point.date) + " " + key.slice(11, 13) + ":00" : mdShort(point.date);
            return jsxs("div", {
              className: "d-recon-row",
              title: "覆盖 " + (point.coverage === null ? "—" : (point.coverage * 100).toFixed(1) + "%"),
              children: [
                jsx("span", { children: label }),
                jsx("span", { children: fmtTokens(point.official.tokens) }),
                jsx("span", { children: fmtTokens(point.local.tokens) }),
                jsx("span", { children: fmtSigned(point.deltaTokens) }),
              ],
            }, key);
          }),
          (recon.points || []).length ? null : jsx("p", { className: "d-recon-note", children: "当前范围没有可对账的日期。" }),
          jsx("p", { className: "d-recon-note", children: (recon.caveats || []).join(" ") }),
        ],
      }) : null,
    ],
  });
}

function StackedChart(props) {
  var days = props.days;
  var tip = props.onTip;
  var models = props.models;
  var sel = props.sel;
  var hourly = props.hourly;
  var metric = props.metric === "tokens" ? "tokens" : "cost";
  var valueOf = metric === "tokens" ? function (m) { return m.tokens || 0; } : function (m) { return m.cost || 0; };
  var fmtValue = metric === "tokens" ? fmtTokens : fmtMoney;
  var axisFmt = metric === "tokens" ? fmtK : fmtMoney;
  var metricLabel = metric === "tokens" ? "Token 用量" : "消费金额";
  var list = models.filter(function (m) { return sel === null || sel.indexOf(m.model) >= 0; });
  if (!days.length) return jsx("div", { className: "d-chart-empty", children: "当前范围没有数据" });
  if (!list.length) return jsx("div", { className: "d-chart-empty", children: "请至少选择一个模型" });
  var max = 0;
  days.forEach(function (d) {
    var sum = 0;
    (d.models || []).forEach(function (m) {
      if (sel !== null && sel.indexOf(m.model) < 0) return;
      sum += valueOf(m);
    });
    if (sum > max) max = sum;
  });
  max = max || 1;
  var ticks = [max, max * 2 / 3, max / 3, 0];
  var labels = [0, Math.floor((days.length - 1) / 2), days.length - 1].filter(function (v, i, arr) { return arr.indexOf(v) === i; });

  return jsxs("div", {
    className: "d-chart-plot",
    onMouseLeave: function () { if (tip) tip(null); },
    children: [
      jsx("div", { className: "d-chart-y-axis", "aria-hidden": "true", children: ticks.map(function (v, i) {
        return jsx("span", { children: axisFmt(v) }, "y" + i);
      }) }),
      jsxs("div", {
        className: "d-chart-body",
        children: [
          jsx("div", {
            className: "d-stacked-chart",
            role: "group",
            "aria-label": "各模型" + metricLabel + "变化",
            children: days.map(function (d) {
              var segs = [];
              var sum = 0;
              (d.models || []).forEach(function (m) {
                if (sel !== null && sel.indexOf(m.model) < 0) return;
                var value = valueOf(m);
                if (!(value > 0)) return;
                var idx = models.findIndex(function (x) { return x.model === m.model; });
                segs.push({ v: value, c: AI[idx < 0 ? 0 : idx % AI.length], k: m.model + segs.length });
                sum += value;
              });
              var rows = (d.models || []).filter(function (m) {
                return (sel === null || sel.indexOf(m.model) >= 0) && valueOf(m) > 0;
              }).map(function (m) {
                var value = valueOf(m);
                return m.model + "  " + fmtValue(value) + " · 占比 " + Math.round((value / sum) * 100) + "%";
              }).join("\n");
              var label = ptitle(d, hourly) + "\n" + metricLabel + "  " + fmtValue(sum) + (rows ? "\n" + rows : "");
              var hover = tip ? {
                onMouseMove: function (e) { tip(e, label); },
                onMouseLeave: function () { tip(null); },
              } : {};
              if (!sum) {
                return jsx("div", {
                  className: "d-stack-col",
                  children: jsx("div", { style: { height: 2, width: "100%", background: "var(--d-border)", borderRadius: 1 } }),
                ...hover,
                }, pkey(d));
              }
              return jsx("div", {
                className: "d-stack-col",
                role: "img",
                "aria-label": label,
                ...hover,
                children: jsx("div", {
                  style: { display: "flex", flexDirection: "column", justifyContent: "flex-end", height: (sum / max) * 100 + "%", width: "100%", maxWidth: days.length < 4 ? 56 : null, margin: "0 auto" },
                  children: segs.map(function (s) {
                    return jsx("div", { className: "d-stack-seg", style: { flex: s.v, background: s.c } }, s.k);
                  }),
                }),
              }, pkey(d));
            }),
          }),
          jsx("div", { className: "d-chart-x-labels", "aria-hidden": "true", children: labels.map(function (i) {
            return jsx("span", { children: days[i] ? pshort(days[i], hourly) : "" }, "x" + i);
          }) }),
        ],
      }),
    ],
  });
}

function areaPath(values, W, H) {
  var max = Math.max.apply(null, values.concat([1]));
  var step = values.length > 1 ? W / (values.length - 1) : W;
  var pts = values.map(function (v, i) {
    return { x: values.length === 1 ? W / 2 : i * step, y: H - 3 - (v / max) * (H - 8) };
  });
  if (pts.length === 1) pts = [{ x: 0, y: pts[0].y }, { x: W, y: pts[0].y }];
  var line = pts.reduce(function (path, pt, i) {
    if (!i) return "M " + pt.x.toFixed(2) + " " + pt.y.toFixed(2);
    var prev = pts[i - 1];
    var mid = ((prev.x + pt.x) / 2).toFixed(2);
    return path + " C " + mid + " " + prev.y.toFixed(2) + ", " + mid + " " + pt.y.toFixed(2) + ", " + pt.x.toFixed(2) + " " + pt.y.toFixed(2);
  }, "");
  return { line: line, area: line + " L " + pts[pts.length - 1].x.toFixed(2) + " " + H + " L " + pts[0].x.toFixed(2) + " " + H + " Z", pts: pts };
}

function MiniRequests(props) {
  var days = props.days;
  var hourly = props.hourly;
  if (!days.length) return jsx("section", { className: "d-mini-chart-card", children: jsx("div", { className: "d-chart-empty", children: "当前范围没有数据" }) });
  var values = days.map(function (d) { return total([d], props.sel).requests; });
  var W = 200, H = 68;
  var max = Math.max.apply(null, values.concat([1]));
  var path = areaPath(values, W, H);
  var idx = [0, Math.floor((days.length - 1) / 2), days.length - 1].filter(function (v, i, a) { return a.indexOf(v) === i; });
  return jsxs("section", {
    className: "d-mini-chart-card",
    children: [
      jsxs("div", { className: "d-mini-chart-head", children: [
        jsxs("h3", { children: [svg(ICONS.activity, 14), "API 请求次数"] }),
        jsx("span", { className: "d-mini-total", children: fmtInt(total(days, props.sel).requests) + " 次" }),
      ] }),
      jsxs("div", { className: "d-mini-chart-body", children: [
        jsxs("div", { className: "d-mini-y-axis", children: [jsx("span", { children: fmtK(max) }), jsx("span", { children: "0" })] }),
        jsxs("div", { className: "d-mini-plot", children: [
          jsxs("svg", {
            viewBox: "0 0 " + W + " " + H,
            preserveAspectRatio: "none",
            "aria-hidden": "true",
            children: [
              jsx("path", { d: path.area, fill: "var(--d-accent)", opacity: "0.16" }),
              jsx("path", { d: path.line, fill: "none", stroke: "var(--d-accent)", "stroke-width": "1.5", "vector-effect": "non-scaling-stroke", "stroke-linecap": "round" }),
            ],
          }),
          jsx("div", { className: "d-mini-hit-layer", children: days.map(function (d, i) {
            var label = ptitle(d, hourly) + "\nAPI 请求  " + fmtInt(values[i]) + " 次";
            var tip = props.onTip;
            return jsx("span", {
              className: "d-mini-hit",
              "aria-label": label,
              onMouseMove: tip ? function (e) { tip(e, label); } : null,
              onMouseLeave: tip ? function () { tip(null); } : null,
            }, pkey(d));
          }) }),
        ] }),
      ] }),
      jsx("div", { className: "d-mini-x-axis", children: idx.map(function (i) {
        return jsx("span", { children: days[i] ? pshort(days[i], hourly) : "" }, "rx" + i);
      }) }),
    ],
  });
}

function MiniTokens(props) {
  var days = props.days;
  var sel = props.sel;
  var hourly = props.hourly;
  if (!days.length) return jsx("section", { className: "d-mini-chart-card", children: jsx("div", { className: "d-chart-empty", children: "当前范围没有数据" }) });
  var models = props.models;
  var values = days.map(function (d) { return tokensForDay(d, sel); });
  var max = Math.max.apply(null, values.concat([1]));
  var idx = [0, Math.floor((days.length - 1) / 2), days.length - 1].filter(function (v, i, a) { return a.indexOf(v) === i; });
  var legend = models.filter(function (m) { return sel === null || sel.indexOf(m.model) >= 0; });
  return jsxs("section", {
    className: "d-mini-chart-card",
    children: [
      jsxs("div", { className: "d-mini-chart-head", children: [
        jsxs("h3", { children: [svg(P.tokens, 14), "各模型 Token 用量"] }),
        jsx("span", { className: "d-mini-total", children: fmtTokens(total(days, sel).tokens) + " Tokens" }),
      ] }),
      jsxs("div", { className: "d-mini-chart-body", children: [
        jsxs("div", { className: "d-mini-y-axis", children: [
          jsx("span", { children: fmtK(max) }),
          jsx("span", { children: fmtK(max * 2 / 3) }),
          jsx("span", { children: fmtK(max / 3) }),
          jsx("span", { children: "0" }),
        ] }),
        jsx("div", {
          className: "d-mini-plot d-mini-token-plot",
          children: jsx("div", { className: "d-mini-hit-layer", children: days.map(function (d) {
            var value = tokensForDay(d, sel);
            var rows = (d.models || []).filter(function (m) {
              return (sel === null || sel.indexOf(m.model) >= 0) && m.tokens > 0;
            }).map(function (m) { return m.model + " " + fmtTokens(m.tokens); }).join("\n");
            var label = ptitle(d, hourly) + "\n输入（命中缓存）  " + fmtInt(d.hit || 0) + "\n输入（未命中缓存）  " + fmtInt(d.miss || 0) + "\n输出  " + fmtInt(d.output || 0) + "\nToken 合计  " + fmtTokens(value) + (rows ? "\n" + rows : "");
            var tip = props.onTip;
            return jsx("button", {
              type: "button",
              className: "d-mini-hit",
              "aria-label": label,
              onMouseMove: tip ? function (e) { tip(e, label); } : null,
              onMouseLeave: tip ? function () { tip(null); } : null,
              children: jsx("i", {
                className: "d-mini-bar",
                style: { height: Math.max(1.5, (value / max) * 100) + "%" },
                children: (d.models || []).filter(function (m) { return sel === null || sel.indexOf(m.model) >= 0; }).map(function (m, i) {
                  var mi = models.findIndex(function (x) { return x.model === m.model; });
                  return jsx("i", {
                    className: "d-mini-bar-seg",
                    style: { height: (value ? (m.tokens || 0) / value * 100 : 0) + "%", background: AI[mi < 0 ? 0 : mi % AI.length] },
                  }, m.model + i);
                }),
              }),
            }, pkey(d));
          }) }),
        }),
      ] }),
      jsx("div", { className: "d-mini-x-axis", children: idx.map(function (i) {
        return jsx("span", { children: days[i] ? pshort(days[i], hourly) : "" }, "tx" + i);
      }) }),
      jsx("div", { className: "d-model-legend", "aria-label": "Token 用量模型图例", children: legend.map(function (m, i) {
        return jsx("span", { className: "d-model-legend-item", children: [jsx("i", { style: { background: AI[i % AI.length] } }), jsx("span", { children: m.model })] }, m.model);
      }) }),
    ],
  });
}


function RateDialog(props) {
  var st = useState;
  function cloneRows(source) {
    var out = {};
    Object.keys(source || {}).forEach(function (key) {
      out[key] = {
        peak: Object.assign({ cacheWrite: 0 }, source[key].peak || {}),
        offpeak: Object.assign({ cacheWrite: 0 }, source[key].offpeak || {}),
      };
    });
    return out;
  }
  var rowsS = st(cloneRows(props.rows || RATE_DEFAULTS));
  var rows = rowsS[0]; var setRows = rowsS[1];
  var nameS = st(""); var name = nameS[0]; var setName = nameS[1];
  var keys = Object.keys(rows);
  function patch(key, window, field, raw) {
    var number = Number(raw);
    if (!Number.isFinite(number) || number < 0) number = 0;
    setRows(function (previous) {
      var next = cloneRows(previous);
      next[key][window][field] = number;
      return next;
    });
  }
  function add() {
    var key = name.trim().toLowerCase();
    if (!/^[\w./:+ -]{1,160}$/.test(key) || key === "__proto__" || key === "constructor" || key === "prototype" || rows[key]) return;
    var next = cloneRows(rows);
    next[key] = {
      peak: { hit: 0, miss: 0, cacheWrite: 0, output: 0 },
      offpeak: { hit: 0, miss: 0, cacheWrite: 0, output: 0 },
    };
    setRows(next);
    setName("");
  }
  function remove(key) {
    var next = cloneRows(rows);
    delete next[key];
    setRows(next);
  }
  function save() {
    var clean = {};
    keys.forEach(function (key) {
      var row = rows[key];
      clean[key] = {
        currency: "CNY",
        peak: { hit: row.peak.hit || 0, miss: row.peak.miss || 0, cacheWrite: 0, output: row.peak.output || 0 },
        offpeak: { hit: row.offpeak.hit || 0, miss: row.offpeak.miss || 0, cacheWrite: 0, output: row.offpeak.output || 0 },
      };
    });
    props.onSave(clean);
  }
  function input(key, window, field, label) {
    return jsx("input", {
      type: "number",
      min: "0",
      step: "0.01",
      value: rows[key][window][field],
      "aria-label": key + " " + label,
      onChange: function (event) { patch(key, window, field, event.target.value); },
    }, key + window + field);
  }
  return jsxs("div", {
    className: "d-dialog-backdrop",
    onMouseDown: function (event) { if (event.target === event.currentTarget) props.onClose(); },
    children: [
      jsxs("section", {
        className: "d-detail-dialog d-rate-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "本地费率设置",
        children: [
          jsxs("div", { className: "d-dialog-title-row", children: [
            jsxs("div", { children: [
              jsx("p", { className: "d-section-kicker", children: "本地 AI 聚合" }),
              jsx("h2", { children: "费率设置" }),
            ] }),
            jsx("button", { className: "d-icon-btn", type: "button", "aria-label": "关闭费率设置", onClick: props.onClose, children: svg(P.close, 16) }),
          ] }),
          jsx("p", { className: "d-rate-note", children: "单位：元 / 百万 tokens。工作日 08:00–12:00、14:00–18:00 为高峰；其余时间、周末和节假日为低谷。缓存写入默认免费。" }),
          jsx("div", { className: "d-rate-scroll", children: jsxs("table", { className: "d-rate-table", children: [
            jsx("thead", { children: jsxs("tr", { children: [
              jsx("th", { children: "模型" }),
              jsx("th", { children: "命中·峰" }),
              jsx("th", { children: "命中·谷" }),
              jsx("th", { children: "未命中·峰" }),
              jsx("th", { children: "未命中·谷" }),
              jsx("th", { children: "输出·峰" }),
              jsx("th", { children: "输出·谷" }),
              jsx("th", { children: "" }),
            ] }) }),
            jsx("tbody", { children: keys.map(function (key) {
              return jsxs("tr", { children: [
                jsx("th", { title: key, children: key }),
                jsx("td", { children: input(key, "peak", "hit", "命中高峰价") }),
                jsx("td", { children: input(key, "offpeak", "hit", "命中低谷价") }),
                jsx("td", { children: input(key, "peak", "miss", "未命中高峰价") }),
                jsx("td", { children: input(key, "offpeak", "miss", "未命中低谷价") }),
                jsx("td", { children: input(key, "peak", "output", "输出高峰价") }),
                jsx("td", { children: input(key, "offpeak", "output", "输出低谷价") }),
                jsx("td", { children: RATE_DEFAULTS[key] ? null : jsx("button", { className: "d-rate-remove", type: "button", title: "删除", "aria-label": "删除 " + key, onClick: function () { remove(key); }, children: "×" }) }),
              ] }, key);
            }) }),
          ] }) }),
          jsxs("div", { className: "d-rate-add", children: [
            jsx("input", {
              type: "text",
              value: name,
              placeholder: "模型 id，例如 gpt-6.1-sol",
              "aria-label": "新增模型 id",
              onChange: function (event) { setName(event.target.value); },
              onKeyDown: function (event) { if (event.key === "Enter") add(); },
            }),
            jsx("button", { type: "button", onClick: add, children: "添加" }),
            jsx("button", { type: "button", onClick: function () { setRows(cloneRows(RATE_DEFAULTS)); }, children: "恢复默认" }),
          ] }),
          jsxs("div", { className: "d-rate-actions", children: [
            jsx("button", { type: "button", className: "d-rate-cancel", onClick: props.onClose, children: "取消" }),
            jsx("button", { type: "button", className: "d-rate-save", onClick: save, children: "保存费率" }),
          ] }),
        ],
      }),
    ],
  });
}

function Dialog(props) {
  var onClose = props.onClose;
  var st = useState;
  var dataS = st(null); var data = dataS[0]; var setData = dataS[1];
  var todayS = st(null); var today = todayS[0]; var setToday = todayS[1];
  var calS = st(null); var cal = calS[0]; var setCal = calS[1];
  var errS = st(""); var err = errS[0]; var setErr = errS[1];
  var busyS = st(false); var busy = busyS[0]; var setBusy = busyS[1];
  var pageS = st("detail"); var page = pageS[0]; var setPage = pageS[1];
  var rangeS = st("today"); var range = rangeS[0]; var setRange = rangeS[1];
  var customS = st(null); var custom = customS[0]; var setCustom = customS[1];
  var selS = st(null); var sel = selS[0]; var setSel = selS[1];
  var openS = st(""); var open = openS[0]; var setOpen = openS[1];

  var themeS = st(readJSON("deepseekUsageTheme", { name: "blue" }).name || "blue"); var theme = themeS[0]; var setTheme = themeS[1];

  var autoS = st(readRaw("deepseekUsageAutoRefresh", true) !== false); var auto = autoS[0]; var setAuto = autoS[1];
  var tickS = st(Number(readRaw("deepseekUsageInterval", 30)) || 30); var interval = tickS[0]; var setTick = tickS[1];
  var seatS = st(readSeat()); var seat = seatS[0]; var setSeat = seatS[1];

  var anchorS = st({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  var anchor = anchorS[0]; var setAnchor = anchorS[1];
  var dimS = st("day"); var dim = dimS[0]; var setDim = dimS[1];
  var pickS = st(null); var pick = pickS[0]; var setPick = pickS[1];
  var detailS = st(null); var detail = detailS[0]; var setDetail = detailS[1];
  var tdS = st({ start: null, end: null, view: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 } });
  var td = tdS[0]; var setTd = tdS[1];
  var tipS = st(null); var tip = tipS[0]; var setTip = tipS[1];
  function showTip(e, text) {
    var popup = document.querySelector(".d-popup");
    var box = popup ? popup.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    var wid = 236, hei = 132;
    var x = e.clientX + 12;
    var y = e.clientY + 14;
    if (x + wid > box.right - 8) x = e.clientX - 12 - wid;
    if (y + hei > box.bottom - 8) y = e.clientY - 14 - hei;
    x = Math.max(box.left + 8, Math.min(x, box.right - wid - 8));
    y = Math.max(box.top + 8, Math.min(y, box.bottom - hei - 8));
    setTip({ x: x, y: y, text: text });
  }
  useEffect(function () { if (open) setTip(null); }, [open]);
  useEffect(function () { setTip(null); }, [page, dim, range, anchor.year, anchor.month]);
  var requestRef = useRef(0);
  var modeS = st(readSourceMode()); var mode = modeS[0]; var setMode = modeS[1];
  var reconS = st(null); var recon = reconS[0]; var setRecon = reconS[1];
  var reconOpenS = st(false); var reconOpen = reconOpenS[0]; var setReconOpen = reconOpenS[1];
  var localAvailS = st(true); var localAvail = localAvailS[0]; var setLocalAvail = localAvailS[1];
  var localBalanceS = st(null); var localBalance = localBalanceS[0]; var setLocalBalance = localBalanceS[1];
  var reconRef = useRef(0);

  useEffect(function () { injectStyles(); injectPeriodStyles(); injectLocalStyles(); }, []);
  useEffect(function () {
    getJSON("/status").then(function (status) {
      var available = !!(status && status.local && status.local.available !== false);
      setLocalAvail(available);
      // 旧宿主没有 sessionPersistence：不要停在本地模式里反复 503，回落到官方。
      if (!available && readSourceMode() === "local") {
        setMode("official");
        writeSourceMode("official");
      }
    }).catch(function () { setLocalAvail(true); });
  }, []);
  useEffect(function () {
    function esc(e) {
      if (e.key !== "Escape") return;
      if (detail) setDetail(null);
      else if (open) setOpen("");
      else onClose();
    }
    document.addEventListener("keydown", esc);
    return function () { document.removeEventListener("keydown", esc); };
  }, [detail, open]);
  useEffect(function () {
    function down(e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (open) { if (t.closest(".d-rate-dialog") || t.closest(".d-dialog-backdrop")) return; if (!t.closest("[data-pop]")) setOpen(""); return; }
      if (t.closest(".d-popup") || t.closest(".d-detail-dialog") || t.closest(".d-dialog-backdrop") || t.closest(".d-seat")) return;
      onClose();
    }
    document.addEventListener("pointerdown", down);
    return function () { document.removeEventListener("pointerdown", down); };
  }, [open, detail]);
  useEffect(function () { loadView(false); }, [range, custom, anchor.year, anchor.month, page, dim, mode]);
  useEffect(function () { loadToday(); }, [mode]);
  useEffect(function () {
    if (mode !== "local") { setLocalBalance(null); return; }
    var alive = true;
    getJSON("/official?range=today").then(function (payload) {
      if (alive) setLocalBalance(payload && payload.balance ? payload.balance : null);
    }).catch(function () { if (alive) setLocalBalance(null); });
    return function () { alive = false; };
  }, [mode]);
  useEffect(function () {
    if (!auto) return;
    var timer = window.setInterval(function () { loadView(true); loadToday(true); }, interval * 1000);
    return function () { clearInterval(timer); };
  }, [auto, interval, range, custom, anchor.year, anchor.month, page, dim, mode]);
  useEffect(function () {
    if (mode !== "local") { setRecon(null); return; }
    var id = reconRef.current + 1;
    reconRef.current = id;
    var query = range === "custom" && custom ? "from=" + custom.from + "&to=" + custom.to : "range=" + range;
    getJSON("/reconcile?" + query + "&tz=" + TZ + "&scope=deepseek").then(function (payload) {
      if (reconRef.current === id) setRecon(payload);
    }).catch(function () {
      if (reconRef.current === id) setRecon(null);
    });
  }, [mode, range, custom]);

  function loadView(force) {
    var id = requestRef.current + 1;
    requestRef.current = id;
    setBusy(true);
    var localMode = mode === "local";
    var suffix = force ? "&force=1" : "";
    var job;
    if (range === "custom" && custom) {
      job = localMode
        ? loadLocalRange(new Date(custom.from), new Date(custom.to), force)
        : loadRange(new Date(custom.from), new Date(custom.to), force);
    } else if (localMode) {
      job = getJSON("/local?range=" + range + suffix + "&tz=" + TZ + "&scope=all" + ratesParam()).then(function (payload) {
        return { days: payload.points || payload.days || [], balance: {}, granularity: payload.granularity || "day", local: payload };
      });
    } else {
      var win = rangeDates(range);
      job = getJSON("/official?range=" + range + suffix + "&tz=" + TZ).then(function (payload) {
        return { days: payload.points || payload.days || [], balance: payload.balance || {}, granularity: payload.granularity || "day" };
      }).catch(function (e) {
        if (e.status === 404 || e.status === 405) return loadRange(win.from, win.to);
        throw e;
      });
    }
    return job.then(function (view) {
      if (requestRef.current !== id) return;
      var viewDays = normalizeDays(view.days);
      setData({ days: viewDays, balance: view.balance, granularity: view.granularity, local: view.local });
      if (range === "today") {
        var tt = total(viewDays, null);
        setToday({ tokens: tt.tokens, cost: tt.cost, requests: tt.requests });
      }
      setErr("");
    }).catch(function (e) {
      if (requestRef.current !== id) return;
      setErr(e.status === 401 ? "未检测到 DeepSeek 账号，请先在 DeepSeek Harness 里登录。" : e.status === 503 ? "本地会话日志不可用：当前宿主没有提供 sessionPersistence。" : e.message || "加载失败");
    }).finally(function () {
      if (requestRef.current === id) setBusy(false);
    }).then(function () {
      if (page !== "calendar") return null;
      var months = [];
      if (dim === "week") {
        var halfStart = anchor.month <= 6 ? 1 : 7;
        var nowClock = new Date();
        var halfEnd = anchor.year === nowClock.getFullYear() ? Math.min(halfStart + 5, nowClock.getMonth() + 1) : halfStart + 5;
        for (var wi = halfStart; wi <= halfEnd; wi += 1) months.push({ year: anchor.year, month: wi });
      } else if (dim === "month") {
        var clock = new Date();
        var lastMonth = anchor.year < clock.getFullYear() ? 12 : anchor.year === clock.getFullYear() ? clock.getMonth() + 1 : 0;
        for (var m = 1; m <= lastMonth; m += 1) months.push({ year: anchor.year, month: m });
      } else {
        months.push({ year: anchor.year, month: anchor.month });
      }
      function pullMonth(mm) {
        if (localMode) {
          return loadLocalRange(new Date(mm.year, mm.month - 1, 1), new Date(mm.year, mm.month, 0), force).then(function (view) {
            return { days: view.days };
          });
        }
        return getJSON("/summary?year=" + mm.year + "&month=" + mm.month + suffix + "&tz=" + TZ);
      }
      return Promise.all(months.map(function (mm) {
        return pullMonth(mm).catch(function () { return { days: [] }; });
      })).then(function (pages) {
        if (requestRef.current !== id) return;
        var all = [];
        pages.forEach(function (pg) { (pg.days || []).forEach(function (d) { all.push(d); }); });
        setCal({ days: normalizeDays(all), balance: pages[0] && pages[0].balance });
      });
    }).catch(function () {  });
  }

  function loadToday(force) {
    var path = mode === "local" ? "/local?range=today&tz=" + TZ + "&scope=all" + ratesParam() : "/official?range=today&tz=" + TZ;
    getJSON(path + (force ? "&force=1" : "")).then(function (payload) {
      var t = total(payload.points || payload.days || [], null);
      setToday({ tokens: t.tokens, cost: t.cost, requests: t.requests });
    }).catch(function () {  });
  }

  function saveSeat(next) {
    setSeat(next);
    writeJSON(SEAT_KEY, next);
    try { window.dispatchEvent(new Event("deepseek-usage:seat")); } catch (e) {  }
  }
  function patchSeat(key, patch) {
    var next = {};
    Object.keys(seat).forEach(function (k) {
      next[k] = { on: seat[k].on, label: seat[k].label, icon: seat[k].icon, img: seat[k].img };
    });
    Object.keys(patch).forEach(function (k) { next[key][k] = patch[k]; });
    saveSeat(next);
  }
  function uploadSeatIcon(key, event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type || file.type.indexOf("image/") !== 0) {
      window.alert("请选择图片文件（PNG / JPG / SVG）");
      return;
    }
    if (file.size > 200 * 1024) {
      window.alert("图片 " + Math.round(file.size / 1024) + "KB，超过 200KB 限制，请压缩后再上传");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var size = 64;
        var canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext("2d");
        var scale = Math.min(size / img.width, size / img.height);
        var w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        if (img.width !== img.height) window.alert("图片不是正方形（" + img.width + "×" + img.height + "），已自动居中裁切为 64×64");
        patchSeat(key, { img: canvas.toDataURL("image/png") });
        setOpen("settings");
      };
      img.onerror = function () { window.alert("图片解析失败，请换一张 PNG / JPG / SVG"); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function pickTheme(name) {
    setTheme(name);
    writeJSON("deepseekUsageTheme", { name: name });
  }

  var days = (data && data.days) || [];
  var hourly = (data && data.granularity) === "hour";
  var calDaysAll = (cal && cal.days) || [];
  var models = modelsOf(days.concat(calDaysAll));
  var sums = total(days, sel);
  var balance = mode === "local" ? (localBalance || {}) : ((data && data.balance) || {});
  var win = range === "custom" && custom ? { from: custom.from, to: custom.to } : null;
  if (!win) {
    var w = rangeDates(range);
    win = { from: iso(w.from), to: iso(w.to) };
  }
  var rangeText = mdShort(win.from) + " ~ " + mdShort(win.to);

  // 顶部摘要 = 侧边栏已勾选的指标，顺序、图标、文案、数值格式全部一致。
  var seatCfg = props.seat || readSeat();
  var snap = ["tokens", "requests", "spend"].filter(function (k) { return seatCfg[k] && seatCfg[k].on; }).map(function (k) {
    var m = seatCfg[k] || defaultSeat[k];
    var value = !today ? "—" : k === "tokens" ? (mode === "local" ? "≈" : "") + fmtTokens(today.tokens) : k === "spend" ? (today.cost === null || today.cost === undefined ? "—" : (mode === "local" ? "≈" : "") + fmtMoney(today.cost)) : fmtInt(today.requests);
    return { k: k, m: m, label: String(m.label || defaultSeat[k].label), value: value };
  });

  var settingsOpen = open === "settings" || open.indexOf("icon:") === 0 || open.indexOf("seaticon:") === 0;

  var header = jsxs("header", {
    className: "d-popup-header",
    children: [
      jsxs("div", {
        className: "d-brand-lockup",
        children: [
          jsx("span", { className: "d-brand-mark", "aria-hidden": "true", children: jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: jsx("path", { d: P.bolt }) }) }),
          jsxs("span", {
            className: "d-brand-copy",
            children: [jsx("span", { className: "d-brand-name", children: "DeepSeek Usage" }), jsx("span", { className: "d-brand-subtitle", children: "用量看板" })],
          }),
        ],
      }),
      snap.length ? jsx("div", { className: "d-header-snapshot", "aria-label": "今日用量摘要", style: { gap: 14 }, children: [jsx("span", { className: "d-snap-scope", style: { color: "var(--d-muted)", fontSize: 13, whiteSpace: "nowrap" }, children: "今日" }, "scope")].concat(snap.map(function (s) {
        return jsxs("span", { className: "d-snap-item", style: { display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }, children: [
          jsx("span", { className: "d-snap-ico", "aria-hidden": "true", style: { display: "inline-flex", color: "var(--d-accent)" }, children: s.m && s.m.img ? jsx("img", { src: s.m.img, alt: "", style: { width: 14, height: 14, borderRadius: 3, objectFit: "contain", display: "block" } }) : svg(ICONS[s.m && s.m.icon || "layers"], 14) }),
          jsx("span", { className: "d-snap-label", style: { color: "var(--d-muted)", fontSize: 13 }, children: s.label }),
          jsx("b", { className: "d-snap-val", style: { fontWeight: 600, fontSize: 13, fontVariantNumeric: "tabular-nums" }, children: s.value }),
        ] }, s.k);
      })) }) : null,
      jsxs("div", {
        className: "d-settings-field",
        children: [
          jsxs("div", {
            className: "d-mode-picker",
            "data-pop": "1",
            children: [
              jsx("button", {
                className: "d-icon-btn",
                type: "button",
                "data-tooltip": "选择数据来源",
                "aria-label": "切换数据来源",
                "aria-expanded": open === "mode" ? "true" : "false",
                onClick: function () { setOpen(open === "mode" ? "" : "mode"); },
                children: svg(P.swap, 16),
              }),
              open === "mode" ? jsx("div", { className: "d-mode-panel", role: "group", "aria-label": "选择数据来源", children: [
                jsx("button", { type: "button", "data-mode": "official", "aria-pressed": mode === "official" ? "true" : "false", onClick: function () { setMode("official"); writeSourceMode("official"); setOpen(""); }, children: "DeepSeek 官方" }),
                jsx("button", { type: "button", "data-mode": "local", "aria-pressed": mode === "local" ? "true" : "false", disabled: !localAvail, title: localAvail ? "读取本机 DSH 会话日志" : "当前宿主未提供会话日志读取能力", onClick: function () { if (!localAvail) return; setMode("local"); writeSourceMode("local"); setOpen(""); }, children: "本地 AI 聚合" }),
              ] }) : null,
            ],
          }),
          jsx("button", {
            className: "d-icon-btn" + (busy ? " d-spinning" : ""),
            type: "button",
            "data-tooltip": "刷新数据",
            "aria-label": "立即刷新",
            onClick: function () { loadView(true); loadToday(true); },
            children: svg(P.refresh, 16),
          }),
          jsxs("div", {
            className: "d-settings-wrap",
            "data-pop": "1",
            style: { position: "relative" },
            children: [
              jsx("button", {
                className: "d-icon-btn d-settings-btn",
                type: "button",
                "data-tooltip": "显示设置",
                "aria-label": "显示设置",
                "aria-expanded": settingsOpen ? "true" : "false",
                onClick: function () { setOpen(settingsOpen ? "" : "settings"); },
                children: svg(P.settings, 16),
              }),
              settingsOpen ? jsxs("div", {
                className: "d-settings-panel",
                role: "dialog",
                style: { width: 292, maxHeight: 592, overflowY: "auto", overscrollBehavior: "contain", borderRadius: 16, padding: 12 },
                "aria-label": "显示设置",
                children: [
                  jsxs("div", { className: "d-settings-group", children: [
                    jsx("span", { className: "d-settings-label", children: "主题颜色" }),
                    jsx("div", { className: "d-theme-swatches", role: "radiogroup", "aria-label": "选择主题色", children: [
                      ["blue", "DeepSeek 蓝（默认）", "#4D6BFE"],
                      ["orange", "官方橙", "#F86A2E"],
                      ["green", "极客绿", "#0E9F6E"],
                      ["purple", "典雅紫", "#7C3AED"],
                      ["red", "商务红", "#DC2626"],
                    ].map(function (row) {
                      return jsx("button", {
                        type: "button",
                        className: "d-theme-swatch",
                        role: "radio",
                        "aria-checked": theme === row[0] ? "true" : "false",
                        "aria-label": row[1],
                        title: row[1],
                        style: { "--d-swatch": row[2] },
                        onClick: function () { pickTheme(row[0]); },
                        children: jsx("span", { className: "d-swatch-check", "aria-hidden": "true" }),
                      }, row[0]);
                    }) }),
                  ] }),
                  jsxs("div", { className: "d-settings-group", children: [
                    jsxs("span", { className: "d-settings-label", children: ["侧边栏标签", jsx("small", { children: "显示在左下角人员信息上方，可换图标、上传、改名" })] }),
                    jsx("div", { className: "d-display-pref-list", children: [
                      ["tokens", "Tokens", "今日 Token 数"],
                      ["requests", "API 请求次数", "当前日请求数"],
                      ["spend", "消费金额", "今日消费"],
                    ].map(function (row) {
                      var key = row[0];
                      var m = seat[key];
                      return jsxs("div", {
                        className: "d-display-pref-row",
                        style: { flexWrap: "wrap" },
                        children: [
                          jsxs("div", { className: "d-pref-left", children: [
                            jsx("button", {
                              className: "d-metric-icon-picker",
                              type: "button",
                              "aria-label": "更换" + row[1] + "图标",
                              "aria-expanded": open === "seaticon:" + key ? "true" : "false",
                              title: "更换图标 / 上传",
                              onClick: function () { setOpen(open === "seaticon:" + key ? "" : "seaticon:" + key); },
                              children: jsx("span", { "data-metric-icon": key, style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 16, minHeight: 16, fontSize: 11, color: "var(--d-muted)" }, children: seatGlyph(m, 16) || "无" }),
                            }),
                            jsxs("div", { className: "d-pref-text", children: [
                              jsx("span", { className: "d-pref-title", children: row[1] }),
                              jsx("input", {
                                className: "d-seat-label-input",
                                type: "text",
                                maxLength: 8,
                                value: m.label,
                                "aria-label": row[1] + "显示文案",
                                placeholder: row[2],
                                style: { width: 96, padding: "3px 6px", border: "1px solid var(--d-border)", borderRadius: 6, background: "var(--d-bg)", color: "var(--d-fg)", font: "12px var(--d-font-body)" },
                                onChange: function (e) { patchSeat(key, { label: e.target.value }); },
                              }),
                            ] }),
                          ] }),
                          jsx("label", { className: "d-settings-toggle", children: [
                            jsx("input", { type: "checkbox", checked: m.on, onChange: function () { patchSeat(key, { on: !m.on }); } }),
                            jsx("span", { className: "d-toggle-track", "aria-hidden": "true" }),
                          ] }),
                          open === "seaticon:" + key ? jsx("div", {
                            className: "d-icon-choice-panel",
                            style: { position: "static", flexBasis: "100%", width: "100%", marginTop: 6 },
                            "aria-label": "选择" + row[1] + "图标",
                            children: [jsx("button", {
                              type: "button",
                              className: "d-icon-choice",
                              "aria-pressed": !m.icon && !m.img ? "true" : "false",
                              title: "不显示图标",
                              "aria-label": "不显示图标",
                              style: { fontSize: 12 },
                              onClick: function () { patchSeat(key, { icon: "", img: "" }); setOpen("settings"); },
                              children: "无",
                            }, "none")].concat(ICON_KEYS.map(function (name) {
                              return jsx("button", {
                                type: "button",
                                className: "d-icon-choice",
                                "aria-pressed": m.icon === name && !m.img ? "true" : "false",
                                title: ICON_LABELS[name],
                                "aria-label": ICON_LABELS[name],
                                onClick: function () { patchSeat(key, { icon: name, img: "" }); setOpen("settings"); },
                                children: icon(name, 16),
                              }, name);
                            })).concat([
                              jsx("div", {
                                style: { gridColumn: "1 / -1", color: "var(--d-muted)", fontSize: 11, lineHeight: 1.5, marginTop: 2 },
                                children: "自定义图标：方形，建议 64×64，≤ 200KB；非方形会自动裁切",
                              }, "hint"),
                              jsx("label", {
                                className: "d-icon-choice d-icon-upload",
                                title: "上传自定义图标",
                                style: { cursor: "pointer", fontSize: 11 },
                                children: ["上传", jsx("input", {
                                  type: "file",
                                  accept: "image/*",
                                  style: { display: "none" },
                                  onChange: function (e) { uploadSeatIcon(key, e); },
                                })],
                              }, "upload"),
                              m.img ? jsx("button", {
                                type: "button",
                                className: "d-icon-choice",
                                title: "清除自定义图标",
                                onClick: function () { patchSeat(key, { img: "" }); setOpen("settings"); },
                                children: "×",
                              }, "clear") : null,
                            ]),
                          }) : null,
                        ],
                      }, key);
                    }) }),
                  ] }),
                  mode === "local" ? jsxs("div", { className: "d-settings-group", children: [
                    jsxs("span", { className: "d-settings-label", children: ["本地费率", jsx("small", { children: "按模型 / 峰谷" })] }),
                    jsx("button", {
                      type: "button",
                      className: "d-rate-open",
                      onClick: function () { setOpen("rates"); },
                      children: "编辑费率",
                    }),
                  ] }) : null,
                  jsxs("div", { className: "d-settings-group", children: [
                    jsx("label", { className: "d-settings-label", children: "自动刷新间隔" }),
                    jsxs("label", { className: "d-settings-toggle", children: [
                      jsx("input", { type: "checkbox", checked: auto, onChange: function (e) { setAuto(e.target.checked); writeJSON("deepseekUsageAutoRefresh", e.target.checked); } }),
                      jsx("span", { className: "d-toggle-track", "aria-hidden": "true" }),
                      jsx("span", { className: "d-toggle-text", children: "启用自动刷新" }),
                    ] }),
                    jsx("select", {
                      className: "d-settings-select",
                      value: String(interval),
                      disabled: !auto,
                      onChange: function (e) {
                        var n = Number(e.target.value);
                        setTick(n);
                        writeJSON("deepseekUsageInterval", n);
                      },
                      children: [5, 10, 30, 60, 120].map(function (n) { return jsx("option", { value: String(n), children: n + " 秒" }, n); }),
                    }),
                  ] }),
                ],
              }) : null,
            ],
          }),
          jsx("button", {
            className: "d-icon-btn",
            type: "button",
            "aria-label": "关闭",
            "data-tooltip": "关闭",
            onClick: onClose,
            children: svg(P.close, 16),
          }),
        ],
      }),
    ],
  });

  var tabs = jsxs("nav", {
    className: "d-page-tabs",
    role: "tablist",
    "aria-label": "页面切换",
    children: [
      jsx("button", {
        className: "d-page-tab",
        type: "button",
        role: "tab",
        "aria-selected": page === "detail" ? "true" : "false",
        onClick: function () { setPage("detail"); setOpen(""); },
        children: [svg(P.trend, 16), "用量趋势"],
      }),
      jsx("button", {
        className: "d-page-tab",
        type: "button",
        role: "tab",
        "aria-selected": page === "detail" ? "false" : "true",
        onClick: function () { setPage("calendar"); setOpen(""); },
        children: [svg(P.cal, 16), "用量日历"],
      }),
    ],
  });

  function renderModelField(key) {
    var count = sel === null ? models.length : sel.length;
    return jsxs("div", {
      className: "d-model-field",
      "data-pop": "1",
      children: [
        jsxs("div", { className: "d-model-control" + (open === key ? " d-open" : ""), children: [
          jsxs("button", {
            className: "d-model-btn" + (sel === null ? "" : " d-has-reset"),
            type: "button",
            "aria-expanded": open === key ? "true" : "false",
            title: "按模型名称多选",
            onClick: function () { setOpen(open === key ? "" : key); },
            children: [
              svg(P.box, 14, "d-lead"),
              jsx("b", { children: sel === null ? "全部模型" : sel.length === 0 ? "未选择模型" : sel.length === 1 ? sel[0] : jsx("span", { className: "d-model-summary-name", children: sel[0] }) }),
              sel !== null && sel.length > 1 ? jsx("span", { className: "d-model-summary-more", children: "+" + (sel.length - 1) }) : null,
              jsx("svg", { className: "d-tail", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", children: jsx("path", { d: P.chevron }) }),
            ],
          }),
          sel === null ? null : jsx("button", {
            className: "d-model-reset",
            type: "button",
            "aria-label": "恢复全部模型",
            title: "恢复全部模型",
            onClick: function () { setSel(null); },
            children: svg(P.close, 12),
          }),
        ] }),
        open === key ? jsxs("div", { className: "d-model-panel", style: { borderRadius: 14 }, children: [
          jsxs("div", { className: "d-model-panel-head", children: [
            jsx("span", { className: "d-model-panel-title", children: "模型名称" }),
            jsx("span", { className: "d-model-count", children: count + " / " + models.length }),
            jsx("button", {
              className: "d-model-all",
              type: "button",
              onClick: function () { setSel(sel === null ? [] : null); },
              children: sel === null ? "全部取消" : "全选",
            }),
          ] }),
          jsx("div", { className: "d-model-options", role: "listbox", "aria-multiselectable": "true", children: models.map(function (m, i) {
            var on = sel === null || sel.indexOf(m.model) >= 0;
            return jsxs("button", {
              type: "button",
              className: "d-model-option",
              role: "option",
              "aria-selected": on ? "true" : "false",
              onClick: function () {
                var next = sel === null ? models.map(function (x) { return x.model; }) : sel.slice();
                next = on ? next.filter(function (x) { return x !== m.model; }) : next.concat([m.model]);
                setSel(next.length === models.length ? null : next);
              },
              children: [
                jsx("span", { className: "d-swatch", style: { background: AI[i % AI.length] } }),
                jsx("span", { className: "d-model-name", children: m.model }),
                jsx("span", { className: "d-model-check", children: on ? "✓" : "" }),
              ],
            }, m.model);
          }) }),
        ] }) : null,
      ],
    });
  }

  function metricCards(sums, cap) {
    var prompt = (sums.hit || 0) + (sums.miss || 0) + (sums.cacheWrite || 0);
    var hitRate = prompt > 0 ? ((sums.hit / prompt) * 100).toFixed(1) : "0.0";
    var cards = [
      jsx(Metric, { id: "tokens", icon: CARD_ICONS.tokens, label: "Tokens", value: (mode === "local" ? "≈" : "") + fmtTokens(sums.tokens), caption: (mode === "local" ? "本地" : "官方统计") + " · 命中 " + hitRate + "%", title: "输入与输出 Token 合计，命中率 = 缓存命中 / 输入" }),
      jsx(Metric, mode === "local"
        ? {
          id: "spend",
          icon: CARD_ICONS.spend,
          label: "消费金额",
          value: sums.pricedTokens > 0 ? "≈" + fmtMoney(sums.cost) : "暂无可用费率",
          unit: sums.pricedTokens > 0 ? "CNY" : "",
          caption: sums.pricedTokens > 0
            ? (sums.unpricedTokens > 0 ? "按当前费率估算 · 部分模型未定价" : "按当前费率估算")
            : "编辑费率后可估算",
          title: "本地费用按当前费率 × Token 估算，点击编辑费率；官方账单仍是最终口径",
          onClick: function () { setOpen("rates"); },
        }
        : { id: "spend", icon: CARD_ICONS.spend, label: "消费金额", value: fmtMoney(sums.cost), unit: "CNY", caption: cap, title: "当前统计范围的消费金额" }),
      jsx(Metric, { id: "requests", icon: CARD_ICONS.requests, label: "API 请求次数", value: fmtInt(sums.requests), unit: "次", caption: mode === "local" ? "本地会话日志" : "官方请求统计", title: "当前统计范围的 API 请求次数" }),
      jsx(Metric, mode === "local"
        ? (balance && typeof balance.total === "number"
          ? { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: fmtMoney(balance.total), unit: balance.currency || "CNY", caption: "官方账户余额", title: "余额来自官方账户，和本地日志统计范围无关" }
          : { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: "—", unit: "", caption: "未读取到官方余额", title: "本地聚合不产生余额；需登录官方账户才能显示" })
        : { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: fmtMoney(balance.total), unit: "CNY", caption: "官方账户余额", title: "余额数据来自 DeepSeek 官方 API" }),
    ];
    return jsxs("section", { className: "d-metrics", "aria-label": "用量指标", children: cards });
  }

  var tdBtn = jsxs("div", {
    className: "d-filter-bar",
    children: [
      jsxs("div", { "data-pop": "1", style: { position: "relative", minWidth: 0 }, children: [
        jsxs("button", {
          className: "d-td-btn",
          type: "button",
          "aria-expanded": open === "range" ? "true" : "false",
          "aria-label": "选择时间范围",
          onClick: function () {
            setTd({ start: null, end: null, view: { year: anchor.year, month: anchor.month } });
            setOpen(open === "range" ? "" : "range");
          },
          children: [
            jsx("svg", { className: "d-lead", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", children: jsx("path", { d: P.cal }) }),
            jsx("b", { children: range === "custom" ? mdShort(win.from) + " ~ " + mdShort(win.to) : (RANGES.filter(function (r) { return r.k === range; })[0] || RANGES[0]).l }),
            jsx("svg", { className: "d-tail", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", children: jsx("path", { d: P.chevron }) }),
          ],
        }),
        open === "range" ? jsxs("div", { className: "d-td-panel", children: [
          jsxs("div", { className: "d-td-wrap", children: [
            jsx("div", { className: "d-td-presets", role: "group", "aria-label": "时间维度预设", children: RANGES.map(function (r) {
              return jsx("button", {
                type: "button",
                className: range === r.k ? "d-active" : "",
                onClick: function () { setRange(r.k); setCustom(null); setOpen(""); },
                children: r.l,
              }, r.k);
            }).concat([
              jsx("button", {
                type: "button",
                className: range === "custom" ? "d-active" : "",
                onClick: function () { if (td.start) { setRange("custom"); setCustom({ from: td.start, to: td.end || td.start }); setOpen(""); } },
                children: "自定义",
              }, "custom"),
            ]) }),
            jsxs("div", { children: [
              jsxs("div", { className: "d-td-cal-head", children: [
                jsx("button", {
                  className: "d-icon-btn",
                  type: "button",
                  "aria-label": "上一月",
                  onClick: function () { setTd({ start: td.start, end: td.end, view: { year: td.view.month === 1 ? td.view.year - 1 : td.view.year, month: td.view.month === 1 ? 12 : td.view.month - 1 } }); },
                  children: svg(P.left, 14),
                }),
                jsx("span", { className: "d-td-cal-title", children: td.view.year + "年" + td.view.month + "月" }),
                jsx("button", {
                  className: "d-icon-btn",
                  type: "button",
                  "aria-label": "下一月",
                  onClick: function () { setTd({ start: td.start, end: td.end, view: { year: td.view.month === 12 ? td.view.year + 1 : td.view.year, month: td.view.month === 12 ? 1 : td.view.month + 1 } }); },
                  children: svg(P.right, 14),
                }),
              ] }),
              jsx("div", { className: "d-td-cal-grid", children: (function () {
                var nodes = ["日", "一", "二", "三", "四", "五", "六"].map(function (w) {
                  return jsx("span", { className: "d-weekday", children: w }, "w" + w);
                });
                var first = new Date(td.view.year, td.view.month - 1, 1);
                var lead = first.getDay();
                var count = new Date(td.view.year, td.view.month, 0).getDate();
                for (var i = 0; i < lead; i += 1) nodes.push(jsx("span", {}, "b" + i));
                for (var d = 1; d <= count; d += 1) {
                  var date = td.view.year + "-" + p2(td.view.month) + "-" + p2(d);
                  var inRange = td.start && td.end && date >= td.start && date <= td.end;
                  var endPoint = td.start && date === (td.end || td.start);
                  nodes.push(jsx("button", {
                    type: "button",
                    className: "d-td-day" + (inRange ? " d-in-range" : "") + (endPoint ? " d-range-end" : ""),
                    onClick: function (day, dateStr) {
                      return function () {
                        if (!td.start || (td.start && td.end)) setTd({ start: dateStr, end: null, view: td.view });
                        else if (dateStr < td.start) setTd({ start: dateStr, end: null, view: td.view });
                        else setTd({ start: td.start, end: dateStr, view: td.view });
                      };
                    }(d, date),
                    children: d,
                  }, date));
                }
                return nodes;
              })() }),
            ] }),
          ] }),
          jsxs("div", { className: "d-td-foot", children: [
            jsx("span", { children: td.start ? mdShort(td.start) + (td.end ? " ~ " + mdShort(td.end) : " ~ 选择结束日") : "选择开始日期" }),
            jsx("button", {
              className: "d-btn d-btn-primary d-btn-sm",
              type: "button",
              disabled: !td.start,
              onClick: function () { setRange("custom"); setCustom({ from: td.start, to: td.end || td.start }); setOpen(""); },
              children: "确定",
            }),
          ] }),
        ] }) : null,
      ] }),
      renderModelField("model"),
    ],
  });

  var detailPage = jsxs("div", {
    className: "d-page-detail",
    children: [
      jsxs("div", { className: "d-dashboard-head", children: [tdBtn] }),
      metricCards(sums, mode === "local" ? "本地用量合计" : "官方账单合计"),
      jsxs("section", { className: "d-chart-section", "aria-label": mode === "local" ? "各模型 Token 用量" : "各模型消费金额", children: [
        jsxs("div", { className: "d-chart-heading", children: [
          jsxs("h2", { children: [svg(P.bars, 16), jsx("span", { children: mode === "local" ? "各模型 Token 用量" : "各模型消费金额" })] }),
          jsxs("span", { className: "d-granularity-tag", children: [svg(ICONS.clock, 12), jsx("span", { children: hourly ? "按小时" : "按日" })] }),
        ] }),
        jsx(StackedChart, { days: days, models: models, sel: sel, hourly: hourly, onTip: showTip, metric: mode === "local" ? "tokens" : "cost" }),
        jsx("div", { className: "d-model-legend", "aria-label": "模型图例", children: models.filter(function (m) { return sel === null || sel.indexOf(m.model) >= 0; }).map(function (m, i) {
          return jsx("span", { className: "d-model-legend-item", children: [jsx("i", { style: { background: AI[i % AI.length] } }), jsx("span", { children: m.model })] }, m.model);
        }) }),
        jsx("div", { className: "d-legend d-legend-end", style: { justifyContent: "flex-end" }, children: jsx("span", { className: "d-chart-total", children: mode === "local" ? "≈" + fmtTokens(sums.tokens) + " Tokens" : fmtMoney(sums.cost) + " CNY" }) }),
      ] }),
      mode === "local" ? jsx(ReconcileStrip, { recon: recon, open: reconOpen, onToggle: function () { setReconOpen(!reconOpen); } }) : null,
      jsxs("div", { className: "d-mini-chart-grid", children: [
        jsx(MiniRequests, { days: days, sel: sel, hourly: hourly, onTip: showTip }),
        jsx(MiniTokens, { days: days, sel: sel, models: models, hourly: hourly, onTip: showTip }),
      ] }),
    ],
  });

  var calDays = (cal && cal.days) || [];
  var monthText = anchor.year + "年" + anchor.month + "月";
  var monthPrefix = anchor.year + "-" + p2(anchor.month);
  var todayIso = iso(new Date());
  var weekStart = new Date();
  weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  var dayPick = dim === "day" && pick && pick.day ? pick.day : todayIso;
  var weekPick = dim === "week" && pick && pick.week ? pick.week : null;
  var monthPick = dim === "month" && pick && pick.month ? pick.month : 0;
  var calScope, calCap;
  var billWord = mode === "local" ? "本地用量" : "官方账单";
  if (dim === "day") {
    calScope = calDays.filter(function (d) { return d.date === dayPick; });
    calCap = pick && pick.day ? mdShort(dayPick) + " " + billWord : "今日" + billWord;
  } else if (dim === "week") {
    var wFrom = weekPick ? weekPick.from : iso(weekStart);
    var wTo = weekPick ? weekPick.to : todayIso;
    calScope = calDays.filter(function (d) { return d.date >= wFrom && d.date <= wTo; });
    calCap = weekPick ? "当周" + billWord : "本周" + billWord;
  } else if (monthPick) {
    var pre0 = anchor.year + "-" + p2(monthPick);
    calScope = calDays.filter(function (d) { return d.date.slice(0, 7) === pre0; });
    calCap = "当月" + billWord;
  } else {
    calScope = calDays.filter(function (d) { return d.date.slice(0, 4) === String(anchor.year); });
    calCap = "本年" + billWord;
  }
  var calSums = aggDays(calScope, sel);

  function openDay(date) {
    var day = calDays.filter(function (d) { return d.date === date; })[0];
    if (!day) return;
    setPick({ day: date });
    setDetail({ title: mdLabel(date), eyebrow: "日期详情", day: aggDays([day], sel) });
  }

  var heat = [];
  var heatRows = 0;
  (function () {
    var first = new Date(anchor.year, anchor.month - 1, 1);
    var lead = (first.getDay() + 6) % 7;
    var count = new Date(anchor.year, anchor.month, 0).getDate();
    var weeks = Math.ceil((lead + count) / 7);
    heatRows = weeks;
    var byDate = {};
    var max = 0;
    calDays.forEach(function (d) {
      var v = tokensForDay(d, sel);
      byDate[d.date] = v;
      if (v > max) max = v;
    });
    for (var i = 0; i < 7; i += 1) heat.push(jsx("span", { className: "d-weekday", style: { gridRow: "1", gridColumn: String(i + 1) }, children: ["一", "二", "三", "四", "五", "六", "日"][i] }, "hd" + i));
    var todayIso = iso(new Date());
    for (var k = 0; k < weeks * 7; k += 1) {
      var day = k - lead + 1;
      var cellStyle = { gridRow: String(Math.floor(k / 7) + 2), gridColumn: String((k % 7) + 1) };
      if (day < 1 || day > count) { heat.push(jsx("span", { style: cellStyle, "aria-hidden": "true" }, "e" + k)); continue; }
      (function (day, cellStyle) {
        var date = monthPrefix + "-" + p2(day);
        var value = byDate[date] || 0;
        var label = mdLabel(date) + "\n" + fmtTokens(value) + " Tokens · 点击查看明细";
        heat.push(jsx("button", {
          type: "button",
          className: "d-heat-cell" + (date === todayIso ? " d-today" : ""),
          "data-level": String(level(value, max)),
          style: cellStyle,
          disabled: !value,
          "aria-label": mdLabel(date) + "，" + fmtK(value) + " Tokens，查看详情",
          onMouseEnter: function (e) { showTip(e, label); },
          onMouseMove: function (e) { showTip(e, label); },
          onMouseLeave: function () { setTip(null); },
          onClick: function () { setTip(null); setOpen(""); openDay(date); },
          children: [jsx("span", { className: "d-day-number", children: day }), jsx("span", { className: "d-day-token", children: fmtK(value) })],
        }, date));
      })(day, cellStyle);
    }
  })();

  var weekMatrix = null;
  (function () {
    var byDate = {};
    calDays.forEach(function (d) { byDate[d.date] = d; });
    var half = anchor.month <= 6 ? 1 : 7;
    var clock = new Date();
    var lastCol = anchor.year === clock.getFullYear() ? Math.min(half + 5, clock.getMonth() + 1) : half + 5;
    var cols = [];
    for (var i = half; i <= lastCol; i += 1) cols.push(i);
    var maxRows = 0;
    var cells = cols.map(function (m) {
      var first = new Date(anchor.year, m - 1, 1);
      var last = new Date(anchor.year, m, 0);
      var cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate() - ((first.getDay() + 6) % 7));
      var rows = [];
      while (cursor <= last) {
        var days = [];
        var end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6);
        for (var k = 0; k < 7; k += 1) {
          var dd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + k);
          if (dd.getMonth() + 1 !== m) continue;
          var rec = byDate[iso(dd)];
          if (rec) days.push(rec);
        }
        var fromIso = iso(cursor < first ? first : cursor);
        rows.push({ month: m, from: fromIso, to: iso(end > last ? last : end), days: days, tokens: aggDays(days, sel).tokens });
        maxRows = Math.max(maxRows, rows.length);
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
      }
      return rows;
    });
    var max = 1;
    cells.forEach(function (rows) { rows.forEach(function (r) { if (r.tokens > max) max = r.tokens; }); });
    var todayIso = iso(new Date());
    var grid = [jsx("span", { "aria-hidden": "true" }, "w0")];
    for (var r = 0; r < maxRows; r += 1) {
      grid.push(jsx("span", { style: { fontSize: 11, color: "var(--d-muted)", textAlign: "center", fontWeight: 600 }, children: "第" + (r + 1) + "周" }, "wh" + r));
    }
    cols.forEach(function (m, ci) {
      grid.push(jsx("span", { style: { fontSize: 11, color: "var(--d-muted)", textAlign: "right", fontWeight: 600, paddingRight: 4 }, children: m + "月" }, "ml" + m));
      for (var r = 0; r < maxRows; r += 1) {
        (function (r) {
          var cell = cells[ci][r];
          if (!cell) { grid.push(jsx("span", { "aria-hidden": "true" }, "e" + m + "-" + r)); return; }
          var label = anchor.year + "年" + m + "月 第" + (r + 1) + "周";
          var span = mdShort(cell.from) + (cell.from === cell.to ? "" : " ~ " + mdShort(cell.to));
          var current = todayIso >= cell.from && todayIso <= cell.to;
          grid.push(jsx("button", {
            type: "button",
            className: "d-week-cell" + (current ? " d-current-period" : ""),
            "data-level": String(level(cell.tokens, max)),
            style: { display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 3, minHeight: 56, padding: "8px 10px", borderRadius: 10 },
            onMouseEnter: function (e) { showTip(e, label + "\n" + span + "\n" + fmtTokens(cell.tokens) + " Tokens · 点击查看明细"); },
            onMouseMove: function (e) { showTip(e, label + "\n" + span + "\n" + fmtTokens(cell.tokens) + " Tokens · 点击查看明细"); },
            onMouseLeave: function () { setTip(null); },
            onClick: function () { setTip(null); setOpen(""); setDetail({ title: label, eyebrow: "周详情 · " + span, day: aggDays(cell.days, sel) }); },
            children: [
              jsx("b", { style: { fontSize: 12, fontVariantNumeric: "tabular-nums" }, children: fmtK(cell.tokens) }),
              jsx("span", { style: { fontSize: 10, opacity: 0.6, fontFamily: "var(--d-font-mono)" }, children: span }),
            ],
          }, "w" + m + "-" + r));
        })(r);
      }
    });
    weekMatrix = jsx("div", { className: "d-week-grid", style: { display: "grid", gridTemplateColumns: "40px repeat(" + maxRows + ", minmax(0, 1fr))", gap: 6, marginTop: 8 }, children: grid });
  })();

  var monthCells = [];
  (function () {
    var nowClock = new Date();
    var nowYear = nowClock.getFullYear();
    var nowMonth = nowClock.getMonth() + 1;
    var sums = [];
    for (var m = 1; m <= 12; m += 1) {
      var pre = anchor.year + "-" + p2(m);
      var days = calDays.filter(function (d) { return d.date.slice(0, 7) === pre; });
      sums.push({ month: m, days: days, tokens: aggDays(days, sel).tokens });
    }
    var max = Math.max.apply(null, sums.map(function (x) { return x.tokens; }).concat([1]));
    sums.forEach(function (x) {
      var label = anchor.year + "年" + x.month + "月";
      monthCells.push(jsx("button", {
        type: "button",
        className: "d-month-cell" + (anchor.year === nowYear && x.month === nowMonth ? " d-current-period" : ""),
        style: { padding: "10px 10px" },
        "data-level": String(level(x.tokens, max)),
        onMouseEnter: function (e) { showTip(e, label + "\n" + fmtTokens(x.tokens) + " Tokens · 点击查看明细"); },
        onMouseMove: function (e) { showTip(e, label + "\n" + fmtTokens(x.tokens) + " Tokens · 点击查看明细"); },
        onMouseLeave: function () { setTip(null); },
        onClick: function () { setTip(null); setOpen(""); setPick({ month: x.month }); setDetail({ title: label, eyebrow: "月详情", day: aggDays(x.days, sel) }); },
        children: [jsx("span", { className: "d-m-name", children: x.month + "月" }), jsx("span", { className: "d-m-val", children: fmtK(x.tokens) })],
      }, "m" + x.month));
    });
  })();

  var calendarPage = jsxs("div", {
    className: "d-page-calendar",
    children: [
      jsxs("div", { className: "d-dashboard-head", children: [
        jsxs("div", { className: "d-filter-bar", children: [
          jsxs("div", { className: "d-range-control", children: [
            jsx("button", {
              className: "d-icon-btn",
              type: "button",
              "aria-label": "上一月",
              onClick: function () { setAnchor(anchor.month === 1 ? { year: anchor.year - 1, month: 12 } : { year: anchor.year, month: anchor.month - 1 }); },
              children: svg(P.left, 14),
            }),
            jsx("span", { className: "d-range-label", children: monthText }),
            jsx("button", {
              className: "d-icon-btn",
              type: "button",
              "aria-label": "下一月",
              onClick: function () { setAnchor(anchor.month === 12 ? { year: anchor.year + 1, month: 1 } : { year: anchor.year, month: anchor.month + 1 }); },
              children: svg(P.right, 14),
            }),
          ] }),
          renderModelField("modelCal"),
        ] }),
        jsx("div", { className: "d-range-row", children: jsx("div", { className: "d-dimension-switch", role: "group", "aria-label": "选择统计维度", children: [
          ["day", "按日"], ["week", "按周"], ["month", "按月"],
        ].map(function (row) {
          return jsx("button", { type: "button", "aria-pressed": dim === row[0] ? "true" : "false", onClick: function () { setDim(row[0]); setPick(null); }, children: row[1] }, row[0]);
        }) }) }),
      ] }),
      metricCards(calSums, calCap),
      jsxs("section", { className: "d-chart-section", style: { height: "auto", marginTop: 12 }, children: [
        jsxs("div", { className: "d-chart-heading", children: [
          jsxs("h2", { children: [svg(P.grid, 16), jsx("span", { children: { day: "每日 Token 热力", week: "每周 Token 热力", month: "每月 Token 热力" }[dim] })] }),
          jsx("span", { className: "d-chart-total", children: fmtTokens(calSums.tokens) + " Tokens" }),
        ] }),
        dim === "day" ? jsx("div", { className: "d-heatmap", role: "group", style: { gridTemplateRows: "32px repeat(" + (heatRows || 5) + ", 48px)" }, children: heat }) : null,
        dim === "week" ? jsxs("div", { children: [
          jsx("div", { style: { marginTop: 12, color: "var(--d-muted)", fontSize: 12 }, children: anchor.year + " " + (anchor.month <= 6 ? "上半年 · 1–6 月" : "下半年 · 7–12 月") }),
          weekMatrix,
        ] }) : null,
        dim === "month" ? jsx("div", { className: "d-month-grid", style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px", marginTop: "12px" }, children: monthCells }) : null,
        jsxs("div", { className: "d-legend", children: [
          jsx("span", { children: { day: "悬停格子查看当日数据", week: "按周汇总 · 悬停看数据，点击看明细", month: "全年 12 个月 · 点击查看当月用量" }[dim] }),
          jsxs("span", { className: "d-legend-scale", children: ["少", [0, 1, 2, 3, 4].map(function (lv) {
            return jsx("i", { className: "d-legend-swatch", "data-level": String(lv) }, "l" + lv);
          }), "多"] }),
        ] }),
      ] }),
    ],
  });

  var content = jsxs("section", {
    className: "d-popup-content",
    children: [
      err ? jsx("div", { className: "d-chart-empty", children: err }) : null,
      page === "detail" ? detailPage : calendarPage,
      jsx("div", { className: "d-popup-footer", children: jsx("span", { children: mode === "local" ? "本地 DSH 会话日志 · 实时 · 费用按当前费率估算" : "DeepSeek 官方数据 · 延迟约 5 分钟（GMT+8）" }) }),
    ],
  });

  var detailRows = [];
  if (detail) {
    detailRows.push(
      ["消费金额", mode === "local" ? (detail.day.pricedTokens > 0 ? "≈" + fmtMoney(detail.day.cost) : "暂无可用费率") : fmtMoney(detail.day.cost)],
      ["API 请求次数", fmtInt(detail.day.requests) + " 次"],
      ["输入（命中缓存）", fmtInt(detail.day.hit)],
      ["输入（未命中缓存）", fmtInt(detail.day.miss)],
      ["输出", fmtInt(detail.day.output)],
      ["Token 合计", (mode === "local" ? "≈" : "") + fmtInt(detail.day.tokens || (detail.day.hit || 0) + (detail.day.miss || 0) + (detail.day.cacheWrite || 0) + (detail.day.output || 0))]
    );
  }

  return jsxs("div", {
    className: "d-usage",
    "data-theme": theme,
    children: [
      jsx("main", {
        className: "d-popup",
        children: jsxs("div", {
          className: "d-popup-scroll",
          children: [
            header,
            tabs,
            content,
            tip ? jsx("div", {
              className: "d-cell-tip",
              style: { left: tip.x, top: tip.y, position: "fixed", whiteSpace: "pre-line", background: "var(--d-surface)", color: "var(--d-fg)", border: "1px solid var(--d-border)", borderRadius: 12, boxShadow: "0 16px 36px rgba(15,17,23,.16)", padding: "8px 10px", maxWidth: 240, zIndex: 60 },
              children: tip.text,
            }) : null,
          ],
        }),
      }),
      open === "rates" ? jsx(RateDialog, {
        rows: readRates() || RATE_DEFAULTS,
        onClose: function () { setOpen(""); },
        onSave: function (rates) {
          writeJSON(RATES_KEY, rates);
          setOpen("");
          notifySource();
          loadView(true);
          loadToday(true);
        },
      }) : null,
      detail ? jsx("div", {
        className: "d-dialog-backdrop",
        onMouseDown: function (e) { if (e.target === e.currentTarget) setDetail(null); },
        children: jsxs("section", {
          className: "d-detail-dialog",
          style: { maxWidth: 320, maxHeight: 420, overflowY: "auto", borderRadius: 20, padding: "14px 16px" },
          role: "dialog",
          "aria-modal": "true",
          "aria-label": detail.title,
          children: [
            jsxs("div", { className: "d-dialog-title-row", children: [
              jsxs("div", { children: [
                jsx("p", { className: "d-section-kicker", children: detail.eyebrow }),
                jsx("h2", { children: detail.title }),
              ] }),
              jsx("button", { className: "d-icon-btn", type: "button", "aria-label": "关闭详情", onClick: function () { setDetail(null); }, children: svg(P.close, 16) }),
            ] }),
            jsx("ul", { className: "d-detail-list", children: detailRows.map(function (row) {
              return jsxs("li", { children: [jsx("span", { children: row[0] }), jsx("span", { children: row[1] })] }, row[0]);
            }) }),
            jsx("ul", { className: "d-detail-list d-detail-models", children: (detail.day.models || []).filter(function (m) { return m.tokens > 0 || m.cost > 0; }).map(function (m) {
              return jsxs("li", { children: [jsx("span", { children: m.model }), jsx("span", { children: mode === "local" ? (m.pricedTokens > 0 ? "≈" + fmtMoney(m.cost) : "暂无费率") + " · " + fmtInt(m.requests) + " 次" : fmtMoney(m.cost) + " · " + fmtInt(m.requests) + " 次" })] }, m.model);
            }) }),
          ],
        }),
      }) : null,
    ],
  });
}


function DeepMeterSeat(props) {
  var openS = useState(false);
  var open = openS[0];
  var setOpen = openS[1];
  var cfgS = useState(readSeat());
  var cfg = cfgS[0] || readSeat();
  var setCfg = cfgS[1];
  var modeS = useState(readSourceMode());
  var mode = modeS[0];
  var setMode = modeS[1];
  var todayS = useState(null);
  var today = todayS[0];
  var setToday = todayS[1];
  var wide = props.wide !== false;
  useEffect(function () { injectSeatStyles(); }, []);
  useEffect(function () {
    function sync() { setCfg(readSeat()); }
    window.addEventListener("deepseek-usage:seat", sync);
    return function () { window.removeEventListener("deepseek-usage:seat", sync); };
  }, []);
  useEffect(function () {
    function sync() { setMode(readSourceMode()); }
    window.addEventListener("deepseek-usage:source", sync);
    return function () { window.removeEventListener("deepseek-usage:source", sync); };
  }, []);
  useEffect(function () {
    var alive = true;
    setToday(null);
    function pull() {
      var path = mode === "local"
        ? "/local?range=today&tz=" + TZ + "&scope=all" + ratesParam()
        : "/official?range=today&tz=" + TZ;
      getJSON(path).then(function (payload) {
        if (!alive) return;
        var t = total(payload.points || payload.days || [], null);
        setToday({ tokens: t.tokens, cost: t.cost, requests: t.requests, pricedTokens: t.pricedTokens, unpricedTokens: t.unpricedTokens });
      }).catch(function () { if (alive) setToday(null); });
    }
    pull();
    var timer = window.setInterval(pull, 120000);
    return function () { alive = false; window.clearInterval(timer); };
  }, [mode]);
  var order = ["tokens", "requests", "spend"];
  var enabled = order.filter(function (k) { return cfg[k] && cfg[k].on; });
  var items = enabled.map(function (k) {
    var m = cfg[k] || defaultSeat[k];
    var value = !today ? "—" : k === "tokens" ? (mode === "local" ? "≈" : "") + fmtTokens(today.tokens) : k === "spend" ? (today.cost === null || today.cost === undefined ? "—" : (mode === "local" ? "≈" : "") + fmtMoney(today.cost)) : fmtInt(today.requests);
    var glyph = seatGlyph(m, 14);
    var kids = [];
    if (glyph) kids.push(jsx("span", { style: { display: "inline-flex", color: "var(--d-accent)" }, children: glyph }, "g"));
    if (m.label) kids.push(jsx("span", { style: { color: "var(--d-muted)", whiteSpace: "nowrap", fontSize: 13 }, children: m.label }, "l"));
    kids.push(jsx("b", { style: { fontWeight: 600, fontSize: 13, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }, children: value }, "v"));
    return jsx("span", {
      className: "d-seat-metric",
      style: { display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 },
      children: kids,
    }, k);
  });
  if (!items.length) items = [jsx("span", { style: { fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }, children: "DeepSeek Usage" }, "brand")];
  return jsxs("div", {
    className: "d-seat-layer" + (wide ? "" : " d-seat-rail"),
    style: { margin: "0 -2px", width: "calc(100% + 4px)", flex: "0 0 calc(100% + 4px)" },
    children: [
      jsx("button", {
        className: "d-seat",
        type: "button",
        "aria-label": mode === "local" ? "DeepSeek Usage 本地今日用量" : "DeepSeek Usage 用量与余额",
        onClick: function () { setOpen(true); },
        style: { display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, padding: 6, border: 0, borderRadius: 12, background: "transparent", color: "var(--d-fg)", font: "14px var(--d-font-body)", cursor: "pointer", flexWrap: "wrap" },
        children: items,
      }),
      open ? jsx(Dialog, { onClose: function () { setOpen(false); }, seat: cfg }) : null,
    ],
  });
}

module.exports.apply = function apply(ctx) {
  ctx.slots.inject("sidebar.footer.action", function () {
    return ctx.slots.register({ name: "sidebar.footer.action", id: "deepseek-usage", order: 21 }, DeepMeterSeat);
  });
};
module.exports.inject = ["slots"];
return module.exports;
},
});
