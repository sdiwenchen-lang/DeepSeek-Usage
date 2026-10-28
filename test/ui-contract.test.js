/**
 * UI 契约测试 —— 面板样式注入宿主文档，保持作用域和结构类名稳定。
 *
 * 这里守两件事：
 *   1. 样式表不许有全局规则（:root / body / * reset），否则会污染 DSH 自己的界面；
 *   2. 稿子里的关键结构类名必须同时出现在 client.js 与 panel.css，改名要么两边一起改。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "src", "panel.css"), "utf8");
const client = readFileSync(join(ROOT, "src", "client.js"), "utf8");

/** 关键结构：头部、页签、指标卡、图表、日历、设置、详情弹窗、席位。 */
const KEY_CLASSES = [
  "d-usage",
  "d-popup",
  "d-popup-scroll",
  "d-popup-header",
  "d-brand-lockup",
  "d-brand-mark",
  "d-header-snapshot",
  "d-settings-field",
  "d-settings-panel",
  "d-theme-swatch",
  "d-display-pref-row",
  "d-icon-choice-panel",
  "d-page-tabs",
  "d-page-tab",
  "d-page-detail",
  "d-page-calendar",
  "d-filter-bar",
  "d-td-btn",
  "d-td-panel",
  "d-td-cal-grid",
  "d-model-field",
  "d-model-panel",
  "d-model-option",
  "d-metrics",
  "d-metric",
  "d-chart-section",
  "d-chart-plot",
  "d-stacked-chart",
  "d-stack-col",
  "d-mini-chart-grid",
  "d-mini-chart-card",
  "d-heatmap",
  "d-heat-cell",
  "d-week-grid",
  "d-month-grid",
  "d-legend-scale",
  "d-popup-footer",
  "d-detail-dialog",
  "d-detail-list",
  "d-cell-tip",
  "d-seat-layer",
  "d-seat",
];

test("UI：样式表全部收在 .d-usage / .d-seat 作用域内，没有全局 reset", () => {
  assert.doesNotMatch(css, /:root/, "不得再声明 :root 变量");
  assert.doesNotMatch(css, /(^|\n)\s*body\s*\{/, "不得直接给 body 上样式");
  assert.doesNotMatch(css, /(^|\n)\s*html\s*\{/, "不得直接给 html 上样式");

  const unscoped = new Set();
  for (const line of css.split("\n")) {
    if (!line.includes("{") || line.trim().startsWith("@") || line.trim().startsWith("/*")) continue;
    const prelude = line.slice(0, line.indexOf("{")).trim();
    for (const part of prelude.split(",")) {
      const s = part.trim();
      if (!s) continue;
      const scoped =
        s.startsWith(".d-usage") ||
        s.startsWith('[data-theme="dark"] .d-usage') ||
        s.startsWith(".d-seat") ||
        s === "div:has(> [data-slot='sidebar.footer.action'])";
      if (!scoped) unscoped.add(s);
    }
  }
  // @keyframes 的 0%/from/to 会被上面的粗解析抓到，排除掉
  const noise = new Set(["0%", "50%", "100%", "from", "to"]);
  const real = [...unscoped].filter((s) => !noise.has(s));
  assert.deepEqual(real, [], `这些选择器没有作用域，会污染宿主：${real.join(", ")}`);
});

test("UI：稿子里的结构类名在 client.js 与 panel.css 两边都存在", () => {
  for (const name of KEY_CLASSES) {
    assert.ok(css.includes("." + name), `panel.css 缺少 .${name}`);
    assert.ok(new RegExp(`"${name}(\\s|"|$)`).test(client), `client.js 未使用 ${name}`);
  }
});

test("UI：令牌与主题色按稿子落地（蓝 / 橙 / 绿 / 紫 / 红 + 深色）", () => {
  assert.match(css, /--d-accent:\s*#4D6BFE/, "默认主色应为稿子的 DeepSeek 蓝");
  assert.match(css, /--d-bg:\s*#F5F6F8/, "底色应为稿子的浅灰");
  for (const theme of ["blue", "orange", "green", "purple", "red"]) {
    assert.ok(css.includes(`[data-theme="${theme}"]`), `缺少主题 ${theme}`);
  }
  assert.match(css, /prefers-color-scheme:\s*dark/, "应支持系统深色");
  assert.match(css, /\[data-theme="dark"\] \.d-usage/, "应支持宿主 data-theme=dark");
});

test("UI：客户端不再使用旧稿的全局类名", () => {
  for (const legacy of ["d-container", "d-section", "d-page-title", "d-conn-status", "d-balance-strip", "d-account-summary"]) {
    assert.ok(!new RegExp(`"${legacy}"`).test(client), `client.js 仍残留旧稿结构 ${legacy}`);
    assert.ok(!new RegExp(`\\.${legacy}(?![\\w-])`).test(css), `panel.css 仍残留旧稿结构 ${legacy}`);
  }
});
