import { describe, expect, it } from "vitest";
import { FormComponentConfig } from "../types/page";
import { buildFormSubmitRequestBody } from "./formConfig";

describe("buildFormSubmitRequestBody calculations", () => {
  it("includes calculated targets while excluding transient picker fields", () => {
    const form: FormComponentConfig = {
      schemaName: "davinciOrder",
      fields: [
        { formKey: "productId", label: "Product", type: "select" },
        { formKey: "quantity", label: "Quantity", type: "number" },
      ],
      objectLists: [{
        key: "items",
        itemFields: ["productId", "quantity"],
        fieldMappings: [{ sourceFormKey: "productId", sourceField: "price", targetField: "unitPrice", required: true }],
        itemCalculations: [{ operation: "multiply", inputs: ["unitPrice", "quantity"], targetField: "lineTotal", precision: 2 }],
        addAction: { kind: "addObject", targetObjectList: "items", sourceFields: ["productId", "quantity"] },
      }],
      summaries: [
        { key: "subtotal", operation: "sum", objectListKey: "items", sourceField: "lineTotal", targetField: "subtotal" },
        { key: "total", operation: "copy", sourceField: "subtotal", targetField: "total" },
      ],
      submit: { mode: "workflow", workflowSchema: "davinciOrder", workflowName: "create-davinci-order" },
    };

    expect(buildFormSubmitRequestBody(form, {
      productId: "transient",
      quantity: 9,
      items: [{ productId: "p1", quantity: 3, unitPrice: 19.99, lineTotal: 59.97, name: "Tea" }],
      subtotal: 59.97,
      total: 59.97,
    })).toEqual({ record: {
      items: [{ productId: "p1", quantity: 3, unitPrice: 19.99, lineTotal: 59.97 }],
      subtotal: 59.97,
      total: 59.97,
    } });
  });
});
