/**
 * 从 UI 稿 deepseek-usage-popup 2.html 生成 src/panel.css。
 *
 * 稿子是一张独立页面（全局 :root / body / * reset），插件却把样式表注入宿主
 * 文档里，所以这里做三件事：
 *   1. 所有规则收进 .d-usage 作用域，不再有全局 reset；
 *   2. 类名与自定义属性统一加 d- 前缀，避免与 DSH 自己的类名/变量撞车；
 *   3. 补上插件独有的外壳（遮罩层）与状态栏席位布局。
 *
 * 用法：node scripts/build-panel-css.mjs [参考稿路径]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = process.argv[2] ?? join(ROOT, "deepseek-usage-popup 2.html");
const OUT = join(ROOT, "src", "panel.css");

const html = readFileSync(SOURCE, "utf8");
const style = /<style>([\s\S]*?)<\/style>/.exec(html);
if (!style) throw new Error(`no <style> block in ${SOURCE}`);

const KEYFRAMES = ["spin-refresh", "panel-in", "cell-in", "bar-rise", "page-in", "mini-chart-in", "period-dot-pulse"];

/* 自定义属性：先从 :root 里收集名字，再全局改名，避免误伤 --webkit 之类 */
function tokenNames(css) {
  const names = new Set();
  const block = /:root\s*\{([\s\S]*?)\n\s{4}\}/.exec(css);
  if (block) for (const m of block[1].matchAll(/(--[a-z0-9-]+)\s*:/g)) names.add(m[1]);
  for (const m of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) names.add(m[1]);
  names.add("--swatch");
  return names;
}

function renameTokens(css, names) {
  return css.replace(/--([a-z][a-z0-9-]*)/g, (all, name) => {
    if (all.startsWith("--d-")) return all;
    return names.has("--" + name) ? "--d-" + name : all;
  });
}

function renameClasses(css) {
  return css
    .replace(/\.([a-zA-Z][\w-]*)/g, ".d-$1")
    .replace(/#pageDetail/g, ".d-page-detail")
    .replace(/#pageCalendar/g, ".d-page-calendar");
}

function renameKeyframes(css) {
  let out = css;
  for (const name of KEYFRAMES) {
    out = out.replace(new RegExp(`@keyframes\\s+${name}\\b`, "g"), `@keyframes d-${name}`);
    out = out.replace(new RegExp(`(animation(?:-name)?\\s*:\\s*)([^;}]*?)\\b${name}\\b`, "g"), `$1$2 d-${name}`);
  }
  return out;
}

/** 逐个选择器加作用域前缀；body → .d-usage，html 丢弃。 */
function scopeSelector(raw) {
  let s = raw.trim();
  if (!s) return null;
  if (s === "*" || s === "*::before" || s === "*::after") return `.d-usage ${s}`;
  if (/^html\b/.test(s)) return null;
  if (/^body\b/.test(s)) s = s.replace(/^body/, ".d-usage");
  else if (/^:root\b/.test(s)) s = s.replace(/^:root/, ".d-usage");
  else if (/^\[data-theme/.test(s)) s = ".d-usage" + s;
  else if (/^:focus-visible/.test(s)) s = ".d-usage " + s;
  else s = ".d-usage " + s;
  return s;
}

function splitSelectors(prelude, ancestor) {
  return prelude
    .split(",")
    .map(scopeSelector)
    .filter(Boolean)
    .map((s) => (ancestor ? ancestor + " " + s : s))
    .join(",\n");
}

function transformRules(css, ancestor) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    // 跳过空白与注释
    const rest = css.slice(i);
    const head = /^(\s*|\/\*[\s\S]*?\*\/\s*)*/.exec(rest)[0];
    i += head.length;
    if (i >= css.length) break;
    const open = css.indexOf("{", i);
    const semi = css.indexOf(";", i);
    if (open < 0) break;
    if (semi >= 0 && semi < open) {
      // 顶层语句（@charset 之类）直接丢掉
      i = semi + 1;
      continue;
    }
    let depth = 0;
    let end = -1;
    for (let j = open; j < css.length; j += 1) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end < 0) break;
    const prelude = css.slice(i, open).trim();
    const body = css.slice(open + 1, end);
    i = end + 1;

    if (/^@(media|supports|layer)/.test(prelude)) {
      const inner = transformRules(body, ancestor);
      out.push(`${prelude} {\n${inner}\n}`);
      // 宿主可能用 [data-theme="dark"] 而不是系统深色：同一套令牌再发一份
      if (!ancestor && /^@media\s*\(\s*prefers-color-scheme:\s*dark/.test(prelude)) {
        out.push(transformRules(body, '[data-theme="dark"]'));
      }
    } else if (/^@keyframes/.test(prelude)) {
      out.push(`${prelude} {\n${body.trim()}\n}`);
    } else if (prelude.startsWith("@")) {
      out.push(`${prelude} {\n${body.trim()}\n}`);
    } else {
      const sel = splitSelectors(prelude, ancestor);
      if (!sel) continue;
      out.push(`${sel} {\n${body.trim()}\n}`);
    }
  }
  return out.join("\n\n");
}

/* ---- 生成 ---- */
const names = tokenNames(style[1]);
let css = renameTokens(renameClasses(style[1]), names);
css = renameKeyframes(css);

/* body 的排版声明保留，但背景/外边距交给插件外壳 */
const bodyRule = /(^|\n)([ \t]*)body[ \t]*\{([\s\S]*?)\n\2\}/.exec(css);
if (bodyRule) {
  const cleaned = bodyRule[3]
    .split("\n")
    .filter((line) => !/^\s*(background|margin)\s*:/.test(line))
    .join("\n");
  css = css.slice(0, bodyRule.index) + `${bodyRule[1]}${bodyRule[2]}body {${cleaned}\n${bodyRule[2]}}` + css.slice(bodyRule.index + bodyRule[0].length);
}

const scoped = transformRules(css);

const shell = `
/* ─────────────────────────────────────────────────────────────
   插件外壳：遮罩层 + 居中弹窗。稿子是独立页面，这里补上宿主内嵌的那层。
   ───────────────────────────────────────────────────────────── */
.d-usage {
  position: fixed;
  inset: 0;
  z-index: 2147482000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: color-mix(in srgb, #0d1117 44%, transparent);
}
.d-usage .d-popup { margin: 0; }
@media (prefers-color-scheme: dark) {
  .d-usage { background: color-mix(in srgb, #000 58%, transparent); }
}
[data-theme="dark"] .d-usage { background: color-mix(in srgb, #000 58%, transparent); }

/* 稿子里这些样式写在内联 style 上，抽出来复用 */
.d-usage .d-section-kicker { margin: 0 0 4px; color: var(--d-muted); font: 12px var(--d-font-mono); }
.d-usage .d-mode-panel button:disabled { opacity: .5; cursor: default; }
.d-usage .d-mode-panel button:disabled:hover { background: transparent; color: var(--d-muted); }
.d-usage .d-settings-wrap { position: relative; }

/* 状态栏席位：footer 容器默认 nowrap，多个整行入口会互相挤出屏幕 */
div:has(> [data-slot='sidebar.footer.action']) { flex-wrap: wrap; }
.d-seat-layer {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 0 100%;
  width: 100%;
  min-width: 0;
  height: 49px;
  margin: 8px 0 0;
}
.d-seat-layer.d-seat-rail { flex: none; width: 36px; height: 36px; margin: 0; }
.d-seat {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 49px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.d-seat-layer.d-seat-rail .d-seat { width: 36px; height: 36px; padding: 0; justify-content: center; border-radius: 50%; }
.d-seat-layer.d-seat-rail .d-seat span,
.d-seat-layer.d-seat-rail .d-seat em { display: none; }
`;

const header = `/* DeepMeter 面板样式 —— 由 scripts/build-panel-css.mjs 从 UI 稿生成，勿手改。
   全部规则收在 .d-usage 作用域内；类名与令牌统一 d- 前缀。 */\n`;

writeFileSync(OUT, (header + scoped + shell).replace(/[ \t]+$/gm, ""), "utf8");
console.log(`wrote ${OUT} (${readFileSync(OUT).length} bytes)`);
