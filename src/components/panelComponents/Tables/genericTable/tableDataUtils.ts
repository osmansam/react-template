import { formatPopulatedArrayValue } from "../../../../utils/populatedArrayDisplay";
import type { TableDateFormat } from "../../../../types/page";
import { ColumnType, RowKeyType } from "../../shared/types";
import { PaginationProps, SortConfig } from "./types";

export const getUsedColumns = (
  title: string | undefined,
  tableColumns: Record<string, ColumnType[]>,
  columns: ColumnType[],
): ColumnType[] | undefined =>
  title
    ? tableColumns[title]?.filter((column) => column.isActive)
    : columns;

export const getUsedRowKeys = <T,>(
  title: string | undefined,
  tableColumns: Record<string, ColumnType[]>,
  rowKeys: RowKeyType<T>[],
  isActionsAtFront: boolean,
): RowKeyType<T>[] =>
  title
    ? rowKeys.filter(
        (_rk, index) =>
          tableColumns[title]?.[isActionsAtFront ? index + 1 : index]?.isActive,
      )
    : rowKeys;

export const filterTableRows = <T,>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseRows: any[],
  isSearch: boolean,
  searchQuery: string,
  keys: RowKeyType<T>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] => {
  if (!isSearch) return baseRows;
  const q = searchQuery.trimStart().toLocaleLowerCase("tr-TR");
  if (!q) return baseRows;
  return baseRows.filter((row) =>
    keys.some((rowKey) => {
      const value = row[rowKey.key as keyof typeof row];
      if (typeof value === "string")
        return value.toLocaleLowerCase("tr-TR").includes(q);
      if (typeof value === "number") return value.toString().includes(q);
      if (typeof value === "boolean")
        return (value ? "true" : "false").includes(q);
      return false;
    }),
  );
};

export const sortTableRows = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredRows: any[],
  sortConfig: SortConfig | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] => {
  if (!sortConfig) return filteredRows;
  const { key, direction } = sortConfig;
  return [...filteredRows].sort((a, b) => {
    const isSortable = (a["isSortable"] ?? true) && (b["isSortable"] ?? true);
    if (!isSortable) return 0;
    const aNum = Number(a[key]);
    const bNum = Number(b[key]);
    const isNumeric = !isNaN(aNum) && !isNaN(bNum);
    const valA = isNumeric ? aNum : String(a[key] ?? "").toLowerCase();
    const valB = isNumeric ? bNum : String(b[key] ?? "").toLowerCase();
    if (valA < valB) return direction === "ascending" ? -1 : 1;
    if (valA > valB) return direction === "ascending" ? 1 : -1;
    return 0;
  });
};

export const computePaginationMetrics = (
  sortedRowsLength: number,
  rowsPerPage: number,
  pagination?: PaginationProps,
): { usedTotalRows: number; totalPages: number; usedTotalPages: number } => {
  const usedTotalRows = pagination ? pagination.totalRows : sortedRowsLength;
  const totalPages = Math.ceil(usedTotalRows / rowsPerPage);
  const usedTotalPages = pagination ? pagination.totalPages : totalPages;
  return { usedTotalRows, totalPages, usedTotalPages };
};

export const paginateTableRows = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sortedRows: any[],
  isRowsPerPage: boolean,
  pagination: PaginationProps | undefined,
  currentPage: number,
  rowsPerPage: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] => {
  if (!isRowsPerPage || pagination) return sortedRows;
  const start = (currentPage - 1) * rowsPerPage;
  const end = currentPage * rowsPerPage;
  return sortedRows?.slice(start, end);
};

export const getSelectionKey = <T,>(row: T): string | number | T => {
  if (row && typeof row === "object") {
    const record = row as Record<string, unknown>;
    const id = record._id ?? record.id;
    if (typeof id === "string" || typeof id === "number") {
      return id;
    }
  }
  return row;
};

export const isSameSelectedRow = <T,>(left: T, right: T): boolean =>
  getSelectionKey(left) === getSelectionKey(right);

export const isRowSelectedInList = <T,>(
  selectedRows: T[],
  row: T,
): boolean =>
  selectedRows.some((selectedRow) => isSameSelectedRow(selectedRow, row));

export const toggleRowInSelection = <T,>(
  selectedRows: T[],
  row: T,
): T[] => {
  if (isRowSelectedInList(selectedRows, row)) {
    return selectedRows.filter(
      (selectedRow) => !isSameSelectedRow(selectedRow, row),
    );
  }
  return [...selectedRows, row];
};

export const areAllVisibleSelected = <T,>(
  selectedRows: T[],
  currentRows: T[],
): boolean =>
  selectedRows.length > 0 &&
  selectedRows.length === currentRows.length &&
  currentRows.every((row) => isRowSelectedInList(selectedRows, row));

export const formatParsedFloatCell = (value: unknown): string =>
  parseFloat(value as string)
    .toFixed(2)
    .replace(/\.?0*$/, "");

export const formatCellValue = (
  rawValue: unknown,
  isDate: boolean | undefined,
  rowDateFormat: TableDateFormat | undefined,
  formatDate: (value: unknown, format?: TableDateFormat) => string | null,
): string => {
  if (isDate) {
    return formatDate(rawValue, rowDateFormat) || `${rawValue}`;
  }
  if (Array.isArray(rawValue)) {
    return formatPopulatedArrayValue(rawValue);
  }
  return `${rawValue}`;
};

export const truncateTooltipValue = (
  cellValue: string,
  tooltipLimit: number,
  isToolTipEnabled: boolean,
): string =>
  cellValue.length > tooltipLimit && isToolTipEnabled
    ? `${cellValue.substring(0, tooltipLimit)}...`
    : cellValue;
