import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/panel.css", import.meta.url), "utf8");

test("daily limit rows keep a usable numeric field instead of collapsing", () => {
  assert.match(css, /\.d-budget-settings \.d-fx-row\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
  assert.match(css, /\.d-budget-settings \.d-fx-label\s*\{[^}]*grid-column:\s*1 \/ -1/);
  assert.match(css, /\.d-budget-settings \.d-fx-input,\s*\.d-usage \.d-budget-settings \.d-fx-btn\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.d-budget-settings \.d-token-limit-unit,\s*\.d-usage \.d-budget-settings \.d-fx-unit\s*\{[^}]*border-radius:\s*0 8px 8px 0/);
});

test("every settings tab shares the same fixed panel frame", () => {
  const frame = css.slice(css.indexOf("Final settings popover"));
  const start = frame.indexOf(".d-settings-panel,");
  const block = frame.slice(start, frame.indexOf("}", start));
  assert.match(block, /\.d-settings-panel\.d-settings-tab-budget/);
  assert.match(block, /width:\s*290px/);
  const budgetRules = css.match(/\.d-settings-tab-budget\s*\{[^}]*\}/g) ?? [];
  assert.ok(budgetRules.length >= 1, "the budget tab must use the shared frame");
  for (const rule of budgetRules) assert.match(rule, /width:\s*(min\()?290px/, "the budget tab must keep the shared 290px width");
});

test("narrow viewports keep the amount readable", () => {
  const narrow = css.slice(css.lastIndexOf("@media (max-width: 560px)"));
  assert.match(narrow, /\.d-budget-settings \.d-fx-input,[\s\S]*?\.d-budget-settings \.d-fx-btn \{ height: 38px; \}/);
});
