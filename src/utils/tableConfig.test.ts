import { describe, expect, it } from "vitest";
import {
  applyTableNestedRows,
  getLookupLabelValue,
  getTableDataFieldNames,
  getTableLookupKey,
  isTableSearchEnabled,
} from "./tableConfig";

describe("applyTableNestedRows", () => {
  it("builds GenericTable collapsible data from a configured array field", () => {
    const rows = [
      {
        _id: "order-1",
        status: "pending",
        product: [
          {
            productDavinciId: 1441,
            productId: "6a486f0faadf8857d624d263",
            quantity: 1,
          },
        ],
      },
    ];

    const [row] = applyTableNestedRows(rows, {
      nestedRows: {
        enabled: true,
        field: "product",
        header: "Products",
        columns: [
          { field: "productDavinciId", displayName: "Davinci ID", type: "number" },
          { field: "productId", displayName: "Product ID" },
          { field: "quantity", displayName: "Quantity", type: "number" },
        ],
      },
    });

    expect(row.collapsible).toMatchObject({
      collapsibleHeader: "Products",
      collapsibleColumns: [
        { key: "Davinci ID", isSortable: false },
        { key: "Product ID", isSortable: false },
        { key: "Quantity", isSortable: false },
      ],
      collapsibleRows: [
        {
          productDavinciId: 1441,
          productId: "6a486f0faadf8857d624d263",
          quantity: 1,
        },
      ],
      collapsibleRowKeys: [
        { key: "productDavinciId", isDate: false },
        { key: "productId", isDate: false },
        { key: "quantity", isDate: false },
      ],
    });
  });

  it("returns the same rows when nested rows are not enabled", () => {
    const rows = [{ _id: "order-1", product: [{ quantity: 1 }] }];

    expect(applyTableNestedRows(rows, undefined)).toBe(rows);
    expect(
      applyTableNestedRows(rows, {
        nestedRows: { enabled: false, field: "product", columns: [] },
      }),
    ).toBe(rows);
  });

  it("requests the nested array field even when it is not a visible column", () => {
    expect(
      getTableDataFieldNames({
        columns: [
          { field: "date", type: "date" },
          { field: "status", type: "field" },
        ],
        nestedRows: {
          enabled: true,
          field: "items",
          columns: [{ field: "productId" }, { field: "quantity" }],
        },
      }),
    ).toEqual(["date", "status", "items"]);
  });

  it("keeps table search enabled by default and allows disabling it", () => {
    expect(isTableSearchEnabled(undefined)).toBe(true);
    expect(isTableSearchEnabled({ columns: [] })).toBe(true);
    expect(isTableSearchEnabled({ columns: [], enableSearch: true })).toBe(true);
    expect(isTableSearchEnabled({ columns: [], enableSearch: false })).toBe(false);
  });

  it("resolves a lookup label by matching the row field to the selected schema match field", () => {
    const column = {
      field: "productId",
      type: "lookupLabel" as const,
      lookup: {
        schemaName: "product",
        matchField: "_id",
        labelField: "productName",
      },
    };
    const lookupData = new Map([
      [
        getTableLookupKey(column.lookup),
        [
          { _id: "p1", productName: "Espresso" },
          { _id: "p2", productName: "Latte" },
        ],
      ],
    ]);

    expect(getLookupLabelValue(column, { productId: "p2" }, lookupData)).toBe(
      "Latte",
    );
  });

  it("applies lookup labels to nested row columns", () => {
    const rows = [
      {
        _id: "order-1",
        items: [{ productId: "p1", quantity: 2 }],
      },
    ];
    const lookup = {
      schemaName: "product",
      matchField: "_id",
      labelField: "productName",
    };
    const [row] = applyTableNestedRows(
      rows,
      {
        nestedRows: {
          enabled: true,
          field: "items",
          columns: [
            {
              field: "productId",
              displayName: "Product",
              type: "lookupLabel",
              lookup,
            },
            { field: "quantity", displayName: "Quantity", type: "number" },
          ],
        },
      },
      (value) => value,
      new Map([[getTableLookupKey(lookup), [{ _id: "p1", productName: "Espresso" }]]]),
    );

    expect(row.collapsible?.collapsibleRowKeys[0].node?.({ productId: "p1" }))
      .toBe("Espresso");
  });
});
