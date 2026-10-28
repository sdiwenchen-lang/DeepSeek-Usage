/**
 * 生成"设计稿 vs 插件样式表"的静态对照页，用于样式走查。
 *
 * 左边是原始 UI 稿（自带样式），右边是把同一份 DOM 的类名换成 d- 前缀、
 * 只加载 src/panel.css 的版本。两边像素一致，说明样式表没有在搬运中走形。
 *
 * 用法：node scripts/render-preview.mjs  → output/css-compare.html
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "deepseek-usage-popup 2.html"), "utf8");

const body = /<body>([\s\S]*?)<\/body>/.exec(html)[1];
const markup = body.slice(0, body.indexOf("<script>")).trim();

const prefixed = markup
  .replace(/class="([^"]*)"/g, (_, names) => `class="${names.split(/\s+/).map((n) => "d-" + n).join(" ")}"`)
  .replace(/--swatch/g, "--d-swatch");

const css = readFileSync(join(ROOT, "src", "panel.css"), "utf8");
const referenceCss = /<style>([\s\S]*?)<\/style>/.exec(html)[1];

const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>CSS compare</title>
<style>
  body { margin: 0; background: #eef0f3; font-family: -apple-system, sans-serif; }
  .pane { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px; }
  .pane > div { background: #f5f6f8; border-radius: 12px; padding: 16px; }
  .pane h2 { font: 600 12px/1.4 monospace; margin: 0 0 12px; color: #5b6472; }
  ${referenceCss}
  ${css}
  /* 对照页里把遮罩外壳还原成稿子的纸面 */
  .fixture { position: static !important; display: block !important; padding: 0 !important; background: none !important; }
</style></head>
<body>
  <div class="pane">
    <div><h2>设计稿 deepseek-usage-popup 2.html</h2>${markup}</div>
    <div><h2>src/panel.css（d- 前缀 · .d-usage 作用域）</h2><div class="d-usage fixture">${prefixed}</div></div>
  </div>
</body></html>`;

mkdirSync(join(ROOT, "output"), { recursive: true });
writeFileSync(join(ROOT, "output", "css-compare.html"), page, "utf8");
console.log("wrote output/css-compare.html");
