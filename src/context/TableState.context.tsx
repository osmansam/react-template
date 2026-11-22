/* eslint-disable react-refresh/only-export-components -- colocated table context and provider */
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useGeneralContext } from "./General.context";
import type { ColumnType } from "../components/panelComponents/shared/types";
import type { TableRow } from "./General.context";
type GeneralState = ReturnType<typeof useGeneralContext>;
const TableState = createContext<GeneralState | null>(null);
/** A page wrapper and its table share one instance; sibling tables never share data controls. */
export function TableStateScope({ children }: PropsWithChildren) {
  const parent = useContext(TableState),
    base = useGeneralContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfigKey, setSortConfigKey] =
    useState<GeneralState["sortConfigKey"]>(null);
  const [expandedRows, setExpandedRows] = useState<
    GeneralState["expandedRows"]
  >({});
  const [tableColumns, setTableColumns] = useState<
    Record<string, ColumnType[]>
  >({});
  const [selectedRows, setSelectedRows] = useState<TableRow[]>([]);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(base.rowsPerPage);
  if (parent) return <>{children}</>;
  const resetGeneralContext = () => {
    setSearchQuery("");
    setSortConfigKey(null);
    setExpandedRows({});
    setSelectedRows([]);
    setIsSelectionActive(false);
    base.resetGeneralContext();
  };
  return (
    <TableState.Provider
      value={{
        ...base,
        searchQuery,
        setSearchQuery,
        sortConfigKey,
        setSortConfigKey,
        expandedRows,
        setExpandedRows,
        tableColumns,
        setTableColumns,
        selectedRows,
        setSelectedRows,
        isSelectionActive,
        setIsSelectionActive,
        rowsPerPage,
        setRowsPerPage,
        resetGeneralContext,
      }}
    >
      {children}
    </TableState.Provider>
  );
}
export function useTableContext() {
  const general = useGeneralContext();
  return useContext(TableState) ?? general;
}
