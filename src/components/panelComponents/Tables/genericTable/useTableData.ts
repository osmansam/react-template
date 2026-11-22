import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { resolveSelectedRowIds } from "../../../../pageRuntime/tableOutputAdapter";
import { syncTranslatedTableColumns } from "../../../../utils/tableColumns";
import { ColumnType, RowKeyType } from "../../shared/types";
import {
  computePaginationMetrics,
  filterTableRows,
  getUsedColumns,
  getUsedRowKeys,
  paginateTableRows,
  sortTableRows,
} from "./tableDataUtils";
import { PaginationProps, SortConfig } from "./types";

type UseTableDataParams<T> = {
  title?: string;
  columns: ColumnType[];
  rowKeys: RowKeyType<T>[];
  searchRowKeys?: RowKeyType<T>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  isActionsAtFront: boolean;
  isSearch: boolean;
  searchQuery: string;
  sortConfigKey: SortConfig | null;
  setSortConfigKey: (config: SortConfig | null) => void;
  tableColumns: Record<string, ColumnType[]>;
  setTableColumns: Dispatch<SetStateAction<Record<string, ColumnType[]>>>;
  isRowsPerPage: boolean;
  pagination?: PaginationProps;
  currentPage: number;
  rowsPerPage: number;
  onVisibleRowIdsChange?: (ids: readonly (string | number)[]) => void;
};

export const useTableData = <T,>({
  title,
  columns,
  rowKeys,
  searchRowKeys,
  rows,
  isActionsAtFront,
  isSearch,
  searchQuery,
  sortConfigKey,
  setSortConfigKey,
  tableColumns,
  setTableColumns,
  isRowsPerPage,
  pagination,
  currentPage,
  rowsPerPage,
  onVisibleRowIdsChange,
}: UseTableDataParams<T>) => {
  // Derive sortConfig from sortConfigKey instead of maintaining separate state
  const sortConfig = useMemo(
    () =>
      sortConfigKey
        ? {
            key: sortConfigKey.key,
            direction: sortConfigKey.direction,
          }
        : null,
    [sortConfigKey],
  );

  useEffect(() => {
    if (!title) return;
    setTableColumns((prev) => {
      const synchronized = syncTranslatedTableColumns(prev[title], columns);
      return synchronized === prev[title]
        ? prev
        : { ...prev, [title]: synchronized };
    });
  }, [title, columns, setTableColumns]);

  const usedColumns = getUsedColumns(title, tableColumns, columns);
  const usedRowKeys = getUsedRowKeys(
    title,
    tableColumns,
    rowKeys,
    isActionsAtFront,
  );

  const baseRows = useMemo(() => rows ?? [], [rows]);

  const filteredRows = useMemo(() => {
    const keys = searchRowKeys ?? usedRowKeys;
    return filterTableRows(baseRows, isSearch, searchQuery, keys);
  }, [baseRows, isSearch, searchQuery, searchRowKeys, usedRowKeys]);

  const sortedRows = useMemo(
    () => sortTableRows(filteredRows, sortConfig),
    [filteredRows, sortConfig],
  );

  const { usedTotalRows, totalPages, usedTotalPages } =
    computePaginationMetrics(sortedRows?.length, rowsPerPage, pagination);

  const currentRows = useMemo(
    () =>
      paginateTableRows(
        sortedRows,
        isRowsPerPage,
        pagination,
        currentPage,
        rowsPerPage,
      ),
    [sortedRows, isRowsPerPage, pagination, currentPage, rowsPerPage],
  );

  const visibleRowIdsKey = JSON.stringify(
    currentRows.flatMap((row) => resolveSelectedRowIds([row], true) ?? []),
  );
  useEffect(() => {
    onVisibleRowIdsChange?.(
      JSON.parse(visibleRowIdsKey) as (string | number)[],
    );
  }, [visibleRowIdsKey, rows, onVisibleRowIdsChange]);

  const sortRows = (key: string, direction: "ascending" | "descending") => {
    setSortConfigKey({ key, direction });
  };

  return {
    sortConfig,
    usedColumns,
    usedRowKeys,
    sortedRows,
    currentRows,
    usedTotalRows,
    totalPages,
    usedTotalPages,
    sortRows,
  };
};
