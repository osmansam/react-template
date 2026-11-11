import { expect, it } from "vitest";
import { resolvePageRequest } from "./resolver";
import { validatePageRequestGraph } from "./graph";
import type { PageRequestDefinition } from "../../types/pageRequests";
const definition: PageRequestDefinition = { id: "r", name: "Products", source: { transport: "table-source", kind: "schema", schemaName: "products" }, defaults: { filters: { active: true, price: 10 }, controls: { page: 1, limit: 20, sort: "name", asc: true } }, result: { kind: "records" } };
it("preserves explicit false zero and null while allowing inheritance to resume", () => {
 const values = resolvePageRequest(definition, { filters: { active: false, price: 0 } }, { requestId: "r", overrides: { controls: { sort: null } } });
 expect(values.filters).toEqual({ active: false, price: 0 });
 expect(values.controls).toEqual({ page: 1, limit: 20, sort: null, asc: true });
 expect(resolvePageRequest(definition, {}, { requestId: "r" }).controls?.sort).toBe("name");
});
it("rejects a request depending on its own consumer output", () => {
 const page = { name: "P", requests: [{ ...definition, bindings: { params: { search: { source: "componentOutput" as const, componentId: "c", outputId: "o" } } } }], sections: [{ type: "component", component: { id: "c", type: "table", requestBindings: { data: { requestId: "r" } } } }] };
 expect(validatePageRequestGraph(page).some(issue => issue.code === "page_request_cycle")).toBe(true);
});
