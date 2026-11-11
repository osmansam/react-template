import { expect, it } from "vitest";
import { tableRequestOverrides } from "./tableOverrides";
it("inherits untouched controls and sends only changed local values", () => {
 const initial = { controls: { page: 1, limit: 20, sort: "name", asc: true }, filters: { active: true } };
 expect(tableRequestOverrides(initial, initial)).toEqual({});
 expect(tableRequestOverrides({ controls: { page: 2, limit: 20, sort: null, asc: false }, filters: { active: false, price: 0 } }, initial)).toEqual({ controls: { page: 2, sort: null, asc: false }, filters: { active: false, price: 0 } });
});

it("restores inheritance when a reset adopts newly bound defaults", () => {
 expect(tableRequestOverrides({ controls: { page: 2, sort: "price" } }, { controls: { page: 1, sort: "name" } }, { controls: { page: 2, sort: "price" } })).toEqual({});
});
