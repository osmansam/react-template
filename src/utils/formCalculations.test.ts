import { describe, expect, it } from "vitest";
import { FormComponentConfig, FormObjectListConfig } from "../types/page";
import {
  calculateFormSummaries,
  calculateObjectListItem,
  getNextQuantityDiscountTier,
  getQuantityDiscountTiers,
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
  it("snapshots and calculates with a qualified additional option field", () => {
    const configured: FormObjectListConfig = {
      key: "items",
      itemFields: ["productId", "quantity"],
      itemCalculations: [{ operation: "multiply", inputs: ["productId.price", "quantity"], targetField: "lineTotal", precision: 2 }],
    };
    const snapshot = snapshotMappedFields(configured, { productId: "p1", quantity: 3 }, {
      productId: { _id: "p1", name: "Tea", price: 19.99 },
    });

    expect(snapshot).toEqual({ productId: "p1", quantity: 3, _optionData: { productId: { price: 19.99 } } });
    expect(calculateObjectListItem(configured, snapshot)).toMatchObject({ lineTotal: 59.97 });
  });

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

  it("applies a quantity discount only at or above the configured line threshold", () => {
    const configured: FormObjectListConfig = {
      key: "items",
      itemCalculations: [{
        operation: "quantityDiscount",
        inputs: ["unitPrice", "quantity"],
        originalTargetField: "originalLineTotal",
        targetField: "lineTotal",
        minimumQuantity: 6,
        discountPercentage: 30,
        precision: 2,
      }],
    };
    const inputs = [5, 6, 7].map((quantity) => ({ unitPrice: 100, quantity }));

    expect(inputs.map((item) => calculateObjectListItem(configured, item))).toEqual([
      { unitPrice: 100, quantity: 5, originalLineTotal: 500, lineTotal: 500 },
      { unitPrice: 100, quantity: 6, originalLineTotal: 600, lineTotal: 420 },
      { unitPrice: 100, quantity: 7, originalLineTotal: 700, lineTotal: 490 },
    ]);
    expect(inputs[1]).toEqual({ unitPrice: 100, quantity: 6 });
  });

  it("normalizes configured and legacy quantity discount tiers", () => {
    expect(getQuantityDiscountTiers({
      operation: "quantityDiscount",
      inputs: ["unitPrice", "quantity"],
      originalTargetField: "originalLineTotal",
      targetField: "lineTotal",
      discountTiers: [
        { minimumQuantity: 6, discountPercentage: 30 },
        { minimumQuantity: 10, discountPercentage: 40 },
      ],
    })).toEqual([
      { minimumQuantity: 6, discountPercentage: 30 },
      { minimumQuantity: 10, discountPercentage: 40 },
    ]);
    expect(getQuantityDiscountTiers({
      operation: "quantityDiscount",
      inputs: ["unitPrice", "quantity"],
      originalTargetField: "originalLineTotal",
      targetField: "lineTotal",
      minimumQuantity: 6,
      discountPercentage: 30,
    })).toEqual([{ minimumQuantity: 6, discountPercentage: 30 }]);
  });

  it("returns only the next quantity discount tier", () => {
    const calculation = {
      operation: "quantityDiscount" as const,
      inputs: ["unitPrice", "quantity"],
      originalTargetField: "originalLineTotal",
      targetField: "lineTotal",
      discountTiers: [
        { minimumQuantity: 6, discountPercentage: 30 },
        { minimumQuantity: 10, discountPercentage: 40 },
      ],
    };
    expect(getNextQuantityDiscountTier(calculation, 3)).toEqual({ minimumQuantity: 6, discountPercentage: 30 });
    expect(getNextQuantityDiscountTier(calculation, 6)).toEqual({ minimumQuantity: 10, discountPercentage: 40 });
    expect(getNextQuantityDiscountTier(calculation, 8)).toEqual({ minimumQuantity: 10, discountPercentage: 40 });
    expect(getNextQuantityDiscountTier(calculation, 10)).toBeUndefined();
  });

  it("applies the highest reached tier to the complete row", () => {
    const configured: FormObjectListConfig = {
      key: "items",
      itemCalculations: [{
        operation: "quantityDiscount",
        inputs: ["unitPrice", "quantity"],
        originalTargetField: "originalLineTotal",
        targetField: "lineTotal",
        discountTiers: [
          { minimumQuantity: 6, discountPercentage: 30 },
          { minimumQuantity: 10, discountPercentage: 40 },
        ],
        precision: 2,
      }],
    };
    expect([3, 6, 8, 10, 12].map((quantity) => calculateObjectListItem(configured, { unitPrice: 100, quantity }))).toEqual([
      { unitPrice: 100, quantity: 3, originalLineTotal: 300, lineTotal: 300 },
      { unitPrice: 100, quantity: 6, originalLineTotal: 600, lineTotal: 420 },
      { unitPrice: 100, quantity: 8, originalLineTotal: 800, lineTotal: 560 },
      { unitPrice: 100, quantity: 10, originalLineTotal: 1000, lineTotal: 600 },
      { unitPrice: 100, quantity: 12, originalLineTotal: 1200, lineTotal: 720 },
    ]);
  });

  it("rounds the original and discounted totals like the backend fixture", () => {
    const configured: FormObjectListConfig = {
      key: "items",
      itemCalculations: [{
        operation: "quantityDiscount",
        inputs: ["unitPrice", "quantity"],
        originalTargetField: "originalLineTotal",
        targetField: "lineTotal",
        minimumQuantity: 6,
        discountPercentage: 30,
        precision: 2,
      }],
    };
    expect(calculateObjectListItem(configured, { unitPrice: 19.99, quantity: 6 })).toMatchObject({
      originalLineTotal: 119.94,
      lineTotal: 83.96,
    });
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
