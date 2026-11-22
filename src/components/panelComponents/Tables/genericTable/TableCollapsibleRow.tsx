import type { TableDateFormat } from "../../../../types/page";
import { GenericButton } from "../../FormElements/GenericButton";
import { H5, P1 } from "../../Typography";
import { ActionType, ColumnType, RowKeyType } from "../../shared/types";
import { TableActionButtons } from "./TableActionButtons";

type TableCollapsibleRowProps<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any;
  isRowExpanded: boolean;
  colSpan: number;
  addCollapsible?: ActionType<T>;
  collapsibleActions?: ActionType<T>[];
  isActionsActive: boolean;
  formatDate: (value: unknown, format?: TableDateFormat) => string | null;
  onActionClick: (action: ActionType<T>, row: T) => void;
};

export const TableCollapsibleRow = <T,>({
  row,
  isRowExpanded,
  colSpan,
  addCollapsible,
  collapsibleActions,
  isActionsActive,
  formatDate,
  onActionClick,
}: TableCollapsibleRowProps<T>) => (
  <tr>
    <td
      colSpan={colSpan}
      className="px-4 py-2 border-b transition-max-height duration-300 ease-in-out overflow-hidden"
      style={{ maxHeight: isRowExpanded ? "1000px" : "0" }}
    >
      {row?.collapsible?.collapsibleHeader && (
        <div className="w-[96%] mx-auto mb-2 bg-gray-100 rounded-md px-4 py-[0.3rem] flex flex-row justify-between items-center">
          <H5>{row?.collapsible?.collapsibleHeader}</H5>
          {addCollapsible && (
            <GenericButton
              variant="black"
              size="sm"
              className={`ml-auto ${addCollapsible.className || ""}`}
              onClick={() => onActionClick(addCollapsible, row)}
            >
              <H5>{addCollapsible.name}</H5>
            </GenericButton>
          )}
        </div>
      )}
      <table className="w-[96%] mx-auto">
        <thead className="w-full">
          <tr>
            {row?.collapsible?.collapsibleColumns.length > 0 &&
              row?.collapsible?.collapsibleColumns?.map(
                (column: ColumnType, index: number) => (
                  <th
                    key={index}
                    className={`text-left py-2 px-4 w-fit border-b  ${
                      column?.className || ""
                    } ${column?.generalColumnClassName || ""}`}
                  >
                    <h2 className="font-semibold text-sm ">
                      {column.label ?? column.key}
                    </h2>
                  </th>
                ),
              )}
          </tr>
        </thead>
        <tbody>
          {row?.collapsible?.collapsibleRows.length > 0 &&
            row?.collapsible?.collapsibleRows?.map(
              (collapsibleRow: T, rowIndex: number) => (
                <tr
                  key={rowIndex}
                  className={`${row?.collapsible?.className?.(
                    row?.collapsible?.collapsibleRows[rowIndex],
                  )} `}
                >
                  {row?.collapsible?.collapsibleRowKeys?.map(
                    (rowKey: RowKeyType<T>, keyIndex: number) => {
                      const rawValue = collapsibleRow[rowKey?.key as keyof T];
                      const cellValue = rowKey.isDate
                        ? formatDate(rawValue, rowKey.dateFormat) ||
                          `${rawValue}`
                        : `${rawValue}`;

                      const computedClassName =
                        typeof rowKey?.className === "function"
                          ? rowKey.className(collapsibleRow)
                          : rowKey?.className || "";
                      const computedStyle =
                        typeof rowKey?.style === "function"
                          ? rowKey.style(collapsibleRow)
                          : rowKey?.style || {};

                      const columnClassName =
                        row?.collapsible?.collapsibleColumns?.[keyIndex]
                          ?.generalColumnClassName || "";

                      if (rowKey.node) {
                        return (
                          <td
                            key={keyIndex}
                            className={`px-4 py-3 min-w-20 border-b ${columnClassName}`}
                          >
                            <P1
                              className={computedClassName}
                              style={computedStyle}
                            >
                              {rowKey.node(collapsibleRow)}
                            </P1>
                          </td>
                        );
                      }
                      return (
                        <td
                          key={keyIndex}
                          className={`py-2 px-4 text-sm ${columnClassName} ${
                            rowIndex !==
                              row?.collapsible?.collapsibleRows.length - 1 &&
                            "border-b"
                          }`}
                          style={computedStyle}
                        >
                          {cellValue}
                        </td>
                      );
                    },
                  )}
                  {collapsibleActions && isActionsActive && (
                    <td
                      className={`py-2 px-4  ${
                        rowIndex !==
                          row?.collapsible?.collapsibleRows.length - 1 &&
                        "border-b"
                      }`}
                    >
                      <TableActionButtons
                        row={{ ...row, ...collapsibleRow }}
                        actions={collapsibleActions}
                        onActionClick={onActionClick}
                      />
                    </td>
                  )}
                </tr>
              ),
            )}
        </tbody>
      </table>
    </td>
  </tr>
);
