import { describe, expect, it } from "vitest";
import { FormComponentConfig } from "../types/page";
import { buildFormConfigReference, buildFormInputs, buildFormSubmitRequestBody } from "./formConfig";

describe("buildFormSubmitRequestBody calculations", () => {
  it("builds options with left and right labels and retained dependencies", () => {
    const form: FormComponentConfig = { schemaName: "orders", fields: [{ formKey: "productId", type: "select", optionsSource: "schema", sourceValueField: "_id", sourceLabelField: "name", sourceDataFields: ["price"], optionDisplay: { leftTemplate: "{{name}}", rightTemplate: "{{price}} ₺" } }] };
    const sourceItem = { _id: "p1", name: "Syrup", price: 120 };
    const inputs = buildFormInputs(form, new Map([["productId", [sourceItem]]]));
    expect(inputs[0].options).toEqual([{ value: "p1", label: "Syrup", leftLabel: "Syrup", rightLabel: "120 ₺", sourceItem }]);
  });
  it("creates a trusted config reference only for calculated workflow forms", () => {
    const calculated = { schemaName: "orders", objectLists: [{ key: "items", fieldMappings: [{ sourceFormKey: "productId", sourceField: "price", targetField: "unitPrice" }] }] } as FormComponentConfig;
    expect(buildFormConfigReference(calculated, "page-1", "cmp-1")).toEqual({ pageId: "page-1", componentId: "cmp-1" });
    expect(buildFormConfigReference({ schemaName: "orders" }, "page-1", "cmp-1")).toBeUndefined();
  });
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
