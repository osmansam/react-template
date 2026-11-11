import { expect, it } from "vitest";
import { pageRequestInvalidationPredicate } from "./invalidation";
it("matches a schema only in the active tenant project and actor", () => {
 const predicate = pageRequestInvalidationPredicate({ tenant: "a", project: "p", identity: "u" }, "products");
 const query = { queryKey: ["page-request", "a", "p", "u", "page", "signature"], meta: { pageRequestSchema: "products" } };
 expect(predicate(query)).toBe(true);
 expect(predicate({ ...query, queryKey: ["page-request", "a", "other", "u"] })).toBe(false);
 expect(predicate({ ...query, queryKey: ["page-request", "a", "p", "other"] })).toBe(false);
 expect(predicate({ ...query, meta: { pageRequestSchema: "orders" } })).toBe(false);
});
