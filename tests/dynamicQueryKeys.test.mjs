import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../src/utils/dynamicQueryKeys.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
const { getTableSourceQueryKey, shouldInvalidateDynamicQuery } =
  await import(moduleUrl);

test("uses the same table-source key shape for the query and its updates", () => {
  const filters = { search: "", sort: "", asc: 1 };
  const binding = {
    kind: "pipeline",
    schemaName: "orders",
    pipelineName: "open-orders",
    fields: ["number", "status"],
    params: { region: "us" },
  };

  assert.deepEqual(getTableSourceQueryKey(2, 25, binding, filters), [
    "dynamic",
    "orders",
    "table-source",
    "pipeline",
    "open-orders",
    "",
    {
      page: 2,
      limit: 25,
      filters,
      fields: ["number", "status"],
      params: { region: "us" },
    },
  ]);
});

test("a schema event invalidates dependent table-source queries", () => {
  const pipelineQueryKey = [
    "dynamic",
    "reports",
    "table-source",
    "pipeline",
    "sales-report",
  ];

  assert.equal(
    shouldInvalidateDynamicQuery(pipelineQueryKey, "orders"),
    true,
  );
});
