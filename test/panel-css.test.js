import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/panel.css", import.meta.url), "utf8");

test("daily limit rows keep a usable numeric field instead of collapsing", () => {
  assert.match(css, /\.d-settings-panel\.d-settings-tab-budget\s*\{[^}]*width:\s*min\(392px/);
  assert.match(css, /\.d-budget-settings \.d-fx-input\s*\{[^}]*min-width:\s*96px/);
  assert.match(css, /\.d-budget-settings \.d-fx-row\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%/);
  assert.match(css, /\.d-budget-settings\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("opening the daily limit tab grows the panel with a transition", () => {
  assert.match(css, /\.d-settings-panel\s*\{[^}]*transition:[^}]*width[^}]*grid-template-columns/);
  const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.d-settings-panel\s*\{\s*transition:\s*none/);
});

test("narrow viewports stack the amount above the unit instead of squeezing it", () => {
  const narrow = css.slice(css.lastIndexOf("@media (max-width: 560px)"));
  assert.match(narrow, /\.d-budget-settings \.d-fx-row\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(narrow, /\.d-budget-settings \.d-fx-input\s*\{[^}]*flex:\s*1 1 100%/);
});
