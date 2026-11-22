import React, { Fragment } from "react";
import { resolveSelectedRowIds } from "../../../../pageRuntime/tableOutputAdapter";
import type { TableDateFormat } from "../../../../types/page";
import { P1 } from "../../Typography";
import { ActionType, ColumnType, RowKeyType } from "../../shared/types";
import EnterpriseCheckbox from "../EnterpriseCheckbox";
import ExpandCollapseIcon from "../ExpandCollapseIcon";
import CustomTooltip from "../Tooltip";
import { TableActionButtons } from "./TableActionButtons";
import { TableCollapsibleRow } from "./TableCollapsibleRow";
import {
  formatCellValue,
  formatParsedFloatCell,
  truncateTooltipValue,
} from "./tableDataUtils";

type TableBodyRowsProps<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentRows: any[];
  expandedRows: { [key: string]: boolean };
  isDraggable: boolean;
  activeRecordId?: string | number;
  onRecordActivate?: (id: string | number) => void;
  handleDragStart: (
    e: React.DragEvent<HTMLTableRowElement>,
    draggedRow: T,
  ) => void;
  handleDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLTableRowElement>, targetRow: T) => void;
  rowClassNameFunction?: (row: T) => string;
  rowStyleFunction?: (row: T) => React.CSSProperties;
  hasSelectionActions: boolean;
  isSelectionActive: boolean;
  isRowSelected: (row: T) => boolean;
  toggleSelectedRow: (row: T) => void;
  isCollapsibleCheckActive: boolean;
  isCollapsible: boolean;
  toggleRowExpansion: (rowId: string) => void;
  actions?: ActionType<T>[];
  isActionsAtFront: boolean;
  isActionsActive: boolean;
  usedRowKeys: RowKeyType<T>[];
  usedColumns?: ColumnType[];
  formatDate: (value: unknown, format?: TableDateFormat) => string | null;
  tooltipLimit: number;
  isToolTipEnabled: boolean;
  imageHolder?: string;
  onOpenImageModal: (src: string) => void;
  onActionClick: (action: ActionType<T>, row: T) => void;
  addCollapsible?: ActionType<T>;
  collapsibleActions?: ActionType<T>[];
  t: (key: string) => string;
};

export const TableBodyRows = <T,>({
  currentRows,
  expandedRows,
  isDraggable,
  activeRecordId,
  onRecordActivate,
  handleDragStart,
  handleDragOver,
  handleDrop,
  rowClassNameFunction,
  rowStyleFunction,
  hasSelectionActions,
  isSelectionActive,
  isRowSelected,
  toggleSelectedRow,
  isCollapsibleCheckActive,
  isCollapsible,
  toggleRowExpansion,
  actions,
  isActionsAtFront,
  isActionsActive,
  usedRowKeys,
  usedColumns,
  formatDate,
  tooltipLimit,
  isToolTipEnabled,
  imageHolder,
  onOpenImageModal,
  onActionClick,
  addCollapsible,
  collapsibleActions,
  t,
}: TableBodyRowsProps<T>) => (
  <tbody>
    {currentRows.map((row, rowIndex) => {
      const rowId = `row-${rowIndex}`;
      const isRowExpanded = expandedRows[rowId];
      const recordId = onRecordActivate
        ? resolveSelectedRowIds([row], true)?.[0]
        : undefined;
      const canActivate =
        onRecordActivate !== undefined && recordId !== undefined;
      const isActiveRecord = canActivate && activeRecordId === recordId;
      return (
        <Fragment key={rowId}>
          <tr
            draggable={isDraggable}
            tabIndex={canActivate ? 0 : undefined}
            aria-selected={canActivate ? isActiveRecord : undefined}
            data-table-record-active={
              canActivate ? String(isActiveRecord) : undefined
            }
            onClick={
              canActivate
                ? (event) => {
                    if (
                      event.defaultPrevented ||
                      (event.target instanceof Element &&
                        event.target.closest(
                          "button, a, input, select, textarea, label, [role='button'], [role='checkbox'], [role='switch'], [contenteditable], [data-no-record-activate]",
                        ))
                    )
                      return;
                    onRecordActivate?.(recordId!);
                  }
                : undefined
            }
            onKeyDown={
              canActivate
                ? (event) => {
                    if (
                      event.target !== event.currentTarget ||
                      (event.key !== "Enter" && event.key !== " ")
                    )
                      return;
                    event.preventDefault();
                    onRecordActivate?.(recordId!);
                  }
                : undefined
            }
            onDragStart={(e) => handleDragStart(e, row)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, row)}
            className={`${
              rowIndex !== currentRows.length - 1 && !isRowExpanded
                ? "border-b "
                : ""
            }  ${rowClassNameFunction?.(row) ?? ""}`}
            style={rowStyleFunction?.(row)}
          >
            {hasSelectionActions && isSelectionActive && (
              <td data-no-record-activate="" className="w-6 h-6 mx-auto p-1">
                <div className="flex items-center justify-center">
                  <EnterpriseCheckbox
                    checked={isRowSelected(row)}
                    onChange={() => toggleSelectedRow(row)}
                  />
                </div>
              </td>
            )}
            {(!isCollapsibleCheckActive ||
              (isCollapsible &&
                row?.collapsible?.collapsibleRows?.length > 0)) && (
              <td data-no-record-activate="" className="text-center">
                <ExpandCollapseIcon
                  isExpanded={isRowExpanded}
                  onClick={() => toggleRowExpansion(rowId)}
                  className="mx-auto"
                />
              </td>
            )}
            {isCollapsibleCheckActive &&
              row?.collapsible?.collapsibleRows?.length === 0 && (
                <td className="w-6 h-6 mx-auto p-1 "></td>
              )}
            {actions && isActionsAtFront && isActionsActive && (
              <td>
                <TableActionButtons
                  row={row}
                  actions={actions}
                  onActionClick={onActionClick}
                />
              </td>
            )}
            {usedRowKeys?.map((rowKey, keyIndex) => {
              // Compute className - handle both string and function
              const computedClassName =
                typeof rowKey?.className === "function"
                  ? rowKey.className(row)
                  : rowKey?.className || "";
              const computedStyle =
                typeof rowKey?.style === "function"
                  ? rowKey.style(row)
                  : rowKey?.style || {};

              const columnClassName =
                usedColumns?.[keyIndex]?.generalColumnClassName || "";

              if (rowKey.node) {
                return (
                  <td
                    key={keyIndex}
                    className={`px-4 py-3 min-w-20 ${columnClassName}`}
                  >
                    <span className={computedClassName} style={computedStyle}>
                      {rowKey.node(row)}
                    </span>
                  </td>
                );
              }
              if (
                !rowKey?.isImage &&
                (row[rowKey.key as keyof T] === undefined ||
                  row[rowKey.key as keyof T] === null ||
                  row[rowKey.key as keyof T] === "")
              ) {
                return (
                  <td
                    key={keyIndex}
                    className={`px-4 py-3 min-w-20 ${columnClassName}`}
                  >
                    <span className={computedClassName} style={computedStyle}>
                      -
                    </span>
                  </td>
                );
              }
              if (rowKey.isParseFloat) {
                const formattedValue = formatParsedFloatCell(
                  row[rowKey.key as keyof T],
                );
                return (
                  <td
                    key={keyIndex}
                    className={`px-4 py-3 min-w-20 ${columnClassName}`}
                  >
                    <P1 className={computedClassName} style={computedStyle}>
                      {formattedValue} ₺
                    </P1>
                  </td>
                );
              }

              // Format date if explicitly marked as date field
              const rawValue = row[rowKey.key as keyof T];
              const cellValue = formatCellValue(
                rawValue,
                rowKey.isDate,
                rowKey.dateFormat,
                formatDate,
              );

              const displayValue = truncateTooltipValue(
                cellValue,
                tooltipLimit,
                isToolTipEnabled,
              );
              let style: React.CSSProperties = { ...computedStyle };

              if (rowKey.isOptional && rowKey.options) {
                const matchedOption = rowKey.options.find(
                  (option) =>
                    option.label === String(row[rowKey.key as keyof T]),
                );
                style = {
                  ...style,
                  color: matchedOption?.textColor,
                  backgroundColor: matchedOption?.bgColor,
                };
                return (
                  <td
                    key={keyIndex}
                    className={`px-4 py-3 min-w-32 md:min-w-0 ${columnClassName}`}
                    style={style}
                  >
                    <P1
                      className={`w-fit px-2 py-1 rounded-md font-semibold ${computedClassName}`}
                      style={style}
                    >
                      {matchedOption?.label}
                    </P1>
                  </td>
                );
              }
              return (
                <td
                  key={keyIndex}
                  className={`px-4 py-3 min-w-20 md:min-w-0 ${columnClassName}`}
                  style={style}
                >
                  {rowKey.isImage ? (
                    (() => {
                      const imageSrc =
                        (row[rowKey.key as keyof T] as string) || imageHolder;
                      if (!imageSrc) return <span>-</span>;

                      return (
                        <button
                          type="button"
                          className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                          aria-label={t("Open image preview")}
                          onClick={() => onOpenImageModal(imageSrc)}
                        >
                          <img
                            src={imageSrc}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover shadow-sm transition-opacity hover:opacity-90"
                            onError={(event) => {
                              if (
                                imageHolder &&
                                event.currentTarget.src !== imageHolder
                              ) {
                                event.currentTarget.src = imageHolder;
                              }
                            }}
                          />
                        </button>
                      );
                    })()
                  ) : cellValue.length > tooltipLimit && isToolTipEnabled ? (
                    <CustomTooltip content={cellValue}>
                      <P1 className={computedClassName} style={style}>
                        {displayValue}
                      </P1>
                    </CustomTooltip>
                  ) : (
                    <P1 className={computedClassName} style={style}>
                      {displayValue}
                    </P1>
                  )}
                </td>
              );
            })}
            <td>
              {actions &&
                isActionsActive &&
                !(row?.isSortable === false) &&
                !(row?.isActionsDisabled ?? false) &&
                !isActionsAtFront && (
                  <TableActionButtons
                    row={row}
                    actions={actions}
                    onActionClick={onActionClick}
                  />
                )}
              {actions &&
                isActionsActive &&
                (row?.isActionsDisabled ?? false) && (
                  <div className="flex flex-row my-auto h-full gap-3 items-center">
                    <P1>{t("Constant")}</P1>
                  </div>
                )}
            </td>
          </tr>
          {isRowExpanded && (
            <TableCollapsibleRow
              row={row}
              isRowExpanded={isRowExpanded}
              colSpan={(usedColumns?.length ?? 0) + (isActionsActive ? 1 : 0)}
              addCollapsible={addCollapsible}
              collapsibleActions={collapsibleActions}
              isActionsActive={isActionsActive}
              formatDate={formatDate}
              onActionClick={onActionClick}
            />
          )}
        </Fragment>
      );
    })}
  </tbody>
);
