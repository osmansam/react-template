import { describe, expect, it } from "vitest";
import { FormComponentConfig, FormObjectListConfig } from "../types/page";
import {
  calculateFormSummaries,
  calculateObjectListItem,
  recalculateFormState,
  snapshotMappedFields,
} from "./formCalculations";

const objectList: FormObjectListConfig = {
  key: "items",
  itemFields: ["productId", "quantity"],
  fieldMappings: [{ sourceFormKey: "productId", sourceField: "price", targetField: "unitPrice", required: true }],
  itemCalculations: [{ operation: "multiply", inputs: ["unitPrice", "quantity"], targetField: "lineTotal", precision: 2 }],
};

const form: FormComponentConfig = {
  schemaName: "davinciOrder",
  objectLists: [objectList],
  summaries: [
    { key: "subtotal", operation: "sum", objectListKey: "items", sourceField: "lineTotal", targetField: "subtotal", format: { style: "currency", currency: "TRY", precision: 2 } },
    { key: "total", operation: "copy", sourceField: "subtotal", targetField: "total", format: { style: "currency", currency: "TRY", precision: 2 } },
  ],
};

describe("form calculations", () => {
  it("snapshots required source values", () => {
    expect(snapshotMappedFields(objectList, { productId: "p1", quantity: 3 }, { productId: { price: 19.99 } })).toEqual({ productId: "p1", quantity: 3, unitPrice: 19.99 });
    expect(() => snapshotMappedFields(objectList, { productId: "p1", quantity: 1 }, { productId: {} })).toThrowError(expect.objectContaining({ code: "missing_mapping" }));
  });

  it("uses the shared price fixture and ordered summaries", () => {
    const items = [
      calculateObjectListItem(objectList, { unitPrice: 19.99, quantity: 3 }),
      calculateObjectListItem(objectList, { unitPrice: 5.25, quantity: 2 }),
    ];
    expect(items.map((item) => item.lineTotal)).toEqual([59.97, 10.5]);
    expect(calculateFormSummaries(form, { items })).toEqual({ subtotal: 70.47, total: 70.47 });
    expect(calculateFormSummaries(form, { items: [] })).toEqual({ subtotal: 0, total: 0 });
  });

  it.each([{ precision: 0, expected: 7 }, { precision: 2, expected: 6.67 }, { precision: 6, expected: 6.666667 }])(
    "supports precision $precision",
    ({ precision, expected }) => {
      const configured = { ...objectList, itemCalculations: [{ ...objectList.itemCalculations![0], precision }] };
      expect(calculateObjectListItem(configured, { unitPrice: 10, quantity: 2 / 3 }).lineTotal).toBe(expected);
    },
  );

  it("recalculates items and summaries without mutation", () => {
    const state = { items: [{ unitPrice: 19.99, quantity: 3 }, { unitPrice: 5.25, quantity: 2 }] };
    const result = recalculateFormState(form, state);
    expect(result).toMatchObject({ subtotal: 70.47, total: 70.47 });
    expect((result.items as Record<string, unknown>[]).map((item) => item.lineTotal)).toEqual([59.97, 10.5]);
    expect(state.items[0]).not.toHaveProperty("lineTotal");
  });
});
