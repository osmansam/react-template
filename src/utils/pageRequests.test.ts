import { expect, it } from "vitest";
import { listComponentRequestSlots, validatePageRequests } from "./pageRequests";


it("ignores retired visual connections and their legacy fallback sources", () => {
 const component = { id: "visual", type: "custom", requestBindings: { "dataset:products": { requestId: "removed-request" } }, props: { visualBuilder: { document: { root: { id: "root", type: "section", children: [{ id: "rows", type: "repeater", datasetId: "products", source: { kind: "autotable", schemaName: "product", limit: 20 }, children: [] }] } } } } };
 expect(listComponentRequestSlots(component as never)).toEqual([]);
 expect(validatePageRequests({ name: "Catalog", sections: [{ type: "component", component }] } as never)).toEqual([]);
});
