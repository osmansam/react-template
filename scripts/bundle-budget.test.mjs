import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { measureRoute, checkBudgets } from "./check-bundle-budget.mjs";
test("counts static transitive dependencies once, excludes deferred imports, and rejects a regression", () => {
  const dir = mkdtempSync(join(tmpdir(), "rt-budget-"));
  try {
    mkdirSync(join(dir, ".vite"));
    const manifest = {
      "index.html": {
        file: "entry.js",
        imports: ["shared"],
        dynamicImports: ["optional"],
      },
      shared: { file: "shared.js", imports: ["index.html"] },
      optional: { file: "optional.js" },
    };
    writeFileSync(join(dir, ".vite/manifest.json"), JSON.stringify(manifest));
    for (const [name, n] of [
      ["entry", 20],
      ["shared", 30],
      ["optional", 200],
    ])
      writeFileSync(join(dir, name + ".js"), "x".repeat(n));
    assert.equal(measureRoute(dir, ["index.html"]).rawBytes, 50);
    assert.equal(measureRoute(dir, ["index.html", "shared"]).files.length, 2);
    assert.equal(
      checkBudgets(dir, [
        {
          name: "entry",
          entries: ["index.html"],
          maxRawBytes: 49,
          maxGzipBytes: 1000,
        },
      ]).ok,
      false,
    );
    assert.equal(
      checkBudgets(dir, [
        {
          name: "entry",
          entries: ["index.html"],
          maxRawBytes: 50,
          maxGzipBytes: 1000,
        },
      ]).ok,
      true,
    );
    assert.throws(() => measureRoute(dir, ["missing"]), /Missing/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
