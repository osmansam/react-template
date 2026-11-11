import { expect, it } from "vitest";
import { toDynamicPayload, selectPageRequestResult } from "./adapters";
it("makes summary values available as an info block's first record", () => {
 expect(toDynamicPayload(selectPageRequestResult({ revenue: 42 }, { kind: "value" }))).toEqual({ items: [{ revenue: 42 }], totalItems: 1, totalPages: 1, currentPage: 1 });
 expect(toDynamicPayload(42)).toEqual({ items: [{ value: 42 }], totalItems: 1, totalPages: 1, currentPage: 1 });
});
