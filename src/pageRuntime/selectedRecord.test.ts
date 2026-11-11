import { describe, expect, it, vi } from "vitest";
import type { ComponentOutputDefinition, PageModel } from "../types/page";
import { resolveSelectedRecord, resolveTableOutput } from "./tableOutputAdapter";
import { applyTableNestedRows } from "../utils/tableConfig";
import { createPageRuntimeStore } from "./pageRuntimeStore";
import { compileComponentParameters } from "./pageBindingCompiler";
import { resolveComponentParameters } from "./pageParameterResolver";
const output = { id: "selected", key: "selectedRecord", type: "record", source: { kind: "tableSelectedRecord" } } as ComponentOutputDefinition;
const page = (): PageModel => ({ name: "Customers", sections: [{ type: "component", component: { id: "customers", type: "table", outputs: [output] } }, { type: "component", component: { id: "details", type: "custom", dataBinding: { kind: "schema", parameters: { item: { source: "componentOutput", componentId: "customers", outputId: "selected" } } } } }] });
describe("selected record output", () => {
 it("uses the current authorized row, not the old selected snapshot, and retains hidden fields", () => {
  const current = { _id: "a", name: "Updated", hidden: { customerId: "42" }, price: 0, enabled: false };
  expect(resolveSelectedRecord([{ _id: "a", name: "Old" }], [current], true)).toEqual(current);
  expect(resolveTableOutput(output, { filters: {}, search: "", selectedRecord: current })).toEqual({ status: "available", value: current });
 });
 it("clears details for zero/multiple selections, deletion, off-page data and ambiguous IDs", () => {
  const rows = [{ _id: "a" }, { _id: "b" }];
  for (const selected of [[], rows, [{ _id: "missing" }], [{ _id: 1 }]]) expect(resolveSelectedRecord(selected, rows, true)).toBeUndefined();
  expect(resolveSelectedRecord([rows[0]], rows, false)).toBeUndefined();
  expect(resolveSelectedRecord([rows[0]], [rows[0], rows[0]], true)).toBeUndefined();
  expect(resolveSelectedRecord([Object.create({ _id: "a" })], rows, true)).toBeUndefined();
  expect(resolveTableOutput(output, { filters: {}, search: "" })).toEqual({ status: "unavailable" });
 });
 it("publishes an immutable snapshot and resolves it through existing typed bindings", () => {
  const store = createPageRuntimeStore(page()), notify = vi.fn(); store.subscribe(notify);
  const row = { _id: "a", name: "A", address: { city: "Chicago" }, tags: ["one"] };
  store.publishOutput("customers", "customers", "selected", row);
  row.address.city = "Changed"; row.tags.push("two");
  const compiled = compileComponentParameters(page(), "details");
  expect(compiled.errors).toEqual([]);
  const result = resolveComponentParameters(compiled, store.getSnapshot());
  expect(result.status).toBe("ready");
  expect(result.values.item).toEqual({ _id: "a", name: "A", address: { city: "Chicago" }, tags: ["one"] });
  expect(Object.isFrozen((result.values.item as typeof row).address)).toBe(true);
  expect(() => store.publishOutput("details", "customers", "selected", row)).toThrow();
  store.markOutputUnavailable("customers", "customers", "selected");
  expect(resolveComponentParameters(compiled, store.getSnapshot()).status).toBe("waiting");
  expect(notify).toHaveBeenCalledTimes(2);
 });
 it("rejects non-JSON, inherited, cyclic and oversized record values", () => {
  const store = createPageRuntimeStore(page()); const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  for (const value of [[], "a", new Date(), { fn: () => 1 }, { n: Infinity }, cyclic, JSON.parse('{"__proto__":{"pwn":1}}'), { text: "x".repeat(300000) }]) expect(() => store.publishOutput("customers", "customers", "selected", value)).toThrow();
 });
});

it("keeps record values output-only and rejects a non-table record producer", () => {
 const withFilter = page(); withFilter.filters = [{ id: "f", key: "f", label: "f", type: "record", placement: { kind: "navbar" } }];
 expect(() => createPageRuntimeStore(withFilter)).toThrow();
 const withVariable = page(); withVariable.variables = [{ id: "v", key: "v", type: "record" }];
 expect(() => createPageRuntimeStore(withVariable)).toThrow();
 const invalid = page(); invalid.sections![0].component!.type = "infoBlocks";
 expect(() => createPageRuntimeStore(invalid)).toThrow();
});

it("publishes raw data behind nested-row presentation and clears filtered/off-page selection", () => {
 const raw = [{ _id: "a", name: "Alice", orders: [{ total: 10 }] }, { _id: "b", name: "Bob", orders: [] }];
 const decorated = applyTableNestedRows(raw, { nestedRows: { enabled: true, field: "orders", columns: [{ field: "total", type: "field" }] } }, (text: string) => text);
 expect(resolveSelectedRecord([decorated[0]], [decorated[0]], true, raw)).toEqual(raw[0]);
 expect(resolveSelectedRecord([decorated[0]], [decorated[1]], true, raw)).toBeUndefined();
 expect(resolveSelectedRecord([decorated[0]], [], true, raw)).toBeUndefined();
});
