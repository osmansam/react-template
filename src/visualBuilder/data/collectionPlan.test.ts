import { describe, expect, it } from "vitest";
import type { AutoTableCollectionSource, ComponentNode } from "../../visual-engine/model";
import { planCollection, planDocumentCollections, schemasNeedingFieldTypes } from "./collectionPlan";

const types = { name: "string", price: "float", stock: "int", active: "bool", status: "enum", created: "date" };
const base: AutoTableCollectionSource = { kind: "autotable", schemaName: "products", limit: 20 };

function reason(source: AutoTableCollectionSource, fieldTypes = types): string {
  const plan = planCollection(source, fieldTypes);
  if (plan.ok) throw new Error("expected the plan to be rejected");
  return plan.reason;
}

describe("planCollection", () => {
  it("accepts an unfiltered list without any metadata", () => {
    const plan = planCollection(base);
    expect(plan.ok && plan.descriptor).toMatchObject({ schemaName: "products", limit: 20, filters: [] });
  });
  it("makes equal sources share a key and different filters or limits differ", () => {
    const key = (source: AutoTableCollectionSource) => { const plan = planCollection(source, types); return plan.ok ? plan.descriptor.key : "invalid"; };
    const a = { ...base, filters: [{ field: "active", operator: "eq" as const, value: true }, { field: "stock", operator: "eq" as const, value: 0 }] };
    const reordered = { ...base, filters: [...a.filters].reverse() };
    expect(key(a)).toBe(key(reordered));
    expect(key(a)).not.toBe(key(base));
    expect(key({ ...base, limit: 5 })).not.toBe(key(base));
  });
  it("accepts zero, false and homogeneous lists", () => {
    expect(planCollection({ ...base, filters: [{ field: "stock", operator: "eq", value: 0 }, { field: "active", operator: "eq", value: false }, { field: "status", operator: "in", value: ["new", "sale"] }] }, types).ok).toBe(true);
  });
  it.each([
    ["limit above 100", { ...base, limit: 101 }, /Limit/],
    ["limit of zero", { ...base, limit: 0 }, /Limit/],
    ["fractional limit", { ...base, limit: 2.5 }, /Limit/],
    ["two sorts", { ...base, sort: [{ field: "name", direction: "asc" as const }, { field: "price", direction: "desc" as const }] }, /one sort/],
    ["reserved filter field", { ...base, filters: [{ field: "page", operator: "eq" as const, value: "1" }] }, /reserved/],
    ["reserved sort field", { ...base, sort: [{ field: "limit", direction: "asc" as const }] }, /sort field/],
    ["nested filter field", { ...base, filters: [{ field: "a.b", operator: "eq" as const, value: "x" }] }, /nested/],
    ["duplicate field", { ...base, filters: [{ field: "name", operator: "eq" as const, value: "a" }, { field: "name", operator: "eq" as const, value: "b" }] }, /more than one/],
    ["null equality", { ...base, filters: [{ field: "name", operator: "eq" as const, value: null }] }, /non-null/],
    ["empty list", { ...base, filters: [{ field: "name", operator: "in" as const, value: [] }] }, /non-empty/],
    ["null in list", { ...base, filters: [{ field: "name", operator: "in" as const, value: ["a", null] }] }, /null/],
    ["mixed list", { ...base, filters: [{ field: "name", operator: "in" as const, value: ["a", 1] }] }, /mixes/],
    ["comma in string", { ...base, filters: [{ field: "name", operator: "eq" as const, value: "a,b" }] }, /comma/],
    ["comma in list item", { ...base, filters: [{ field: "name", operator: "in" as const, value: ["a,b", "c"] }] }, /comma/],
    ["padded string", { ...base, filters: [{ field: "name", operator: "eq" as const, value: " a" }] }, /whitespace/],
    ["quoted string", { ...base, filters: [{ field: "name", operator: "eq" as const, value: "\"a\"" }] }, /quote/],
    ["operator-looking string", { ...base, filters: [{ field: "name", operator: "eq" as const, value: "gte-5" }] }, /operator/],
    ["empty string", { ...base, filters: [{ field: "name", operator: "eq" as const, value: "" }] }, /empty/],
    ["wrong type", { ...base, filters: [{ field: "stock", operator: "eq" as const, value: "3" }] }, /whole number/],
    ["invalid date field", { ...base, filters: [{ field: "created", operator: "eq" as const, value: "2025-02-30" }] }, /date|calendar/i],
    ["unknown field", { ...base, filters: [{ field: "ghost", operator: "eq" as const, value: "x" }] }, /metadata/],
  ])("rejects %s", (_name, source, expected) => {
    expect(reason(source)).toMatch(expected);
  });
  it("needs metadata only for filtered sources", () => {
    expect(planCollection({ ...base, filters: [{ field: "name", operator: "eq", value: "x" }] }).ok).toBe(false);
    expect(planCollection(base).ok).toBe(true);
  });
});

describe("planDocumentCollections", () => {
  const repeater = (id: string, source: AutoTableCollectionSource, children: ComponentNode[] = []): ComponentNode => ({
    id, type: "repeater", source, itemAlias: "item", children: [{ id: `${id}-item`, type: "slot", name: "item", children }],
  } as ComponentNode);
  it("deduplicates identical sources and keeps differing ones apart", () => {
    const root = { id: "root", type: "section", children: [repeater("a", base), repeater("b", base), repeater("c", { ...base, limit: 3 })] } as ComponentNode;
    const plan = planDocumentCollections(root);
    expect(plan.repeaters.map((entry) => entry.repeaterId)).toEqual(["a", "b", "c"]);
    expect(plan.descriptors).toHaveLength(2);
  });
  it("never executes a repeater nested in another repeater", () => {
    const root = { id: "root", type: "section", children: [repeater("outer", base, [repeater("inner", { ...base, limit: 2 })])] } as ComponentNode;
    const plan = planDocumentCollections(root);
    expect(plan.descriptors).toHaveLength(0);
    const inner = plan.repeaters.find((entry) => entry.repeaterId === "inner");
    expect(inner?.plan.ok).toBe(false);
  });
  it("lists schemas that need field metadata", () => {
    const root = { id: "root", type: "section", children: [repeater("a", { ...base, filters: [{ field: "name", operator: "eq", value: "x" }] }), repeater("b", { ...base, schemaName: "orders" })] } as ComponentNode;
    expect(schemasNeedingFieldTypes(root)).toEqual(["products"]);
  });
});


it("supports typed numeric/date bounds, exact date equality and canonical paired ranges", () => {
 const key = (filters: AutoTableCollectionSource["filters"]) => { const result = planCollection({ ...base, filters }, types); if (!result.ok) throw new Error(result.reason); return result.descriptor.key; };
 for (const operator of ["gt", "gte", "lt", "lte"] as const) {
  expect(planCollection({ ...base, filters: [{ field: "price", operator, value: -0.5 }] }, types).ok).toBe(true);
  expect(planCollection({ ...base, filters: [{ field: "created", operator, value: "2026-11-01" }] }, types).ok).toBe(true);
 }
 const range = [{ field: "price", operator: "gte" as const, value: 0 }, { field: "price", operator: "lt" as const, value: 100 }];
 expect(key(range)).toBe(key([...range].reverse()));
 expect(key(range)).not.toBe(key([{ ...range[0], operator: "gt" }, range[1]]));
 expect(planCollection({ ...base, filters: [{ field: "created", operator: "eq", value: "2026-11-01" }] }, types).ok).toBe(true);
});
it("rejects misleading type/operator combinations and ambiguous or empty ranges", () => {
 const rejects: AutoTableCollectionSource["filters"][] = [
  [{ field: "name", operator: "gt", value: "a" }], [{ field: "active", operator: "gte", value: true }],
  [{ field: "price", operator: "gt", value: "20" }], [{ field: "stock", operator: "gte", value: 1.5 }],
  [{ field: "price", operator: "gte", value: NaN }], [{ field: "created", operator: "gte", value: "2026-02-30" }],
  [{ field: "created", operator: "gte", value: "2026-11-01T13:00:00Z" }], [{ field: "created", operator: "in", value: ["2026-11-01", "2026-11-02"] }],
  [{ field: "price", operator: "eq", value: 20 }, { field: "price", operator: "gt", value: 10 }],
  [{ field: "price", operator: "gte", value: 1 }, { field: "price", operator: "gt", value: 2 }],
  [{ field: "price", operator: "gte", value: 20 }, { field: "price", operator: "lte", value: 10 }],
  [{ field: "price", operator: "gt", value: 20 }, { field: "price", operator: "lte", value: 20 }],
 ];
 for (const filters of rejects) expect(planCollection({ ...base, filters }, types).ok).toBe(false);
 expect(planCollection({ ...base, filters: [{ field: "price", operator: "gte", value: 20 }, { field: "price", operator: "lte", value: 20 }] }, types).ok).toBe(true);
});
