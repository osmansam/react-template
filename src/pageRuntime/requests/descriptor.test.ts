import { describe, expect, it } from "vitest";
import { compilePageRequest, pageRequestSignature } from "./descriptor";
const source = { transport: "table-source", kind: "schema", schemaName: "products" } as const;
describe("effective page requests", () => {
 it("shares equivalent wire requests regardless of property order", () => {
  const a = compilePageRequest(source, { filters: { active: false, price: 0 }, controls: { page: 1, limit: 20, sort: "name", asc: true } });
  const b = compilePageRequest(source, { controls: { limit: 20, page: 1, asc: true, sort: "name" }, filters: { price: 0, active: false } });
  expect(pageRequestSignature(a)).toBe(pageRequestSignature(b));
  expect(a.path).toBe("/dynamic/table-source");
  expect(a.query).toContainEqual(["active", "false"]);
  expect(a.query).toContainEqual(["price", "0"]);
 });
 it("separates different filters sorting pagination projections and sources", () => {
  const base = pageRequestSignature(compilePageRequest(source, { controls: { page: 1, limit: 20 } }));
  for (const values of [{ filters: { active: true } }, { controls: { sort: "name" } }, { controls: { page: 2 } }, { fields: ["name"] }]) {
   expect(pageRequestSignature(compilePageRequest(source, { controls: { page: 1, limit: 20 }, ...values }))).not.toBe(base);
  }
  expect(pageRequestSignature(compilePageRequest({ ...source, transport: "page" }, { controls: { page: 1, limit: 20 } }))).not.toBe(base);
 });
 it("preserves repeated filter order and workflow body types", () => {
  const a = compilePageRequest(source, { filters: { price: ["gt-3", "lt-9"] } });
  expect(a.query.filter(([key]) => key === "price")).toEqual([["price", "gt-3"], ["price", "lt-9"]]);
  const workflow = { transport: "workflow", schemaName: "products", workflowName: "summary" } as const;
  expect(pageRequestSignature(compilePageRequest(workflow, { params: { count: 1 } }))).not.toBe(pageRequestSignature(compilePageRequest(workflow, { params: { count: "1" } })));
 });
});
