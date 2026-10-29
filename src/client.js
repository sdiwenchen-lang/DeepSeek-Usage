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
var CSS_PATH = "/api/deepseek-usage/panel.css";




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
  refresh: ["M20 11a8 8 0 0 0-14.9-3L4 10", "M4 5v5h5", "M4 13a8 8 0 0 0 14.9 3L20 14", "M20 19v-5h-5"],
  settings: ["M4 6h16", "M4 12h16", "M4 18h16", "M9 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M15 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M10 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4"],
  swap: ["M4 7h15l-3-3M20 17H5l3 3"],
  chevron: "m6 9 6 6 6-6",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  close: "m6 6 12 12M18 6 6 18",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
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
  var cut = function (x) { return String(Number(x.toFixed(2))); };
  if (v >= 1e9) return cut(v / 1e9) + "B";
  if (v >= 1e6) return cut(v / 1e6) + "M";
  if (v >= 1e3) return cut(v / 1e3) + "K";
  return String(Math.round(v));
}
function fmtInt(n) {
  return (Number(n) || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}
function seatValue(t, k) {
  return !t ? "\u2014" : k === "spend" ? (t.cost == null ? "\u2014" : fmtMoney(t.cost)) : fmtInt(k === "tokens" ? t.tokens : t.requests);
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
var AI = ["var(--d-accent)", "var(--d-accent-2)", "#D97706", "#0EA5E9", "#6E56CF"];
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

function blankUsage() {
  return { hit: 0, miss: 0, cacheWrite: 0, output: 0, tokens: 0, requests: 0, cost: 0, usd: 0, pricedTokens: 0, unpricedTokens: 0, costComplete: true, _cost: false, _usd: false };
}
function mergeUsage(o, x) {
  var n = x.tokens == null ? (x.hit || 0) + (x.miss || 0) + (x.cacheWrite || 0) + (x.output || 0) : x.tokens;
  ["hit", "miss", "cacheWrite", "output", "requests", "pricedTokens", "unpricedTokens"].forEach(function (k) { o[k] += x[k] || 0; });
  o.tokens += n;
  if (typeof x.cost === "number") { o.cost += x.cost; if (n > 0) o._cost = true; }
  if (typeof x.usd === "number") { o.usd += x.usd; if (n > 0) o._usd = true; }
  if (x.costComplete === false || x.unpricedTokens > 0) o.costComplete = false;
  return o;
}
function finishUsage(o) {
  if (o.tokens > 0 && !o._cost) o.cost = null;
  if (o.tokens > 0 && !o._usd) o.usd = null;
  return o;
}
function total(days, models) {
  var o = blankUsage();
  days.forEach(function (d) {
    if (!Array.isArray(d.models) || !d.models.length) { if (models === null) mergeUsage(o, d); return; }
    d.models.forEach(function (m) { if (models === null || models.indexOf(m.model) >= 0) mergeUsage(o, m); });
  });
  return finishUsage(o);
}
function localMoney(row, fx) {
  if (!row.tokens && !(row.hit || row.miss || row.cacheWrite || row.output)) return fmtMoney(0);
  if (!row.pricedTokens) return "暂无费率";
  return row.cost != null ? fmtMoney(row.cost) : row.usd != null ? fmtMoney(row.usd * (fx > 0 ? fx : DEFAULT_FX)) : "—";
}

function modelsOf(days) {
  var map = {};
  days.forEach(function (d) {
    (d.models || []).forEach(function (m) {
      var row = map[m.model] || (map[m.model] = Object.assign(blankUsage(), { model: m.model }));
      mergeUsage(row, m);
    });
  });
  return Object.keys(map)
    .map(function (k) { return finishUsage(map[k]); })
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
function loadRange(from, to, force) {
  var lo = typeof from === "string" ? from : iso(from);
  var hi = typeof to === "string" ? to : iso(to);
  return getJSON("/official?from=" + lo + "&to=" + hi + "&tz=" + TZ + (force ? "&force=1" : "")).then(function (payload) {
    return { days: payload.points || payload.days || [], balance: payload.balance, granularity: "day" };
  });
}

function loadLocalRange(from, to, force) {
  var fromIso = typeof from === "string" ? from : iso(from);
  var toIso = typeof to === "string" ? to : iso(to);
  return getJSON("/local?from=" + fromIso + "&to=" + toIso + "&tz=" + TZ + "&scope=all" + ratesParam() + (force ? "&force=1" : "")).then(function (payload) {
    var days = (payload.points || payload.days || []).filter(function (d) { return d.date >= fromIso && d.date <= toIso; });
    return { days: days, balance: payload.balance || {}, granularity: payload.granularity || "day", local: payload };
  });
}

var TZ = -new Date().getTimezoneOffset() * 60;
function pkey(d) { return d.key || d.date || ""; }
function pshort(d, hourly) { return hourly ? d.label || "" : mdShort(d.date); }
function ptitle(d, hourly) {
  if (!hourly) return mdLabel(d.date);
  var h = Number(String(d.key || "").slice(-2)) || 0;
  return mdLabel(d.date) + " " + p2(h) + ":00–" + p2((h + 1) % 24) + ":00";
}
var MODEL_ALIASES = {
  "deepseek-flash": "DeepSeek-V4.1-Flash",
  "deepseek-v4.1-flash": "DeepSeek-V4.1-Flash",
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
      var row = map[name] || (map[name] = Object.assign(blankUsage(), { model: name }));
      mergeUsage(row, m);
    });
    return Object.assign({}, d, { models: Object.keys(map).map(function (k) { return finishUsage(map[k]); }).sort(function (a, b) { return b.tokens - a.tokens; }) });
  });
}
function aggDays(days, sel) {
  var acc = total(days, sel); var map = {};
  days.forEach(function (d) { (d.models || []).forEach(function (m) {
    if (sel !== null && sel.indexOf(m.model) < 0) return;
    var row = map[m.model] || (map[m.model] = Object.assign(blankUsage(), { model: m.model }));
    mergeUsage(row, m);
  }); });
  acc.models = Object.keys(map).map(function (k) { return finishUsage(map[k]); });
  return acc;
}

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

var MODE_KEY = "deepseekUsageMode";
var RATES_KEY = "deepseekUsagePricingV2";
var DEFAULT_FX = 6.7;
function readSourceMode() { return readRaw(MODE_KEY, "official") === "local" ? "local" : "official"; }
function readRates() {
  var rates = readJSON(RATES_KEY, null);
  return rates && rates.schema === 2 && rates.models && typeof rates.models === "object" ? rates : null;
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

var CARD_ICONS = { tokens: "bolt", spend: "card", requests: "database", balance: "wallet" };
var SEAT_KEY = "deepseekUsageSeat";
var defaultSeat = {
  tokens: { on: true, label: "Token", icon: "bolt", img: "" },
  requests: { on: false, label: "API 次数", icon: "database", img: "" },
  spend: { on: true, label: "消费", icon: "card", img: "" },
};
function seatOrder(cfg) {
  var keys = ["tokens", "requests", "spend"];
  var saved = cfg && Array.isArray(cfg.order) ? cfg.order : [];
  return saved.filter(function (k, i) { return keys.indexOf(k) >= 0 && saved.indexOf(k) === i; }).concat(keys.filter(function (k) { return saved.indexOf(k) < 0; }));
}
function readSeat() {
  var saved = readJSON(SEAT_KEY, null) || {};
  var out = { order: seatOrder(saved) };
  Object.keys(defaultSeat).forEach(function (k) {
    var base = defaultSeat[k];
    var row = saved[k] || {};
    var oldSpend = k === "spend" && row.on === false && !row.img && row.icon === "yen" && row.label === "消费";
    out[k] = {
      on: oldSpend ? true : row.on === undefined ? base.on : !!row.on,
      label: row.label === undefined || (k === "tokens" ? row.label === "用量" : k === "requests" && row.label === "请求") ? base.label : String(row.label).slice(0, 8),
      icon: row.icon === undefined || (!row.img && (k === "tokens" ? row.icon === "layers" : k === "requests" ? row.icon === "activity" : row.icon === "yen")) ? base.icon : String(row.icon),
      img: row.img || "",
    };
  });
  return out;
}
function seatGlyph(m, size) {
  if (!m) return null;
  if (m.img) return jsx("img", { src: m.img, alt: "", style: { display: "block", width: size, height: size, borderRadius: Math.max(3, size / 5), objectFit: "cover" } });
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
          jsx("span", { "data-metric-icon": props.id, "aria-hidden": "true", children: props.glyph !== undefined ? props.glyph : icon(props.icon, 16) }),
          jsx("span", { children: props.label }),
        ],
      }),
      jsxs("span", {
        className: "d-metric-line",
        children: [
          jsx("span", { className: "d-metric-value", children: props.value }),
          props.unit ? jsx("span", { className: "d-metric-unit", children: props.unit }) : null,
        ],
      }),
      jsx("span", { className: "d-metric-caption", children: props.caption }),
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
  if (!list.length) return null;
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
                var idx = list.findIndex(function (x) { return x.model === m.model; });
                segs.push({ v: value, c: AI[idx < 0 ? 0 : idx % AI.length], k: m.model + segs.length });
                sum += value;
              });
              var rows = (d.models || []).filter(function (m) {
                return (sel === null || sel.indexOf(m.model) >= 0) && valueOf(m) > 0;
              }).map(function (m) {
                var v = valueOf(m); var i = list.findIndex(function (x) { return x.model === m.model; });
                return { color: AI[i < 0 ? 0 : i % AI.length], name: m.model, value: fmtValue(v), pct: Math.round((v / sum) * 100) + "%" };
              });
              var label = ptitle(d, hourly);
              var data = { title: label, total: fmtValue(sum), rows: rows };
              var hover = tip ? {
                onMouseMove: function (e) { tip(e, data); },
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
                "aria-label": label + " " + metricLabel + " " + fmtValue(sum),
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
  var sel=props.sel, models=props.models;
  var vis=models.filter(function(m){return sel===null||sel.indexOf(m.model)>=0;});
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
            var label=ptitle(d,hourly);
            var rows=(d.models||[]).filter(function(m){return (sel===null||sel.indexOf(m.model)>=0)&&m.requests}).map(function(m){
              var mi=vis.findIndex(function(x){return x.model===m.model;});
              return {color:AI[mi]||AI[0],name:m.model,value:fmtInt(m.requests),pct:Math.round(m.requests/values[i]*100)+"%"};
            });
            return jsx("span", {
              className: "d-mini-hit",
              "aria-label": label + " " + fmtInt(values[i]) + " 次",
              onMouseMove: props.onTip ? function (e) { props.onTip(e, { title: label, total: fmtInt(values[i]) + " 次", rows: rows }); } : null,
              onMouseLeave: props.onTip ? function () { props.onTip(null); } : null,
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
            var b = total([d], sel);
            var rows = [
              { c: "var(--d-s3)", n: "输入（命中缓存）", v: b.hit },
              { c: "var(--d-s1)", n: "输入（未命中缓存）", v: b.miss },
              { c: "var(--d-s2)", n: "缓存写入", v: b.cacheWrite },
              { c: "var(--d-s4)", n: "输出", v: b.output },
            ].filter(function (r) { return r.v > 0; }).map(function (r) { return { color: r.c, name: r.n, value: fmtInt(r.v) }; });
            var label = ptitle(d, hourly);
            var tip = props.onTip;
            return jsx("button", {
              type: "button",
              className: "d-mini-hit",
              "aria-label": label + " Token 合计 " + fmtTokens(value),
              onMouseMove: tip ? function (e) { tip(e, { title: label, total: fmtTokens(value), rows: rows }); } : null,
              onMouseLeave: tip ? function () { tip(null); } : null,
              children: jsx("i", {
                className: "d-mini-bar",
                style: { height: Math.max(1.5, (value / max) * 100) + "%" },
                children: (d.models || []).filter(function (m) { return sel === null || sel.indexOf(m.model) >= 0; }).map(function (m, i) {
                  var mi = legend.findIndex(function (x) { return x.model === m.model; });
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
        return jsx("span", { className: "d-model-legend-item", title: m.model, children: [jsx("i", { style: { background: AI[i % AI.length] } }), jsx("span", { children: m.model })] }, m.model);
      }) }),
    ],
  });
}


function fmtUsd(n) {
  return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function RateDialog(props) {
  var saved = props.rates;
  var [rows, setRows] = useState(saved ? saved.models : {});
  var [base, setBase] = useState(null);
  var [search, setSearch] = useState("");
  var [page, setPage] = useState(0);
  var [edit, setEdit] = useState("");
  var [buff, setBuff] = useState(null);
  var [draft, setDraft] = useState(null);
  var [sel, setSel] = useState({});
  var [hidden, setHidden] = useState(saved && Array.isArray(saved.hidden) ? saved.hidden : []);
  var [fx, setFx] = useState(saved && Number(saved.usdToCny) > 0 ? Number(saved.usdToCny) : DEFAULT_FX);
  var [error, setError] = useState("");
  useEffect(() => {
    var alive = true;
    getJSON("/pricing").then(p => { if (alive) setBase(p); }).catch(() => { if (alive) setError("默认费率加载失败。"); });
    return () => { alive = false; };
  }, []);
  var D = base && base.models || {}, N = base && base.names || {};
  var F = ["input", "output", "cacheRead", "cacheWrite"], L = ["输入", "输出", "缓存命中", "缓存写入"];
  var q = search.trim().toLowerCase();
  var keys = Object.keys({ ...D, ...rows }).filter(k => hidden.indexOf(k) < 0 && (!q || k.toLowerCase().includes(q) || String(N[k] || "").toLowerCase().includes(q))).sort((a, b) => (rows[b] ? 1 : 0) - (rows[a] ? 1 : 0) || a.localeCompare(b));
  var pages = Math.max(1, Math.ceil(keys.length / 20)), current = Math.min(page, pages - 1);
  var visible = keys.slice(current * 20, current * 20 + 20);
  var selKeys = Object.keys(sel).filter(k => hidden.indexOf(k) < 0 && (D[k] || rows[k]));
  var allOn = visible.length > 0 && visible.every(k => sel[k]);
  var rowOf = k => rows[k] || D[k] || { input: "", output: "", cacheRead: "", cacheWrite: "" };
  var validKey = k => /^[\w./:+ -]{1,160}$/.test(k) && !["__proto__", "constructor", "prototype"].includes(k);
  var nums = r => {
    var o = {};
    for (var f of F) {
      var x = r[f];
      if (x === "" || x == null) { o[f] = 0; continue; }
      var n = Number(x);
      if (!isFinite(n) || n < 0) return null;
      o[f] = n;
    }
    return o;
  };
  var persist = (next, h) => {
    var m = {};
    Object.keys(next).forEach(k => {
      var r = next[k], d = D[k], same = !!d;
      if (same) F.forEach(f => { if (Number(r[f]) !== Number(d[f])) same = false; });
      if (!same) m[k] = Object.fromEntries(F.map(f => [f, Number(r[f])]));
    });
    props.onSave({ schema: 2, usdToCny: fx, models: m, hidden: h || hidden }, true);
  };
  var commit = (next, h) => { setRows(next); if (h) setHidden(h); persist(next, h); };
  var toggleSel = k => { var n = { ...sel }; if (n[k]) delete n[k]; else n[k] = 1; setSel(n); };
  var openDraft = () => { setDraft({ name: "", input: "", output: "", cacheRead: "", cacheWrite: "" }); setEdit(""); setBuff(null); setError(""); setPage(0); };
  var cancelDraft = () => { setDraft(null); setError(""); };
  var patchDraft = (f, v) => { setDraft({ ...draft, [f]: v }); setError(""); };
  var addModel = () => {
    var k = draft.name.trim();
    if (!validKey(k)) { setError("模型标识无效。"); return; }
    if ((D[k] || rows[k]) && hidden.indexOf(k) < 0) { setError("模型已存在。"); return; }
    var p = nums(draft);
    if (!p) { setError("费率必须为非负数字。"); return; }
    commit({ ...rows, [k]: p }, hidden.filter(x => x !== k)); setDraft(null); setSearch(""); setPage(0); setError("");
  };
  var startEdit = k => {
    var r = rowOf(k), n = {};
    F.forEach(f => { n[f] = r[f]; });
    setBuff(n); setEdit(k); setDraft(null); setError("");
  };
  var patchBuff = (f, v) => { setBuff({ ...buff, [f]: v }); setError(""); };
  var cancelEdit = () => { setEdit(""); setBuff(null); setError(""); };
  var saveEdit = () => {
    if (!buff) return;
    var p = nums(buff);
    if (!p) { setError(edit + "：费率必须为非负数字。"); return; }
    var next = { ...rows }, d = D[edit], same = !!d;
    if (same) F.forEach(f => { if (Number(p[f]) !== Number(d[f])) same = false; });
    if (same) delete next[edit]; else next[edit] = p;
    commit(next);
    var n = { ...sel }; delete n[edit]; setSel(n);
    setEdit(""); setBuff(null); setError("");
  };
  var remove = ks => {
    if (!ks.length) return;
    var next = { ...rows }, h = hidden.slice();
    ks.forEach(k => { delete next[k]; if (h.indexOf(k) < 0) h.push(k); });
    commit(next, h);
    var n = { ...sel }; ks.forEach(k => delete n[k]); setSel(n);
    if (ks.includes(edit)) { setEdit(""); setBuff(null); }
    setError("");
  };
  var resetAll = () => {
    setRows({}); setHidden([]); setSel({}); setEdit(""); setBuff(null); setDraft(null); setError(""); setSearch(""); setPage(0); setFx(DEFAULT_FX);
    props.onSave({ schema: 2, usdToCny: DEFAULT_FX, models: {}, hidden: [] }, true);
  };
  var goPage = d => { setPage(Math.max(0, Math.min(pages - 1, current + d))); setEdit(""); setBuff(null); setSel({}); };
  var ib = (key, label, onClick, child, extra) => jsx("button", { type: "button", className: "d-rate-icon" + (extra || ""), "aria-label": label, title: label, onClick: onClick, children: child }, key);
  var head = [jsx("th", { scope: "col", className: "d-rate-check", children: jsx("input", { type: "checkbox", checked: allOn, disabled: !visible.length, onChange: () => { var n = {}; if (!allOn) visible.forEach(k => { n[k] = 1; }); setSel(n); }, "aria-label": "全选本页" }) }, "check")].concat(["模型", "输入", "输出", "缓存命中", "缓存写入", "操作"].map((label, i) => jsx("th", { scope: "col", children: label }, i)));
  var body = [];
  if (draft) {
    body.push(jsxs("tr", { className: "d-rate-draft", children: [
      jsx("td", { className: "d-rate-check" }),
      jsx("td", { children: jsx("input", { className: "d-rate-new-name", placeholder: "模型标识", "aria-label": "新增模型标识", value: draft.name, onChange: e => patchDraft("name", e.target.value) }) }),
    ].concat(F.map((f, i) => jsx("td", { children: jsx("input", { type: "number", min: "0", step: "any", placeholder: "0", "aria-label": "新增 " + L[i], value: draft[f], onChange: e => patchDraft(f, e.target.value) }) }, f))).concat([
      jsxs("td", { className: "d-rate-row-actions", children: [
        ib("add", "添加模型", addModel, "✓", " d-rate-ok"),
        ib("cancel", "取消新增", cancelDraft, "×"),
      ] }),
    ]) }, "draft"));
  }
  visible.forEach(k => {
    var ed = edit === k, r = ed ? buff : rowOf(k), name = N[k];
    var acts = ed ? [
      ib("save", "保存 " + k, saveEdit, "✓", " d-rate-ok"),
      ib("cancel", "取消编辑 " + k, cancelEdit, "×"),
    ] : [
      ib("edit", "编辑 " + k, () => startEdit(k), svg(P.edit, 14)),
      ib("del", "删除 " + k, () => remove([k]), svg(P.trash, 14), " d-rate-del"),
    ];
    body.push(jsxs("tr", { className: ed ? "d-rate-editing" : sel[k] ? "d-rate-selected" : "", children: [
      jsx("td", { className: "d-rate-check", children: jsx("input", { type: "checkbox", checked: !!sel[k], onChange: () => toggleSel(k), "aria-label": "选择 " + k }) }),
      jsx("th", { scope: "row", children: jsxs("span", { className: "d-rate-model", children: [jsx("b", { title: name && name !== k ? name : k, children: name && name !== k ? name : k }), name && name !== k ? jsx("code", { children: k }) : null] }) }),
    ].concat(F.map((f, i) => jsx("td", { children: ed ? jsx("input", { type: "number", min: "0", step: "any", value: r[f], "aria-label": k + " " + L[i], onChange: e => patchBuff(f, e.target.value) }) : jsx("span", { className: "d-rate-value", children: r[f] === "" || r[f] == null ? "—" : fmtUsd(r[f]) }) }, f))).concat([
      jsx("td", { className: "d-rate-row-actions", children: acts }, "actions"),
    ]) }, k));
  });
  var empty = q ? "没有匹配的模型。" : base ? "列表为空，可点击 + 添加，或恢复默认。" : "默认费率未加载，可点击新增。";
  return jsx("div", { className: "d-dialog-backdrop", onMouseDown: e => { if (e.target === e.currentTarget) props.onClose(); }, children: jsxs("section", {
    className: "d-detail-dialog d-rate-dialog", role: "dialog", "aria-modal": "true", "aria-label": "管理定价",
    children: [
      jsxs("div", { className: "d-dialog-title-row", children: [jsx("h2", { children: "管理定价" }), jsx("button", { type: "button", className: "d-icon-btn", "aria-label": "关闭定价", onClick: props.onClose, children: svg(P.close, 16) })] }),
      jsxs("div", { className: "d-rate-search", children: [
        jsx("input", { type: "search", placeholder: "搜索模型名称或标识", "aria-label": "搜索模型费率", value: search, onChange: e => { setSearch(e.target.value); setPage(0); setEdit(""); setBuff(null); setSel({}); } }),
        jsx("button", { type: "button", className: "d-rate-reset", onClick: resetAll, children: "恢复默认" }),
        jsx("button", { type: "button", className: "d-rate-batch", disabled: !selKeys.length, onClick: () => remove(selKeys), title: "勾选行后批量删除", children: "删除所选" + (selKeys.length ? " (" + selKeys.length + ")" : "") }),
        jsx("button", { type: "button", className: "d-rate-add-btn", "aria-label": "新增模型", title: "新增模型", onClick: openDraft, children: "+" }),
      ] }),
      error ? jsx("p", { className: "d-rate-error", role: "alert", children: error }) : null,
      jsx("div", { className: "d-rate-scroll", children: body.length ? jsxs("table", { className: "d-rate-table", children: [
        jsx("thead", { children: jsx("tr", { children: head }) }),
        jsx("tbody", { children: body }),
      ] }) : jsx("div", { className: "d-rate-empty", children: empty }) }),
      jsxs("div", { className: "d-rate-foot", children: [jsx("span", { children: "每页 20 条 · 共 " + keys.length + " 条" }), keys.length ? jsxs("span", { className: "d-rate-pager", children: [
        jsx("button", { type: "button", "aria-label": "上一页", disabled: current <= 0, onClick: () => goPage(-1), children: "‹" }, "prev"),
        jsx("b", { children: (current + 1) + " / " + pages }, "page"),
        jsx("button", { type: "button", "aria-label": "下一页", disabled: current >= pages - 1, onClick: () => goPage(1), children: "›" }, "next"),
      ] }) : null] }),
    ],
  }) });
}

function TipCard(props) {
  var d = props.data;
  if (!d || typeof d === "string") return jsx("span", { className: "d-tip-text", children: d });
  return jsxs("div", { className: "d-tip-card", children: [
    jsxs("div", { className: "d-tip-head", children: [jsx("span", { children: d.title }), jsx("b", { children: d.total })] }),
    d.rows && d.rows.length ? jsx("div", { className: "d-tip-rows", children: d.rows.map(function (r, i) {
      return jsxs("div", { className: "d-tip-row", children: [
        jsx("i", { style: { background: r.color } }), jsx("span", { children: r.name }), jsx("b", { children: r.value }), r.pct ? jsx("em", { children: r.pct }) : null,
      ] }, i);
    }) }) : null,
  ] });
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
  var dragS = st(""); var drag = dragS[0]; var setDrag = dragS[1];

  var themeS = st(readJSON("deepseekUsageTheme", { name: "blue" }).name || "blue"); var theme = themeS[0]; var setTheme = themeS[1];

  var autoS = st(readRaw("deepseekUsageAutoRefresh", true) !== false); var auto = autoS[0]; var setAuto = autoS[1];
  var tickS = st(Number(readRaw("deepseekUsageInterval", 30)) || 30); var interval = tickS[0]; var setTick = tickS[1];
  var seatS = st(readSeat()); var seat = seatS[0]; var setSeat = seatS[1];
  var fxS = st((readRates() || {}).usdToCny || DEFAULT_FX); var fx = fxS[0]; var setFx = fxS[1];
  var fxEditS = st(false); var fxEdit = fxEditS[0]; var setFxEdit = fxEditS[1];
  var fxDraftS = st(""); var fxDraft = fxDraftS[0]; var setFxDraft = fxDraftS[1];
  var fxNow = fx;

  var anchorS = st({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  var anchor = anchorS[0]; var setAnchor = anchorS[1];
  var dimS = st("day"); var dim = dimS[0]; var setDim = dimS[1];
  var detailS = st(null); var detail = detailS[0]; var setDetail = detailS[1];
  var tdS = st({ start: null, end: null, view: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 } });
  var td = tdS[0]; var setTd = tdS[1];
  var tipS = st(null); var tip = tipS[0]; var setTip = tipS[1];
  function showTip(e, data) {
    if (!e) { setTip(null); return; }
    var popup = document.querySelector(".d-popup");
    var box = popup ? popup.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    var wid = 248, hei = 64 + (data && data.rows ? data.rows.length * 22 : 0);
    var x = e.clientX + 12;
    var y = e.clientY + 14;
    if (x + wid > box.right - 8) x = e.clientX - 12 - wid;
    if (y + hei > box.bottom - 8) y = e.clientY - 14 - hei;
    x = Math.max(box.left + 8, Math.min(x, box.right - wid - 8));
    y = Math.max(box.top + 8, Math.min(y, box.bottom - hei - 8));
    setTip({ x: x, y: y, data: data });
  }
  useEffect(function () { if (open) setTip(null); }, [open]);
  useEffect(function () { setTip(null); }, [page, dim, range, anchor.year, anchor.month]);
  var requestRef = useRef(0);
  var todayRef = useRef(0);
  var modeS = st(readSourceMode()); var mode = modeS[0]; var setMode = modeS[1];
  var localAvailS = st(true); var localAvail = localAvailS[0]; var setLocalAvail = localAvailS[1];

  useEffect(function () { injectStyles(); }, []);
  useEffect(function () {
    getJSON("/status").then(function (status) {
      var available = !!(status && status.local && status.local.available !== false);
      setLocalAvail(available);
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
    setSel(null); setData(null); setCal(null); setToday(null); setDetail(null); setErr(""); setOpen("");
  }, [mode]);
  useEffect(function () { setSel(null); setData(null); setCal(null); }, [range, custom, page, dim, anchor.year, anchor.month]);
  useEffect(function () {
    if (!auto) return;
    var timer = window.setInterval(function () { loadView(true); loadToday(true); }, interval * 1000);
    return function () { clearInterval(timer); };
  }, [auto, interval, range, custom, anchor.year, anchor.month, page, dim, mode]);

  function loadView(force) {
    var id = requestRef.current + 1;
    requestRef.current = id;
    setBusy(true);
    var localMode = mode === "local";
    var suffix = force ? "&force=1" : "";
    var job;
    if (page === "calendar") { job = null; } else if (range === "custom" && custom) {
      job = localMode
        ? loadLocalRange(custom.from, custom.to, force)
        : loadRange(custom.from, custom.to, force);
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
    if (page === "calendar") {
      var startMonth = dim === "month" ? 1 : dim === "week" ? (anchor.month <= 6 ? 1 : 7) : anchor.month;
      var endMonth = dim === "month" ? 12 : dim === "week" ? startMonth + 5 : anchor.month;
      var calendarFrom = new Date(anchor.year, startMonth - 1, 1);
      var calendarTo = new Date(anchor.year, endMonth, 0);
      job = localMode ? loadLocalRange(calendarFrom, calendarTo, force) : loadRange(calendarFrom, calendarTo, force);
    }
    return job.then(function (view) {
      if (requestRef.current !== id) return;
      var result = { days: normalizeDays(view.days), balance: view.balance, granularity: view.granularity, local: view.local };
      if (page === "calendar") setCal(result); else setData(result);
      if (page !== "calendar" && range === "today") setToday(total(result.days, null));
      setErr("");
    }).catch(function (e) {
      if (requestRef.current !== id) return;
      if (page === "calendar") setCal(null); else setData(null);
      setErr(e.status === 401 ? "未检测到 DeepSeek 账号，请先在 DeepSeek Harness 里登录。" : e.status === 503 ? "本地会话日志不可用：当前宿主没有提供 sessionPersistence。" : e.message || "加载失败");
    }).finally(function () {
      if (requestRef.current === id) setBusy(false);
    });
  }

  function loadToday(force) {
    var id = ++todayRef.current;
    var path = mode === "local" ? "/local?range=today&tz=" + TZ + "&scope=all" + ratesParam() : "/official?range=today&tz=" + TZ;
    return getJSON(path + (force ? "&force=1" : "")).then(function (payload) {
      if (todayRef.current === id) setToday(total(payload.points || payload.days || [], null));
    }).catch(function () { if (todayRef.current === id) setToday(null); });
  }

  function saveSeat(next) {
    setSeat(next);
    writeJSON(SEAT_KEY, next);
    try { window.dispatchEvent(new Event("deepseek-usage:seat")); } catch (e) {  }
  }
  function saveFx() {
    var n = Number(fxDraft);
    if (!isFinite(n) || n <= 0) { setFxDraft(String(fx)); setFxEdit(false); return; }
    writeJSON(RATES_KEY, { ...(readRates() || { schema: 2, models: {} }), schema: 2, usdToCny: n });
    setFx(n); setFxEdit(false); notifySource(); loadView(true); loadToday(true);
  }
  function patchSeat(key, patch) {
    var next = {};
    next.order = seatOrder(seat);
    next.order.forEach(function (k) {
      next[k] = Object.assign({}, seat[k]);
    });
    Object.keys(patch).forEach(function (k) { next[key][k] = patch[k]; });
    saveSeat(next);
  }
  function moveSeat(key, delta) {
    var order = seatOrder(seat);
    var i = order.indexOf(key); var j = i + delta;
    if (j < 0 || j >= order.length) return;
    order[i] = order[j]; order[j] = key;
    saveSeat(Object.assign({}, seat, { order: order }));
  }
  function dropSeat(key) {
    var order = seatOrder(seat).filter(function (k) { return k !== drag; });
    if (!drag || drag === key) { setDrag(""); return; }
    var at = order.indexOf(key);
    order.splice(at < 0 ? order.length : at, 0, drag);
    saveSeat(Object.assign({}, seat, { order: order }));
    setDrag("");
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
        var scale = Math.max(size / img.width, size / img.height);
        var w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        if (img.width !== img.height) window.alert("图片不是正方形（" + img.width + "×" + img.height + "），已自动居中裁切为 64×64");
        patchSeat(key, { img: canvas.toDataURL("image/png") });
        setOpen("settings:seat");
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
  var models = modelsOf(page === "calendar" ? calDaysAll : days);
  var cm = models.slice().sort(function (a, b) { return (b.cost || 0) - (a.cost || 0); });
  var sums = total(days, sel);
  var balance = ((page === "calendar" ? cal && cal.balance : data && data.balance) || {});
  var win = range === "custom" && custom ? { from: custom.from, to: custom.to } : null;
  if (!win) {
    var w = rangeDates(range);
    win = { from: iso(w.from), to: iso(w.to) };
  }
  var rangeText = mdShort(win.from) + " ~ " + mdShort(win.to);

  var seatCfg = seat;
  var snap = seatOrder(seatCfg).filter(function (k) { return seatCfg[k] && seatCfg[k].on; }).map(function (k) {
    var m = seatCfg[k] || defaultSeat[k];
    var value = seatValue(today, k);
    return { k: k, m: m, label: String(m.label || ""), value: value };
  });

  var settingsOpen = open.indexOf("settings") === 0 || open.indexOf("icon:") === 0 || open.indexOf("seaticon:") === 0;

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
      snap.length ? jsx("div", { className: "d-header-snapshot", "aria-label": "用量摘要", style: { gap: 16 }, children: snap.map(function (s) {
        return jsxs("span", { className: "d-snap-item", style: { display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }, children: [
          s.m && (s.m.img || s.m.icon) ? jsx("span", { className: "d-snap-ico", "aria-hidden": "true", style: { display: "inline-flex", color: "var(--d-accent)" }, children: s.m.img ? jsx("img", { src: s.m.img, alt: "", style: { width: 16, height: 16, borderRadius: 3, objectFit: "cover", display: "block" } }) : svg(ICONS[s.m.icon] || ICONS.layers, 14) }) : null,
          s.label ? jsx("span", { className: "d-snap-label", style: { color: "var(--d-muted)", fontSize: 13 }, children: s.label }) : null,
          jsx("b", { className: "d-snap-val", style: { fontWeight: 600, fontSize: 13, fontVariantNumeric: "tabular-nums" }, children: s.value }),
        ] }, s.k);
      }) }) : null,
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
                onClick: function () { setOpen(settingsOpen ? "" : "settings:appearance"); },
                children: svg(P.settings, 16),
              }),
              settingsOpen ? jsxs("div", {
                className: "d-settings-panel" + (open.indexOf("settings:") === 0 ? " d-settings-tab-" + open.slice(9) : ""),
                role: "dialog",
                "aria-label": "显示设置",
                children: [
                  jsxs("div", { className: "d-settings-nav", children: [["appearance", "外观"], ["seat", "侧边栏标签"], ["pricing", "定价"], ["refresh", "自动刷新"]].map(function (i) { return jsx("button", { type: "button", className: "d-settings-nav-item", onClick: function () { setOpen("settings:" + i[0]); }, children: i[1] }, i[0]); }) }),
                   jsxs("div", { className: "d-settings-group d-settings-appearance", children: [
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
                    jsxs("span", { className: "d-settings-label", children: "侧边栏标签" }),
                    jsx("div", { className: "d-display-pref-list", children: seatOrder(seat).map(function (key) {
                      return { tokens: ["tokens", "Tokens", "Token 数"], requests: ["requests", "API 请求次数", "请求数"], spend: ["spend", "消费金额", "消费"] }[key];
                    }).map(function (row) {
                      var key = row[0];
                      var m = seat[key];
                      return jsxs("div", {
                        className: "d-display-pref-row" + (drag === key ? " d-dragging" : ""),
                        onDragOver: function (e) { if (drag) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } },
                        onDrop: function (e) { e.preventDefault(); dropSeat(key); },
                        children: [
                          jsx("span", {
                            className: "d-drag-handle",
                            draggable: "true",
                            role: "button",
                            tabIndex: 0,
                            "aria-label": "拖动排序" + row[1],
                            title: "拖动排序；聚焦后可用 ↑ ↓",
                            onDragStart: function (e) { setDrag(key); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", key); },
                            onDragEnd: function () { setDrag(""); },
                            onKeyDown: function (e) { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); moveSeat(key, e.key === "ArrowUp" ? -1 : 1); } },
                          }),
                          jsxs("div", { className: "d-seat-main", children: [
                              jsx("button", {
                                className: "d-metric-icon-picker",
                                type: "button",
                                "aria-label": "更换" + row[1] + "图标",
                                "aria-expanded": open === "seaticon:" + key ? "true" : "false",
                                title: "更换图标 / 上传",
                                onClick: function () { setOpen(open === "seaticon:" + key ? "" : "seaticon:" + key); },
                                children: jsx("span", { className: "d-pref-glyph", "data-metric-icon": key, children: seatGlyph(m, 16) || "无" }),
                              }),
                            jsx("b", { className: "d-seat-preview-value", children: seatValue(today, key) }),
                            jsx("input", {
                              className: "d-seat-label-input",
                              type: "text",
                              maxLength: 8,
                              value: m.label,
                              title: row[1],
                              "aria-label": row[1] + "显示文案",
                              placeholder: defaultSeat[key].label,
                              onChange: function (e) { patchSeat(key, { label: e.target.value }); },
                            }),
                          ] }),
                          jsx("label", { className: "d-settings-toggle", children: [
                            jsx("input", { type: "checkbox", checked: m.on, onChange: function () { patchSeat(key, { on: !m.on }); } }),
                            jsx("span", { className: "d-toggle-track", "aria-hidden": "true" }),
                          ] }),
                          open === "seaticon:" + key ? jsx("div", {
                            className: "d-icon-choice-panel d-icon-choice-inline",
                            "aria-label": "选择" + row[1] + "图标",
                            children: [jsx("button", {
                              type: "button",
                              className: "d-icon-choice",
                              "aria-pressed": !m.icon && !m.img ? "true" : "false",
                              title: "不显示图标",
                              "aria-label": "不显示图标",
                              style: { fontSize: 12 },
                              onClick: function () { patchSeat(key, { icon: "", img: "" }); setOpen("settings:seat"); },
                              children: "无",
                            }, "noicon"), jsx("button", {
                              type: "button",
                              className: "d-icon-choice",
                              "aria-pressed": m.icon === defaultSeat[key].icon && !m.img ? "true" : "false",
                              title: "使用默认图标",
                              "aria-label": "使用默认图标",
                              style: { fontSize: 12 },
                              onClick: function () { patchSeat(key, { icon: defaultSeat[key].icon, img: "" }); setOpen("settings:seat"); },
                              children: "默认",
                            }, "none")].concat(ICON_KEYS.map(function (name) {
                              return jsx("button", {
                                type: "button",
                                className: "d-icon-choice",
                                "aria-pressed": m.icon === name && !m.img ? "true" : "false",
                                title: ICON_LABELS[name],
                                "aria-label": ICON_LABELS[name],
                                onClick: function () { patchSeat(key, { icon: name, img: "" }); setOpen("settings:seat"); },
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
                                onClick: function () { patchSeat(key, { img: "" }); setOpen("settings:seat"); },
                                children: "×",
                              }, "clear") : null,
                            ]),
                          }) : null,
                        ],
                      }, key);
                    }) }),
                  ] }),
                  jsxs("div", { className: "d-settings-group", children: [
                    jsxs("div", { className: "d-fx-heading d-settings-pricing", children: [
                      jsx("span", { className: "d-settings-label", children: "汇率配置" }),
                    ] }),
                    jsxs("div", { className: "d-fx-row", children: [
                      jsx("span", { className: "d-fx-label", children: "1 USD =" }),
                      fxEdit ? jsx("input", {
                        className: "d-fx-input", type: "number", min: "0.01", step: "0.01", autoFocus: true,
                        value: fxDraft, "aria-label": "USD 兑 CNY 汇率",
                        onChange: function (e) { setFxDraft(e.target.value); },
                        onBlur: saveFx,
                         onKeyDown: function(e){if(e.key==="Enter")e.currentTarget.blur();},
                      }) : jsx("button", { type: "button", className: "d-fx-btn", onClick: function () { setFxDraft(String(fx)); setFxEdit(true); }, title: "点击修改汇率", children: fx }),
                       jsx("span", { className: "d-fx-unit", children: "CNY" }),
                      null,
                      null,
                    ] }),
                    jsx("small", { className: "d-rate-description", children: "配置模型定价" }),
                    jsx("button", {
                      type: "button",
                      className: "d-rate-open",
                      onClick: function () { setOpen("rates"); },
                      children: "管理定价…",
                    }),
                  ] }),
                  jsxs("div", { className: "d-settings-group", children: [
                    jsxs("label", { className: "d-settings-toggle d-refresh-toggle", children: [
                      jsx("span", { className: "d-toggle-text", children: "启用自动刷新" }),
                      jsx("input", { type: "checkbox", checked: auto, onChange: function (e) { setAuto(e.target.checked); writeJSON("deepseekUsageAutoRefresh", e.target.checked); } }),
                      jsx("span", { className: "d-toggle-track", "aria-hidden": "true" }),
                    ] }),
                    jsxs("label", { className: "d-refresh-row", children: [
                      jsx("span", { className: "d-toggle-text", children: "自动刷新间隔" }),
                      jsx("select", {
                        className: "d-settings-select",
                        "aria-label": "自动刷新间隔",
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
    var summary = sel === null ? "全部模型" : sel.length === 0 ? "未选择模型" : sel[0];
    var summaryTitle = sel === null
      ? "全部模型（共 " + models.length + " 个）· 点击按名称多选"
      : sel.length === 0
        ? "未选择模型"
        : sel.slice(0, 10).join("、") + (sel.length > 10 ? " 等 " + sel.length + " 个模型" : "");
    return jsxs("div", {
      className: "d-model-field",
      "data-pop": "1",
      children: [
        jsxs("div", { className: "d-model-control" + (open === key ? " d-open" : ""), children: [
          jsxs("button", {
            className: "d-model-btn" + (sel === null ? "" : " d-has-reset"),
            type: "button",
            "aria-expanded": open === key ? "true" : "false",
            title: summaryTitle,
            "aria-label": "模型筛选：" + summaryTitle,
            onClick: function () { setOpen(open === key ? "" : key); },
            children: [
              svg(P.box, 14, "d-lead"),
              jsx("b", { children: jsx("span", { className: "d-model-summary-name", children: summary }) }),
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
              title: m.model,
              "aria-selected": on ? "true" : "false",
              "aria-label": m.model,
              onClick: function () {
                var next = sel === null ? models.map(function (x) { return x.model; }) : sel.slice();
                next = on ? next.filter(function (x) { return x !== m.model; }) : next.concat([m.model]);
                setSel(next.length === models.length ? null : next);
              },
              children: [
                jsx("span", { className: "d-model-check", children: on ? "✓" : "" }),
                jsx("span", { className: "d-swatch", style: { background: AI[i % AI.length] } }),
                jsx("span", { className: "d-model-name", children: m.model }),
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
      jsx(Metric, { id: "tokens", icon: CARD_ICONS.tokens, label: "Tokens", value: fmtTokens(sums.tokens), caption: (mode === "local" ? "本地" : "官方统计") + " · 命中 " + hitRate + "%", title: "输入与输出 Token 合计，命中率 = 缓存命中 / 输入" }),
      jsx(Metric, mode === "local"
        ? {
          id: "spend",
          icon: CARD_ICONS.spend,
          label: "消费金额",
          value: localMoney(sums, fxNow),
          unit: "CNY",
          caption: sums.unpricedTokens > 0 ? "部分模型未定价 · 按已覆盖部分估算" : "按当前费率估算",
          title: "本地费用按当前定价估算，官方账单仍是最终口径",
        }
        : { id: "spend", icon: CARD_ICONS.spend, label: "消费金额", value: fmtMoney(sums.cost), unit: "CNY", caption: cap, title: "当前统计范围的消费金额" }),
      jsx(Metric, { id: "requests", icon: CARD_ICONS.requests, label: "API 请求次数", value: fmtInt(sums.requests), unit: "次", caption: mode === "local" ? "本地会话日志" : "官方请求统计", title: "当前统计范围的 API 请求次数" }),
      jsx(Metric, balance && typeof balance.total === "number"
        ? { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: fmtMoney(balance.total), unit: balance.currency || "CNY", caption: "官方账户余额", title: "余额数据来自 DeepSeek 官方 API" }
        : { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: "—", unit: "", caption: "未读取到官方余额", title: "官方未返回余额" }),
    ];
    return jsxs("section", { className: "d-metrics", "aria-label": "用量指标", children: seatOrder(seat).concat(mode === "local" ? [] : ["balance"]).map(function (key) { var c = cards.filter(function (c) { return c.props.id === key; })[0]; return jsx(Metric, Object.assign({}, c.props, { glyph: key === "balance" ? icon(CARD_ICONS.balance, 16) : seatGlyph(seat[key], 16) }), key); }) });
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
            if (open !== "range") { var w = rangeDates(range); var d = custom || { from: iso(w.from), to: iso(w.to) }; setTd({ start: d.from, end: d.to, custom: range === "custom", view: { year: Number(d.from.slice(0, 4)), month: Number(d.from.slice(5, 7)) } }); }
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
                className: !td.custom && range === r.k ? "d-active" : "",
                onClick: function () { setRange(r.k); setCustom(null); setOpen(""); },
                children: r.l,
              }, r.k);
            }).concat([
              jsx("button", {
                type: "button",
                className: td.custom ? "d-active" : "",
                onClick: function () { setTd(function (p) { return { start: p.custom ? p.start : null, end: p.custom ? p.end : null, custom: true, view: p.view }; }); },
                children: "自定义",
              }, "custom"),
            ]) }),
            td.custom ? jsxs("div", { children: [
              jsxs("div", { className: "d-td-cal-head", children: [
                jsx("button", {
                  className: "d-icon-btn",
                  type: "button",
                  "aria-label": "上一月",
                  onClick: function () { setTd(function (p) { return { start: p.start, end: p.end, custom: p.custom, view: { year: p.view.month === 1 ? p.view.year - 1 : p.view.year, month: p.view.month === 1 ? 12 : p.view.month - 1 } }; }); },
                  children: svg(P.left, 14),
                }),
                jsx("span", { className: "d-td-cal-title", children: td.view.year + "年" + td.view.month + "月" }),
                jsx("button", {
                  className: "d-icon-btn",
                  type: "button",
                  "aria-label": "下一月",
                  onClick: function () { setTd(function (p) { return { start: p.start, end: p.end, custom: p.custom, view: { year: p.view.month === 12 ? p.view.year + 1 : p.view.year, month: p.view.month === 12 ? 1 : p.view.month + 1 } }; }); },
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
                  var startPoint = td.start && date === td.start;
                  var endPoint = td.start && date === (td.end || td.start);
                  nodes.push(jsx("button", {
                    type: "button",
                    className: "d-td-day" + (inRange ? " d-in-range" : "") + (startPoint ? " d-range-start" : "") + (endPoint ? " d-range-end" : ""),
                    onClick: function (day, dateStr) {
                      return function () {
                        setTd(function (p) {
                          if (!p.start || p.end) return { start: dateStr, end: null, custom: p.custom, view: p.view };
                          return { start: dateStr < p.start ? dateStr : p.start, end: dateStr < p.start ? p.start : dateStr, custom: p.custom, view: p.view };
                        });
                      };
                    }(d, date),
                    children: d,
                  }, date));
                }
                return nodes;
              })() }),
            ] }) : null,
          ] }),
          td.custom ? jsxs("div", { className: "d-td-foot", children: [
            jsx("span", { children: td.start ? mdShort(td.start) + (td.end ? " ~ " + mdShort(td.end) : " ~ 选择结束日") : "选择开始日期" }),
            jsx("button", {
              className: "d-btn d-btn-primary d-btn-sm",
              type: "button",
              disabled: !td.start,
              onClick: function () { setRange("custom"); setCustom({ from: td.start, to: td.end || td.start }); setOpen(""); },
              children: "应用日期",
            }),
          ] }) : null,
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
      jsxs("section", { className: "d-chart-section", "aria-label": "各模型消费金额", children: [
        jsxs("div", { className: "d-chart-heading", children: [
          jsxs("h2", { children: [icon(CARD_ICONS.spend, 16), jsx("span", { children: "各模型消费金额" })] }),
          jsxs("span", { className: "d-granularity-tag", children: [svg(ICONS.clock, 12), jsx("span", { children: hourly ? "按小时" : "按日" })] }),
        ] }),
        jsx(StackedChart, { days: days, models: cm, sel: sel, hourly: hourly, onTip: showTip, metric: "cost" }),
        jsx("div", { className: "d-model-legend", "aria-label": "消费金额模型图例", children: cm.filter(function (m) { return sel === null || sel.indexOf(m.model) >= 0; }).map(function (m, i) {
          return jsx("span", { className: "d-model-legend-item", title: m.model, children: [jsx("i", { style: { background: AI[i % AI.length] } }), jsx("span", { children: m.model })] }, m.model);
        }) }),
        jsx("div", { className: "d-legend d-legend-end", style: { justifyContent: "flex-end" }, children: jsx("span", { className: "d-chart-total", children: (mode === "local" ? localMoney(sums, fxNow) : fmtMoney(sums.cost)) + " CNY" }) }),
      ] }),
      jsxs("div", { className: "d-mini-chart-grid", children: [
        jsx(MiniRequests, { days: days, sel: sel, models: models, hourly: hourly, onTip: showTip }),
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
  var currentMonth = todayIso.slice(0, 7);
  var calScope, calCap;
  var billWord = mode === "local" ? "本地用量" : "官方账单";
  if (dim === "day") {
    calScope = calDays.filter(function (d) { return d.date === todayIso; });
    calCap = "今日" + billWord;
  } else if (dim === "week") {
    var wFrom = iso(weekStart);
    calScope = calDays.filter(function (d) { return d.date >= wFrom && d.date <= todayIso; });
    calCap = "本周" + billWord;
  } else {
    calScope = calDays.filter(function (d) { return d.date.slice(0, 7) === currentMonth; });
    calCap = "本月" + billWord;
  }
  var calSums = aggDays(calScope, sel);

  function openDay(date) {
    var day = calDays.filter(function (d) { return d.date === date; })[0];
    if (!day) return;
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
        onClick: function () { setTip(null); setOpen(""); setDetail({ title: label, eyebrow: "月详情", day: aggDays(x.days, sel) }); },
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
          return jsx("button", { type: "button", "aria-pressed": dim === row[0] ? "true" : "false", onClick: function () { setDim(row[0]); }, children: row[1] }, row[0]);
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
      ["消费金额", mode === "local" ? localMoney(detail.day, fxNow) : fmtMoney(detail.day.cost)],
      ["API 请求次数", fmtInt(detail.day.requests) + " 次"],
      ["输入（命中缓存）", fmtInt(detail.day.hit)],
      ["输入（未命中缓存）", fmtInt(detail.day.miss)],
      ["输出", fmtInt(detail.day.output)],
      ["Token 合计", fmtInt(detail.day.tokens || (detail.day.hit || 0) + (detail.day.miss || 0) + (detail.day.cacheWrite || 0) + (detail.day.output || 0))]
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
              style: { left: tip.x, top: tip.y },
              children: jsx(TipCard, { data: tip.data }),
            }) : null,
          ],
        }),
      }),
      open === "rates" ? jsx(RateDialog, {
        rates: readRates(),
        onClose: function () { setOpen("settings:pricing"); },
        onSave: function (rates, stay) {
          writeJSON(RATES_KEY, rates);
          if (rates && Number(rates.usdToCny) > 0) setFx(Number(rates.usdToCny));
          if (!stay) setOpen("");
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
              return jsxs("li", { children: [jsx("span", { children: m.model }), jsx("span", { children: mode === "local" ? localMoney(m, fxNow) + " · " + fmtInt(m.requests) + " 次" : fmtMoney(m.cost) + " · " + fmtInt(m.requests) + " 次" })] }, m.model);
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
  var lastGoodS = useRef(null);
  var revisionS = useState(0); var revision = revisionS[0];
  var wide = props.wide !== false;
  useEffect(function () { injectStyles(); }, []);
  useEffect(function () {
    function sync() { setCfg(readSeat()); }
    window.addEventListener("deepseek-usage:seat", sync);
    return function () { window.removeEventListener("deepseek-usage:seat", sync); };
  }, []);
  useEffect(function () {
    function sync() { setMode(readSourceMode()); revisionS[1](function (n) { return n + 1; }); }
    window.addEventListener("deepseek-usage:source", sync);
    return function () { window.removeEventListener("deepseek-usage:source", sync); };
  }, []);
  useEffect(function () {
    var alive = true;
    setToday(null);
    lastGoodS.current = null;
    function pull() {
      var path = mode === "local"
        ? "/local?range=today&tz=" + TZ + "&scope=all" + ratesParam()
        : "/official?range=today&tz=" + TZ;
      getJSON(path + "&force=1").then(function (payload) {
        if (!alive) return;
        var rows = (payload.points && payload.points.length ? payload.points : payload.days) || [];
        var t = total(rows, null);
        var date = rows.length ? rows[rows.length - 1].date : "";
        var good = t.tokens || t.requests || t.cost;
        var prev = lastGoodS.current;
        if (good) lastGoodS.current = { t: t, date: date };
        if (good || !prev || !date || prev.date === date) setToday(good ? t : (prev ? prev.t : t));
        else { lastGoodS.current = { t: t, date: date }; setToday(t); }
      }).catch(function () { if (alive && !lastGoodS.current) setToday(null); });
    }
    pull();
    var timer = window.setInterval(pull, 120000);
    function wake() { if (!document.hidden) pull(); }
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return function () { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", wake); window.removeEventListener("focus", wake); };
  }, [mode, revision]);
  var order = seatOrder(cfg);
  var enabled = order.filter(function (k) { return cfg[k] && cfg[k].on; });
  var items = enabled.map(function (k) {
    var m = cfg[k] || defaultSeat[k];
    var value = seatValue(today, k);
    var glyph = seatGlyph(m, 16);
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
        "aria-label": mode === "local" ? "DeepSeek Usage 本地用量" : "DeepSeek Usage 用量与余额",
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
