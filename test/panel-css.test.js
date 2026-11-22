import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/panel.css", import.meta.url), "utf8");

test("daily limit rows keep a usable numeric field instead of collapsing", () => {
  assert.match(css, /\.d-settings-panel\.d-settings-tab-budget[^{]*\{[^}]*width:\s*360px/);
  assert.match(css, /\.d-budget-settings \.d-fx-input\s*\{[^}]*min-width:\s*96px/);
  assert.match(css, /\.d-budget-settings \.d-fx-row\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%/);
  assert.match(css, /\.d-budget-settings\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("every settings tab shares one fixed panel frame", () => {
  const frame = css.slice(css.indexOf("Final settings popover"));
  assert.match(frame, /\.d-settings-panel,\s*\.d-usage \.d-settings-panel\.d-settings-tab-seat,\s*\.d-usage \.d-settings-panel\.d-settings-tab-budget\s*\{[^}]*width:\s*360px/);
  const budgetRules = css.match(/\.d-settings-tab-budget\s*\{[^}]*\}/g) || [];
  assert.ok(budgetRules.length >= 1, "the budget tab must use the shared frame");
  for (const rule of budgetRules) assert.match(rule, /width:\s*(min\()?360px/, "the budget tab must keep the shared 360px width");
  assert.doesNotMatch(css, /\.d-settings-panel\s*\{[^}]*transition:[^}]*width/);
});

test("narrow viewports stack the amount above the unit instead of squeezing it", () => {
  const narrow = css.slice(css.lastIndexOf("@media (max-width: 560px)"));
  assert.match(narrow, /\.d-budget-settings \.d-fx-row\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(narrow, /\.d-budget-settings \.d-fx-input\s*\{[^}]*flex:\s*1 1 100%/);
});
