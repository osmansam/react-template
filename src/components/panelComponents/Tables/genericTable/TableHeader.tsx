import { Tooltip } from "@material-tailwind/react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { GoPlusCircle } from "react-icons/go";
import { outsideSort } from "../../../../utils/outsideSort";
import { ActionType, ColumnType, RowKeyType } from "../../shared/types";
import EnterpriseCheckbox from "../EnterpriseCheckbox";
import { OutsideSortProps, SortConfig } from "./types";

type TableHeaderProps<T> = {
  hasSelectionActions: boolean;
  isSelectionActive: boolean;
  allVisibleSelected: boolean;
  selectedRows: T[];
  setSelectedRows: (rows: T[]) => void;
  currentRows: T[];
  isCollapsible: boolean;
  usedColumns?: ColumnType[];
  usedRowKeys: RowKeyType<T>[];
  actions?: ActionType<T>[];
  isActionsActive: boolean;
  outsideSortProps?: OutsideSortProps;
  sortConfig: SortConfig | null;
  sortRows: (key: string, direction: "ascending" | "descending") => void;
  t: (key: string) => string;
};

export const TableHeader = <T,>({
  hasSelectionActions,
  isSelectionActive,
  allVisibleSelected,
  selectedRows,
  setSelectedRows,
  currentRows,
  isCollapsible,
  usedColumns,
  usedRowKeys,
  actions,
  isActionsActive,
  outsideSortProps,
  sortConfig,
  sortRows,
  t,
}: TableHeaderProps<T>) => (
  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
    <tr>
      {hasSelectionActions && isSelectionActive && (
        <th className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm px-4 py-3">
          {hasSelectionActions && isSelectionActive && (
            <Tooltip content={t("Select All")} placement="top">
              <div className="flex items-center justify-center">
                <EnterpriseCheckbox
                  checked={allVisibleSelected}
                  indeterminate={selectedRows.length > 0 && !allVisibleSelected}
                  onChange={() => {
                    if (allVisibleSelected) {
                      setSelectedRows([]);
                    } else {
                      setSelectedRows(currentRows);
                    }
                  }}
                />
              </div>
            </Tooltip>
          )}
        </th>
      )}
      {isCollapsible && (
        <th className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 w-12"></th>
      )}
      {usedColumns?.map((column, index) => {
        if (column.node) return column.node();
        return (
          <th
            key={index}
            className={`sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm px-4 py-3.5 min-w-8 group ${
              column?.generalColumnClassName || ""
            }`}
          >
            <div
              className={`text-xs uppercase tracking-wider font-semibold text-gray-700 w-max flex items-center gap-2 ${
                column?.className || ""
              } ${
                index === usedColumns?.length - 1 && actions && isActionsActive
                  ? "mx-auto justify-center"
                  : ""
              }`}
            >
              <span className="flex items-center gap-2">
                {column?.isAddable && (
                  <GoPlusCircle
                    onClick={() => column?.onClick?.()}
                    className="text-gray-500 hover:text-blue-600 transition-all cursor-pointer text-lg hover:scale-110"
                  />
                )}
                <span className="select-none">
                  {column.label ?? column.key}
                </span>
              </span>
              <div className="inline-flex items-center">
                {outsideSortProps &&
                  column?.correspondingKey &&
                  outsideSort(
                    column.correspondingKey,
                    outsideSortProps.filterPanelFormElements,
                    outsideSortProps.setFilterPanelFormElements,
                  )}
                {column.isSortable &&
                  !outsideSortProps &&
                  (sortConfig?.key === usedRowKeys[index]?.key &&
                  sortConfig?.direction === "ascending" ? (
                    <button
                      onClick={() =>
                        sortRows(
                          usedRowKeys[index].key as Extract<keyof T, string>,
                          "descending",
                        )
                      }
                      className="p-1 rounded hover:bg-gray-200/50 transition-colors"
                      aria-label="Sort descending"
                    >
                      <FaChevronUp className="text-blue-600 text-sm" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        sortRows(
                          usedRowKeys[index].key as Extract<keyof T, string>,
                          "ascending",
                        )
                      }
                      className="p-1 rounded hover:bg-gray-200/50 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Sort ascending"
                    >
                      <FaChevronDown className="text-gray-500 hover:text-blue-600 text-sm" />
                    </button>
                  ))}
              </div>
            </div>
          </th>
        );
      })}
    </tr>
  </thead>
);
