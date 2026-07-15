import { describe, expect, it } from "vitest";
import { applyTableNestedRows } from "./tableConfig";

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
});
