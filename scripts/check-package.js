import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

assert.ok(process.env.npm_execpath, "Run with npm run pack:check");
const [pack] = JSON.parse(execFileSync(process.execPath, [
  process.env.npm_execpath, "pack", "--dry-run", "--json", "--ignore-scripts",
], { encoding: "utf8" }));
const files = new Set(pack.files.map(({ path }) => path));
for (const name of ["src", "locale"]) {
  for (const file of readdirSync(new URL(`../${name}/`, import.meta.url))) {
    assert.ok(files.has(`${name}/${file}`), `Missing runtime file: ${name}/${file}`);
  }
}
for (const file of ["package.json", "cordis.patch.yml", "icon.svg", "README.md", "LICENSE"]) {
  assert.ok(files.has(file), `Missing package file: ${file}`);
}
for (const file of files) {
  assert.ok(!/^(docs\/|assets\/|test\/|scripts\/|CONTEXT\.md$|TASK_HANDOFF\.md$)/.test(file), `Repository-only file: ${file}`);
  assert.ok(!file.endsWith(".tgz"), `Nested package archive: ${file}`);
}
assert.ok(pack.size <= 110 * 1024, `Compressed package ${pack.size} B exceeds 110 KiB`);
assert.ok(pack.unpackedSize <= 420 * 1024, `Unpacked package ${pack.unpackedSize} B exceeds 420 KiB`);
console.log(`Package OK: ${pack.size} B compressed, ${pack.unpackedSize} B unpacked, ${pack.entryCount} files`);
