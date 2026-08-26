import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildRelationMatrixTableDescriptors,
  buildRelationArrayTarget,
  isRelationMatrixMember,
  normalizeRelationId,
  replaceRelationParentInDynamicData,
} from "./relationMatrix";

const componentSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../components/RelationMatrix.tsx"),
  "utf8",
);

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
        {
          key: "Weekly",
          isSortable: false,
          correspondingKey: "relation:list-1",
          className: "mx-auto justify-center",
        },
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

  it("replaces a relation parent inside paginated dynamic cache data", () => {
    const current = {
      items: [
        { _id: "list-1", products: [{ product: "product-1" }] },
        { _id: "list-2", products: [] },
      ],
      totalItems: 2,
      totalPages: 1,
      currentPage: 1,
    };
    const next = replaceRelationParentInDynamicData(
      current,
      { _id: "list-1", products: [] },
      "_id",
    );

    expect(next.items[0]).toEqual({ _id: "list-1", products: [] });
    expect(next.items[1]).toBe(current.items[1]);
  });

  it("does not expose relation visibility as a runtime control", () => {
    expect(componentSource).not.toContain("Show relations");
    expect(componentSource).not.toContain("visibilityToggle");
  });

  it("keeps relation matrix controls inside the table header", () => {
    expect(componentSource).toContain("showOrientationToggle={false}");
    expect(componentSource).toContain("isUpperSide: false");
  });

  it("renders read-only relation cells as boolean table tick icons", () => {
    expect(componentSource).toContain("editable ? (");
    expect(componentSource).toContain("IoCheckmark");
    expect(componentSource).toContain("IoCloseOutline");
    expect(componentSource).toContain('className: "flex justify-center"');
  });
});
