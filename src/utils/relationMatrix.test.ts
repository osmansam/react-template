import { describe, expect, it } from "vitest";
import {
  buildRelationMatrixTableDescriptors,
  buildRelationArrayTarget,
  isRelationMatrixMember,
  normalizeRelationId,
} from "./relationMatrix";

describe("relation matrix helpers", () => {
  it("adapts row and column records to generic table descriptors", () => {
    expect(
      buildRelationMatrixTableDescriptors(
        [{ _id: "list-1", name: "Weekly" }],
        {
          rowLabelField: "name",
          columnIdField: "_id",
          columnLabelField: "name",
        },
      ),
    ).toEqual({
      columns: [
        { key: "name", isSortable: false, correspondingKey: "name" },
        { key: "Weekly", isSortable: false, correspondingKey: "relation:list-1" },
      ],
      rowKeys: ["name", "relation:list-1"],
    });
  });

  it("normalizes scalar and populated relation ids", () => {
    expect(normalizeRelationId("product-1")).toBe("product-1");
    expect(normalizeRelationId({ _id: "product-2", name: "Tea" })).toBe("product-2");
  });

  it("detects membership in embedded array rows", () => {
    const items = [{ product: "product-1" }, { product: { _id: "product-2" } }];
    expect(isRelationMatrixMember(items, "product", "product-2")).toBe(true);
    expect(isRelationMatrixMember(items, "product", "product-3")).toBe(false);
  });

  it("builds the dynamic-array mutation target from a column", () => {
    expect(
      buildRelationArrayTarget(
        { _id: "list-1", name: "Weekly" },
        {
          columnSchemaName: "countList",
          columnIdField: "_id",
          targetArrayField: "products",
          targetItemMatchField: "product",
        },
      ),
    ).toEqual({
      schemaName: "countList",
      parentId: "list-1",
      arrayField: "products",
      rowIdentityField: "product",
    });
  });
});
