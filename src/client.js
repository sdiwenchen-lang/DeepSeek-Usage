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
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(Math.round(v));
}
function fmtInt(n) {
  return (Number(n) || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 });
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
    return { days: days, balance: {}, granularity: payload.granularity || "day", local: payload };
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

var CARD_ICONS = { tokens: "layers", spend: "yen", requests: "activity", balance: "wallet" };
var SEAT_KEY = "deepseekUsageSeat";
var defaultSeat = {
  tokens: { on: true, label: "用量", icon: "layers", img: "" },
  requests: { on: false, label: "请求", icon: "activity", img: "" },
  spend: { on: false, label: "消费", icon: "yen", img: "" },
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
    out[k] = {
      on: row.on === undefined ? base.on : !!row.on,
      label: row.label === undefined ? base.label : String(row.label).slice(0, 8),
      icon: row.icon || base.icon,
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

function ReconcileStrip(props) {
  var recon = props.recon;
  if (!recon || recon.ok === false) return null;
  var official = recon.official || {};
  var local = recon.local || {};
  var coverage = recon.coverage === null || recon.coverage === undefined ? "—" : (recon.coverage * 100).toFixed(1) + "%";
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
          jsx("button", { type: "button", onClick: props.onToggle, children: props.open ? "收起" : "查看明细" }),
        ],
      }),
      props.open ? jsxs("div", {
        className: "d-recon-panel",
        children: [
          jsxs("div", {
            className: "d-recon-row d-recon-head",
            children: ["日期", "官方", "本地"].map(function (label) {
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
  var compact = props.compact; var saved = props.rates; var fxTouched = useRef(false);
  var rowsS = useState(saved ? saved.models : {}); var rows = rowsS[0]; var setRows = rowsS[1];
  var baseS = useState(null); var base = baseS[0]; var setBase = baseS[1];
  var fxS = useState(saved && saved.usdToCny > 0 ? String(saved.usdToCny) : String(DEFAULT_FX)); var fx = fxS[0]; var setFx = fxS[1];
  var searchS = useState(""); var search = searchS[0]; var setSearch = searchS[1];
  var pageS = useState(0); var page = pageS[0]; var setPage = pageS[1];
  var editS = useState(""); var edit = editS[0]; var setEdit = editS[1];
  var errorS = useState(""); var error = errorS[0]; var setError = errorS[1];
  useEffect(function () {
    var alive = true;
    getJSON("/pricing").then(function (p) {
      if (!alive) return;
      setBase(p);
      if (!fxTouched.current && !(saved && saved.usdToCny > 0)) setFx(String(p.usdToCny > 0 ? p.usdToCny : DEFAULT_FX));
    }).catch(function () { if (alive) setError("默认费率加载失败，请关闭后重试。"); });
    return function () { alive = false; };
  }, []);
  var defaults = base && base.models || {};
  var names = base && base.names || {};
  var fields = ["input", "output", "cacheRead", "cacheWrite"];
  var labels = ["输入", "输出", "缓存命中", "缓存写入"];
  var keys = Object.keys(Object.assign({}, defaults, rows)).sort().filter(function (k) { return k.toLowerCase().indexOf(search.toLowerCase()) >= 0; });
  var pageSize = 20;
  var pages = Math.max(1, Math.ceil(keys.length / pageSize));
  var current = Math.min(page, pages - 1);
  var visible = keys.slice(current * pageSize, current * pageSize + pageSize);
  function patch(key, field, value) {
    setRows(function (prev) {
      var next = Object.assign({}, prev);
      next[key] = Object.assign({}, defaults[key] || { input: "", output: "", cacheRead: "", cacheWrite: "" }, prev[key]);
      next[key][field] = value;
      return next;
    });
    setError("");
  }
  function add(event) {
    var inputs = event.currentTarget.parentNode.querySelectorAll("input");
    var key = inputs[0].value.trim();
    if (!key || ["__proto__", "constructor", "prototype"].indexOf(key) >= 0) { setError("模型标识无效。"); return; }
    if (defaults[key] || rows[key]) { setError("这个模型已存在，可直接编辑对应单价。"); return; }
    var row = {};
    fields.forEach(function (field, i) { row[field] = Number(inputs[i + 1].value) || 0; });
    var next = Object.assign({}, rows); next[key] = row; setRows(next);
    setSearch(key); setError("");
  }
  function save() {
    if (fx.trim() && (!isFinite(Number(fx)) || Number(fx) <= 0)) { setError("汇率必须是大于 0 的数字。"); return; }
    var models = {}; var invalid = "";
    Object.keys(rows).forEach(function (key) {
      var row = {}; var equal = !!defaults[key];
      fields.forEach(function (field) {
        var raw = rows[key][field]; var n = Number(raw);
        if (raw === "" || raw == null || !isFinite(n) || n < 0) invalid = key + "：四项费率都必须填写非负数字。";
        row[field] = n;
        if (!defaults[key] || n !== defaults[key][field]) equal = false;
      });
      if (!equal) models[key] = row;
    });
    if (invalid) { setError(invalid); return; }
    props.onSave({ schema: 2, usdToCny: fx.trim() ? Number(fx) : DEFAULT_FX, models: models });
  }
  return jsx("div", { className: "d-dialog-backdrop", onMouseDown: function (e) { if (e.target === e.currentTarget) props.onClose(); }, children: jsxs("section", {
    className: "d-detail-dialog d-rate-dialog" + (compact ? " d-rate-dialog-fx" : ""), role: "dialog", "aria-modal": "true", "aria-label": compact ? "汇率" : "定价",
    children: [
      jsxs("div", { className: "d-dialog-title-row", children: [jsx("h2", { children: compact ? "汇率" : "定价" }), jsx("button", { type: "button", className: "d-icon-btn", "aria-label": compact ? "关闭汇率" : "关闭定价", onClick: props.onClose, children: svg(P.close, 16) })] }),
      jsxs("label", { className: "d-rate-fx", children: [jsx("span", { children: "汇率" }), jsx("span", { children: "1 USD =" }), jsx("input", { type: "number", min: "0", step: "any", placeholder: "6.7", value: fx, onChange: function (e) { fxTouched.current = true; setFx(e.target.value); setError(""); }, "aria-label": "美元兑人民币汇率" }), jsx("span", { children: "CNY" }), jsx("small", { children: "默认 6.7" })] }),
      compact ? null : jsxs("div", { className: "d-rate-search", children: [jsx("input", { type: "search", placeholder: "搜索模型或模型标识", "aria-label": "搜索模型费率", value: search, onChange: function (e) { setSearch(e.target.value); setPage(0); setEdit(""); } }), jsx("span", { children: search ? keys.length + " 条匹配" : "每页 20 条" })] }),
      error ? jsx("p", { className: "d-rate-error", role: "alert", children: error }) : null,
      !compact && !base && !error ? jsx("p", { role: "status", children: "正在加载默认费率…" }) : null,
      compact ? null : jsx("div", { className: "d-rate-scroll", children: jsxs("table", { className: "d-rate-table", children: [
        jsx("thead", { children: jsx("tr", { children: ["模型", "输入", "输出", "缓存命中", "缓存写入", "操作"].map(function (label, i) { return jsx("th", { scope: "col", children: label }, i); }) }) }),
        jsx("tbody", { children: visible.map(function (key) {
          var row = rows[key] || defaults[key];
          var name = names[key];
          return jsxs("tr", { className: edit === key ? "d-rate-editing" : "", children: [jsx("th", { scope: "row", children: jsxs("span", { className: "d-rate-model", children: [jsx("b", { title: name && name !== key ? name : key, children: name && name !== key ? name : key }), name && name !== key ? jsx("code", { children: key }) : null] }) })].concat(fields.map(function (field, i) {
            return jsx("td", { children: edit === key ? jsx("input", { type: "number", min: "0", step: "any", value: row[field], "aria-label": key + " " + labels[i], onChange: function (e) { patch(key, field, e.target.value); } }) : jsx("span", { className: "d-rate-value", children: row[field] === "" || row[field] == null ? "—" : fmtUsd(row[field]) }) }, field);
          })).concat([jsxs("td", { className: "d-rate-row-actions", children: [
            jsx("button", { type: "button", className: "d-rate-icon", "aria-label": edit === key ? "完成编辑 " + key : "编辑 " + key, title: edit === key ? "完成" : "编辑", onClick: function () { setEdit(edit === key ? "" : key); }, children: edit === key ? "✓" : svg(P.edit, 14) }),
            rows[key] ? jsx("button", { type: "button", className: "d-rate-icon", "aria-label": "恢复 " + key + " 默认费率", title: "恢复默认", onClick: function () { var next = Object.assign({}, rows); delete next[key]; setRows(next); setEdit(""); }, children: svg(P.trash, 14) }) : null,
          ] })]) }, key);
        }) })
      ] }) }),
      compact ? null : jsxs("div", { className: "d-rate-foot", children: [jsx("span", { children: "共 " + keys.length + " 条记录" }), jsxs("span", { className: "d-rate-pager", children: [
        jsx("button", { type: "button", "aria-label": "上一页", disabled: current <= 0, onClick: function () { setPage(current - 1); setEdit(""); }, children: "‹" }),
        jsx("b", { children: (current + 1) + " / " + pages }),
        jsx("button", { type: "button", "aria-label": "下一页", disabled: current >= pages - 1, onClick: function () { setPage(current + 1); setEdit(""); }, children: "›" }),
      ] })] }),
      compact ? null : jsxs("div", { className: "d-rate-add-area", children: [
        jsxs("details", { className: "d-rate-add-details", children: [
          jsx("summary", { children: [jsx("span", { "aria-hidden": "true", children: "+" }), "新增模型"] }),
          jsxs("div", { className: "d-rate-add-form", children: [
            jsx("input", { className: "d-rate-new-name", placeholder: "模型标识", "aria-label": "新增模型标识" }),
            fields.map(function (field, i) { return jsx("label", { children: [jsx("span", { children: labels[i] }), jsx("input", { type: "number", min: "0", step: "any", placeholder: "0" })] }, field); }),
            jsx("button", { type: "button", className: "d-rate-add-confirm", onClick: add, children: ["+", "添加"] }),
          ] }),
        ] }),
        jsx("button", { type: "button", className: "d-rate-reset", disabled: !base, onClick: function () { setRows({}); setError(""); setEdit(""); }, children: "恢复默认费率" }),
      ] }),
      jsxs("div", { className: "d-rate-actions", children: [jsx("button", { type: "button", onClick: props.onClose, children: "取消" }), jsx("button", { type: "button", disabled: !compact && !base, className: "d-rate-save", onClick: save, children: compact ? "保存" : "保存费率" })] })
    ]
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
  var fxNow = (readRates() || {}).usdToCny || DEFAULT_FX;

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
  var reconS = st(null); var recon = reconS[0]; var setRecon = reconS[1];
  var reconOpenS = st(false); var reconOpen = reconOpenS[0]; var setReconOpen = reconOpenS[1];
  var localAvailS = st(true); var localAvail = localAvailS[0]; var setLocalAvail = localAvailS[1];
  var reconRef = useRef(0);

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
    getJSON("/reconcile?" + query + "&tz=" + TZ + "&scope=deepseek" + ratesParam()).then(function (payload) {
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
  var cm = mode === "local" ? models : models.slice().sort(function (a, b) { return (b.cost || 0) - (a.cost || 0); });
  var sums = total(days, sel);
  var balance = mode === "local" ? (localBalance || {}) : (((page === "calendar" ? cal && cal.balance : data && data.balance)) || {});
  var win = range === "custom" && custom ? { from: custom.from, to: custom.to } : null;
  if (!win) {
    var w = rangeDates(range);
    win = { from: iso(w.from), to: iso(w.to) };
  }
  var rangeText = mdShort(win.from) + " ~ " + mdShort(win.to);

  var seatCfg = seat;
  var snap = seatOrder(seatCfg).filter(function (k) { return seatCfg[k] && seatCfg[k].on; }).map(function (k) {
    var m = seatCfg[k] || defaultSeat[k];
    var value = !today ? "—" : k === "tokens" ? fmtTokens(today.tokens) : k === "spend" ? (today.cost === null || today.cost === undefined ? "—" : fmtMoney(today.cost)) : fmtInt(today.requests);
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
      snap.length ? jsx("div", { className: "d-header-snapshot", "aria-label": "用量摘要", style: { gap: 16 }, children: snap.map(function (s) {
        return jsxs("span", { className: "d-snap-item", style: { display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }, children: [
          jsx("span", { className: "d-snap-ico", "aria-hidden": "true", style: { display: "inline-flex", color: "var(--d-accent)" }, children: s.m && s.m.img ? jsx("img", { src: s.m.img, alt: "", style: { width: 16, height: 16, borderRadius: 3, objectFit: "cover", display: "block" } }) : svg(ICONS[s.m && s.m.icon || "layers"], 14) }),
          jsx("span", { className: "d-snap-label", style: { color: "var(--d-muted)", fontSize: 13 }, children: s.label }),
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
                onClick: function () { setOpen(settingsOpen ? "" : "settings"); },
                children: svg(P.settings, 16),
              }),
              settingsOpen ? jsxs("div", {
                className: "d-settings-panel",
                role: "dialog",
                style: { maxHeight: 620, overflowY: "auto", overscrollBehavior: "contain" },
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
                    jsxs("span", { className: "d-settings-label", children: ["侧边栏标签", jsx("small", { children: "图标、名称与数值一起排序；图片可不上传" })] }),
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
                          jsx("button", {
                            className: "d-metric-icon-picker",
                            type: "button",
                            "aria-label": "更换" + row[1] + "图标",
                            "aria-expanded": open === "seaticon:" + key ? "true" : "false",
                            title: "更换图标 / 上传",
                            onClick: function () { setOpen(open === "seaticon:" + key ? "" : "seaticon:" + key); },
                            children: jsx("span", { className: "d-pref-glyph", "data-metric-icon": key, children: seatGlyph(m, 16) || "无" }),
                          }),
                          jsx("input", {
                            className: "d-seat-label-input",
                            type: "text",
                            maxLength: 8,
                            value: m.label,
                            title: row[1],
                            "aria-label": row[1] + "显示文案",
                            placeholder: row[2],
                            onChange: function (e) { patchSeat(key, { label: e.target.value }); },
                          }),
                          jsx("b", { className: "d-seat-preview-value", children: !today ? "—" : key === "tokens" ? fmtTokens(today.tokens) : key === "spend" ? (today.cost === null || today.cost === undefined ? "—" : fmtMoney(today.cost)) : fmtInt(today.requests) }),
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
                              "aria-pressed": m.icon === defaultSeat[key].icon && !m.img ? "true" : "false",
                              title: "使用默认图标",
                              "aria-label": "使用默认图标",
                              style: { fontSize: 12 },
                              onClick: function () { patchSeat(key, { icon: defaultSeat[key].icon, img: "" }); setOpen("settings"); },
                              children: "默认",
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
                  jsxs("div", { className: "d-settings-group", children: [
                    jsx("span", { className: "d-settings-label", children: "汇率" }),
                    jsxs("div", { className: "d-settings-row", children: [
                      jsx("b", { children: "1 USD = " + fxNow + " CNY" }),
                      jsx("button", { type: "button", className: "d-settings-link", onClick: function () { setOpen("fx"); }, children: "修改" }),
                    ] }),
                  ] }),
                  jsxs("div", { className: "d-settings-group", children: [
                    jsxs("span", { className: "d-settings-label", children: ["定价", jsx("small", { children: "USD / 百万 Tokens · 228 个模型" })] }),
                    jsx("button", {
                      type: "button",
                      className: "d-rate-open",
                      onClick: function () { setOpen("rates"); },
                      children: "管理定价…",
                    }),
                  ] }),
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
          title: "本地费用按当前费率与汇率估算，官方账单仍是最终口径",
        }
        : { id: "spend", icon: CARD_ICONS.spend, label: "消费金额", value: fmtMoney(sums.cost), unit: "CNY", caption: cap, title: "当前统计范围的消费金额" }),
      jsx(Metric, { id: "requests", icon: CARD_ICONS.requests, label: "API 请求次数", value: fmtInt(sums.requests), unit: "次", caption: mode === "local" ? "本地会话日志" : "官方请求统计", title: "当前统计范围的 API 请求次数" }),
      jsx(Metric, mode === "local"
        ? (balance && typeof balance.total === "number"
          ? { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: fmtMoney(balance.total), unit: balance.currency || "CNY", caption: "官方账户余额", title: "余额来自官方账户，和本地日志统计范围无关" }
          : { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: "—", unit: "", caption: "未读取到官方余额", title: "本地聚合不产生余额；需登录官方账户才能显示" })
        : (balance && typeof balance.total === "number"
          ? { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: fmtMoney(balance.total), unit: balance.currency || "CNY", caption: "官方账户余额", title: "余额数据来自 DeepSeek 官方 API" }
          : { id: "balance", icon: CARD_ICONS.balance, label: "余额", value: "—", unit: "", caption: "未读取到官方余额", title: "官方未返回余额" })),
    ];
    return jsxs("section", { className: "d-metrics", "aria-label": "用量指标", children: seatOrder(seat).concat(["balance"]).map(function (key) { var c = cards.filter(function (c) { return c.props.id === key; })[0]; return jsx(Metric, Object.assign({}, c.props, { glyph: key === "balance" ? icon(CARD_ICONS.balance, 16) : seatGlyph(seat[key], 16) }), key); }) });
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
      jsxs("section", { className: "d-chart-section", "aria-label": mode === "local" ? "各模型 Token 用量" : "各模型消费金额", children: [
        jsxs("div", { className: "d-chart-heading", children: [
          jsxs("h2", { children: [svg(P.bars, 16), jsx("span", { children: mode === "local" ? "各模型 Token 用量" : "各模型消费金额" })] }),
          jsxs("span", { className: "d-granularity-tag", children: [svg(ICONS.clock, 12), jsx("span", { children: hourly ? "按小时" : "按日" })] }),
        ] }),
        jsx(StackedChart, { days: days, models: cm, sel: sel, hourly: hourly, onTip: showTip, metric: mode === "local" ? "tokens" : "cost" }),
        jsx("div", { className: "d-model-legend", "aria-label": "模型图例", children: cm.filter(function (m) { return sel === null || sel.indexOf(m.model) >= 0; }).map(function (m, i) {
          return jsx("span", { className: "d-model-legend-item", title: m.model, children: [jsx("i", { style: { background: AI[i % AI.length] } }), jsx("span", { children: m.model })] }, m.model);
        }) }),
        jsx("div", { className: "d-legend d-legend-end", style: { justifyContent: "flex-end" }, children: jsx("span", { className: "d-chart-total", children: mode === "local" ? fmtTokens(sums.tokens) + " Tokens" : fmtMoney(sums.cost) + " CNY" }) }),
      ] }),
      mode === "local" ? jsx(ReconcileStrip, { recon: recon, open: reconOpen, onToggle: function () { setReconOpen(!reconOpen); } }) : null,
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
      open === "rates" || open === "fx" ? jsx(RateDialog, {
        rates: readRates(),
        compact: open === "fx",
        onClose: function () { setOpen(""); },
        onSave: function (rates) {
          writeJSON(RATES_KEY, rates);
          setOpen("");
          notifySource();
          loadView(true);
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
    function pull() {
      var path = mode === "local"
        ? "/local?range=today&tz=" + TZ + "&scope=all" + ratesParam()
        : "/official?range=today&tz=" + TZ;
      getJSON(path).then(function (payload) {
        if (!alive) return;
        var t = total(payload.points || payload.days || [], null);
        setToday(t);
      }).catch(function () { if (alive) setToday(null); });
    }
    pull();
    var timer = window.setInterval(pull, 120000);
    return function () { alive = false; window.clearInterval(timer); };
  }, [mode, revision]);
  var order = seatOrder(cfg);
  var enabled = order.filter(function (k) { return cfg[k] && cfg[k].on; });
  var items = enabled.map(function (k) {
    var m = cfg[k] || defaultSeat[k];
    var value = !today ? "—" : k === "tokens" ? fmtTokens(today.tokens) : k === "spend" ? (today.cost === null || today.cost === undefined ? "—" : fmtMoney(today.cost)) : fmtInt(today.requests);
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
