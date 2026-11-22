import { describe, expect, it } from "vitest";
import {
  areAllVisibleSelected,
  computePaginationMetrics,
  filterTableRows,
  formatCellValue,
  formatParsedFloatCell,
  getSelectionKey,
  getUsedColumns,
  getUsedRowKeys,
  isRowSelectedInList,
  paginateTableRows,
  sortTableRows,
  toggleRowInSelection,
  truncateTooltipValue,
} from "./tableDataUtils";

describe("column and rowKey visibility helpers", () => {
  const columns = [
    { key: "Name", isActive: true, isSortable: false },
    { key: "Age", isActive: false, isSortable: false },
  ];
  const rowKeys = [{ key: "name" }, { key: "age" }];

  it("filters active columns and rowKeys when title is set", () => {
    const tableColumns = { Users: columns };
    expect(getUsedColumns("Users", tableColumns, columns)).toEqual([
      { key: "Name", isActive: true, isSortable: false },
    ]);
    expect(getUsedRowKeys("Users", tableColumns, rowKeys, false)).toEqual([
      { key: "name" },
    ]);
  });

  it("shifts rowKey index when isActionsAtFront is true", () => {
    const tableColumns = {
      Users: [
        { key: "Actions", isActive: true, isSortable: false },
        { key: "Name", isActive: false, isSortable: false },
        { key: "Age", isActive: true, isSortable: false },
      ],
    };
    expect(getUsedRowKeys("Users", tableColumns, rowKeys, true)).toEqual([
      { key: "age" },
    ]);
  });

  it("returns original columns and rowKeys when title is omitted", () => {
    expect(getUsedColumns(undefined, {}, columns)).toBe(columns);
    expect(getUsedRowKeys(undefined, {}, rowKeys, false)).toBe(rowKeys);
  });
});

describe("filterTableRows", () => {
  const rows = [
    { name: "İstanbul", count: 42, active: true },
    { name: "Ankara", count: 7, active: false },
  ];
  const keys = [{ key: "name" }, { key: "count" }, { key: "active" }];

  it("returns baseRows when search is disabled or query is blank", () => {
    expect(filterTableRows(rows, false, "ankara", keys)).toBe(rows);
    expect(filterTableRows(rows, true, "   ", keys)).toBe(rows);
  });

  it("matches strings with tr-TR locale, numbers, and booleans", () => {
    expect(filterTableRows(rows, true, "istanbul", keys)).toEqual([rows[0]]);
    expect(filterTableRows(rows, true, "42", keys)).toEqual([rows[0]]);
    expect(filterTableRows(rows, true, "false", keys)).toEqual([rows[1]]);
  });
});

describe("sortTableRows", () => {
  it("sorts numerically and lexicographically, respecting isSortable: false", () => {
    const rows = [
      { id: 1, name: "Charlie", amount: "10" },
      { id: 2, name: "alice", amount: "2" },
      { id: 3, name: "Bob", amount: "100" },
    ];
    expect(
      sortTableRows(rows, { key: "amount", direction: "ascending" }).map(
        (r) => r.id,
      ),
    ).toEqual([2, 1, 3]);
    expect(
      sortTableRows(rows, { key: "name", direction: "descending" }).map(
        (r) => r.id,
      ),
    ).toEqual([1, 3, 2]);

    const lockedRows = [
      { id: 1, name: "B", isSortable: false },
      { id: 2, name: "A" },
    ];
    expect(
      sortTableRows(lockedRows, { key: "name", direction: "ascending" }).map(
        (r) => r.id,
      ),
    ).toEqual([1, 2]);
  });
});

describe("pagination helpers", () => {
  it("computes local and external pagination metrics", () => {
    expect(computePaginationMetrics(25, 10)).toEqual({
      usedTotalRows: 25,
      totalPages: 3,
      usedTotalPages: 3,
    });
    expect(
      computePaginationMetrics(10, 10, { totalRows: 95, totalPages: 10 }),
    ).toEqual({
      usedTotalRows: 95,
      totalPages: 10,
      usedTotalPages: 10,
    });
  });

  it("slices rows only for local pagination", () => {
    const rows = [1, 2, 3, 4, 5];
    expect(paginateTableRows(rows, true, undefined, 2, 2)).toEqual([3, 4]);
    expect(paginateTableRows(rows, false, undefined, 2, 2)).toBe(rows);
    expect(
      paginateTableRows(rows, true, { totalRows: 5, totalPages: 3 }, 2, 2),
    ).toBe(rows);
  });
});

describe("selection helpers", () => {
  const rowA = { _id: "a", name: "A" };
  const rowAClone = { _id: "a", name: "A-clone" };
  const rowB = { id: 2, name: "B" };

  it("identifies rows by _id, id, or object identity", () => {
    expect(getSelectionKey(rowA)).toBe("a");
    expect(getSelectionKey(rowB)).toBe(2);
    const plain = { name: "no-id" };
    expect(getSelectionKey(plain)).toBe(plain);
    expect(isRowSelectedInList([rowA], rowAClone)).toBe(true);
  });

  it("toggles selection and checks allVisibleSelected", () => {
    const added = toggleRowInSelection([], rowA);
    expect(added).toEqual([rowA]);
    expect(areAllVisibleSelected(added, [rowA])).toBe(true);
    expect(areAllVisibleSelected(added, [rowA, rowB])).toBe(false);
    expect(toggleRowInSelection(added, rowAClone)).toEqual([]);
  });
});

describe("cell formatting helpers", () => {
  it("formats floats, dates, arrays, and truncated tooltips", () => {
    expect(formatParsedFloatCell("12.50")).toBe("12.5");
    expect(formatParsedFloatCell("12.00")).toBe("12");
    expect(formatParsedFloatCell("12.345")).toBe("12.35");

    expect(
      formatCellValue("2025-01-01", true, undefined, () => "01.01.2025"),
    ).toBe("01.01.2025");
    expect(
      formatCellValue("raw", true, undefined, () => null),
    ).toBe("raw");
    expect(
      formatCellValue(["A", "B"], false, undefined, () => null),
    ).toBe("A, B");

    expect(truncateTooltipValue("abcdef", 4, true)).toBe("abcd...");
    expect(truncateTooltipValue("abcdef", 4, false)).toBe("abcdef");
    expect(truncateTooltipValue("abc", 4, true)).toBe("abc");
  });
});
