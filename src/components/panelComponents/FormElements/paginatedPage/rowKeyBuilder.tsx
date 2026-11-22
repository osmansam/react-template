import React from "react";
import { CheckSwitch } from "../../../../common/CheckSwitch";
import {
  LinkCell,
  renderLinkedCellContent,
} from "../../../../components/LinkCell";
import type {
  TableComponentConfig,
  TableToggleConfig,
} from "../../../../types/page";
import { type Field, Types } from "../../../../utils/api/container";
import {
  evaluateRowCondition,
  getMatchingRowClassPresentation,
} from "../../../../utils/genericPageHelpers";
import { formatPopulatedArrayValue } from "../../../../utils/populatedArrayDisplay";
import { renderTableColumnTemplate } from "../../../../utils/tableColumnTemplate";
import {
  getComputedLabelValue,
  getLookupLabelValue,
  getProgressBarValue,
  getTableCellClassName,
  getTableDisplayName,
  getTableLinkConfig,
} from "../../../../utils/tableConfig";
import { formatTableDate } from "../../../../utils/tableDateFormat";
import {
  isBooleanColumnEditable,
  isBooleanColumnSwitchPresentation,
} from "../../../../utils/tableToggles";
import { type GenericItem, isTruthyBooleanValue } from "../tableActionForm";
import {
  formatObjectIdArrayContent,
  formatPopulatedObjectContent,
} from "./cellFormatters";
import type { SelectionDataMap } from "./formInputBuilders";
import {
  BooleanBadgeCell,
  BooleanSwitchCell,
  GrowthPercentageCell,
  ProgressBarCell,
} from "./TableCellComponents";
import { isArrayFieldType } from "./tableHelpers";

export type TableRowKey = {
  key: string;
  isImage?: boolean;
  isDate?: boolean;
  isBoolean?: boolean;
  className?: string | ((row: GenericItem) => string);
  style?: React.CSSProperties | ((row: GenericItem) => React.CSSProperties);
  node?: (row: GenericItem) => React.ReactNode;
};

export const buildBaseRowKeys = ({
  displayFields,
  constantFilter,
  tableConfig,
  tableToggleState,
  configuredTableToggles,
  lookupSelectionDataMap,
  selectionDataMap,
  updateDynamicItem,
}: {
  displayFields: Field[];
  constantFilter?: Record<string, unknown>;
  tableConfig?: TableComponentConfig;
  tableToggleState: Record<string, boolean>;
  configuredTableToggles: TableToggleConfig[];
  lookupSelectionDataMap: SelectionDataMap;
  selectionDataMap: SelectionDataMap;
  updateDynamicItem: (
    id: string | number,
    updates: Partial<GenericItem>,
  ) => void;
}): TableRowKey[] => {
  const constantFilterKeys = constantFilter ? Object.keys(constantFilter) : [];

  return displayFields
    .filter((f) => !constantFilterKeys.includes(f.name))
    .map((f) => {
      const fieldType = (f.type || "").toLowerCase();
      const isArray = isArrayFieldType(f);

      const rowKey: TableRowKey = {
        key: f.name,
        isImage: fieldType === Types.Image,
        isDate: fieldType === Types.Date,
        isBoolean: fieldType === Types.Boolean || fieldType === "bool",
      };

      const cellClassName = getTableCellClassName(tableConfig, f);
      const legacyCellClassName = f.frontend?.rowKeyClassName;
      const rowKeyClassName = cellClassName ?? legacyCellClassName;
      const linkConfig = getTableLinkConfig(tableConfig, f);

      if (rowKeyClassName) {
        rowKey.className = (row: GenericItem) =>
          getMatchingRowClassPresentation(row, rowKeyClassName).className;
        rowKey.style = (row: GenericItem) =>
          getMatchingRowClassPresentation(row, rowKeyClassName).style;
      }

      const columnConfig = tableConfig?.columns?.find(
        (column) => column.field === f.name,
      );

      if (columnConfig?.type === "template") {
        rowKey.node = (row: GenericItem) =>
          renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>
              {renderTableColumnTemplate(columnConfig.template, row)}
            </span>,
          );
        return rowKey;
      }

      if (columnConfig?.type === "computedLabel") {
        const getComputedValue = (row: GenericItem) =>
          getComputedLabelValue(
            tableConfig,
            f.name,
            row,
            evaluateRowCondition,
          );

        if (rowKeyClassName) {
          rowKey.className = (row: GenericItem) =>
            getMatchingRowClassPresentation(
              { ...row, [f.name]: getComputedValue(row) },
              rowKeyClassName,
            ).className;
          rowKey.style = (row: GenericItem) =>
            getMatchingRowClassPresentation(
              { ...row, [f.name]: getComputedValue(row) },
              rowKeyClassName,
            ).style;
        }

        rowKey.node = (row: GenericItem) =>
          renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>{getComputedValue(row)}</span>,
          );
        return rowKey;
      }

      if (columnConfig?.type === "lookupLabel") {
        const getLookupValue = (row: GenericItem) =>
          getLookupLabelValue(columnConfig, row, lookupSelectionDataMap);

        if (rowKeyClassName) {
          rowKey.className = (row: GenericItem) =>
            getMatchingRowClassPresentation(
              { ...row, [f.name]: getLookupValue(row) },
              rowKeyClassName,
            ).className;
          rowKey.style = (row: GenericItem) =>
            getMatchingRowClassPresentation(
              { ...row, [f.name]: getLookupValue(row) },
              rowKeyClassName,
            ).style;
        }

        rowKey.node = (row: GenericItem) =>
          renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>{getLookupValue(row)}</span>,
          );
        return rowKey;
      }

      if (columnConfig?.type === "progressBar") {
        rowKey.node = (row: GenericItem) => (
          <ProgressBarCell
            progress={getProgressBarValue(
              tableConfig,
              f.name,
              row,
              evaluateRowCondition,
            )}
          />
        );
        return rowKey;
      }

      if (columnConfig?.type === "number") {
        rowKey.node = (row: GenericItem) => {
          const v = row[f.name];
          if (v === undefined || v === null || v === "") return <span>-</span>;
          const n = Number(v);
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>{isNaN(n) ? String(v) : n.toLocaleString()}</span>,
          );
        };
        return rowKey;
      }

      if (columnConfig?.type === "currency") {
        rowKey.node = (row: GenericItem) => {
          const v = row[f.name];
          if (v === undefined || v === null || v === "") return <span>-</span>;
          const n = Number(v);
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>
              {isNaN(n)
                ? String(v)
                : n.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
              ₺
            </span>,
          );
        };
        return rowKey;
      }

      if (columnConfig?.type === "percentage") {
        rowKey.node = (row: GenericItem) => {
          const v = row[f.name];
          if (v === undefined || v === null || v === "") return <span>-</span>;
          const n = Number(v);
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>{isNaN(n) ? String(v) : `${n.toLocaleString()}%`}</span>,
          );
        };
        return rowKey;
      }

      if (columnConfig?.type === "growthPercentage") {
        rowKey.node = (row: GenericItem) => {
          const v = row[f.name];
          if (v === undefined || v === null || v === "") return <span>-</span>;
          const n = Number(v);
          if (isNaN(n)) {
            return renderLinkedCellContent(
              f,
              row,
              linkConfig,
              <span>{String(v)}</span>,
            );
          }
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <GrowthPercentageCell value={n} />,
          );
        };
        return rowKey;
      }

      if (columnConfig?.type === "date") {
        rowKey.node = (row: GenericItem) => {
          const v = row[f.name];
          if (!v) return <span>-</span>;
          const formatted = formatTableDate(v, columnConfig.dateFormat);
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>{formatted || String(v)}</span>,
          );
        };
        return rowKey;
      }

      if (columnConfig?.type === "boolean") {
        rowKey.node = (row: GenericItem) => (
          <BooleanBadgeCell isTrue={isTruthyBooleanValue(row[f.name])} />
        );
        return rowKey;
      }

      if (columnConfig?.type === "booleanSwitch") {
        rowKey.node = (row: GenericItem) => {
          const isChecked = isTruthyBooleanValue(row[f.name]);
          const isEditableSwitch =
            isBooleanColumnSwitchPresentation(
              columnConfig.booleanDisplayToggle,
              tableToggleState,
              configuredTableToggles,
            ) &&
            isBooleanColumnEditable(
              columnConfig.booleanEditToggle,
              tableToggleState,
              configuredTableToggles,
            );
          return (
            <BooleanSwitchCell
              isChecked={isChecked}
              isEditableSwitch={isEditableSwitch}
              label={getTableDisplayName(tableConfig, f)}
              onToggle={() => {
                updateDynamicItem(row._id, { [f.name]: !isChecked });
              }}
            />
          );
        };
        return rowKey;
      }

      if (columnConfig?.type === "image") {
        rowKey.isImage = true;
        return rowKey;
      }

      if (columnConfig?.type === "badge") {
        rowKey.node = (row: GenericItem) => {
          const v = row[f.name];
          if (v === undefined || v === null || v === "") return <span>-</span>;
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
              {String(v)}
            </span>,
          );
        };
        return rowKey;
      }

      if (columnConfig?.type === "array") {
        rowKey.node = (row: GenericItem) => {
          const v = row[f.name];
          if (v === undefined || v === null) return <span>-</span>;
          const content = Array.isArray(v)
            ? formatPopulatedArrayValue(v)
            : String(v);
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>{content || "-"}</span>,
          );
        };
        return rowKey;
      }

      if (rowKey.isBoolean) {
        rowKey.node = (row: GenericItem) => (
          <CheckSwitch
            checked={!!row[f.name]}
            onChange={() => {
              updateDynamicItem(row._id, { [f.name]: !row[f.name] });
            }}
          />
        );
      } else if (isArray) {
        rowKey.node = (row: GenericItem) => {
          const value = row[f.name];
          const content = Array.isArray(value)
            ? formatPopulatedArrayValue(value)
            : String(value || "");
          return linkConfig?.linkTemplate ? (
            <LinkCell field={f} row={row} linkConfig={linkConfig} />
          ) : (
            <span>{content}</span>
          );
        };
      } else if (
        (fieldType === Types.ObjectId ||
          fieldType === Types.AutoIncrementId) &&
        f.populationSettings?.displayFields?.length
      ) {
        rowKey.node = (row: GenericItem) => {
          const content = formatPopulatedObjectContent(
            row[f.name],
            f.populationSettings!.displayFields,
          );
          return linkConfig?.linkTemplate ? (
            <LinkCell field={f} row={row} linkConfig={linkConfig} />
          ) : (
            <span>{content}</span>
          );
        };
      } else if (fieldType === Types.ObjectIdArray) {
        rowKey.node = (row: GenericItem) => {
          const content = formatObjectIdArrayContent(
            row[f.name],
            f,
            selectionDataMap,
          );
          return linkConfig?.linkTemplate ? (
            <LinkCell field={f} row={row} linkConfig={linkConfig} />
          ) : (
            <span>{content}</span>
          );
        };
      } else if (linkConfig?.linkTemplate) {
        rowKey.node = (row: GenericItem) => (
          <LinkCell field={f} row={row} linkConfig={linkConfig} />
        );
      }

      return rowKey;
    });
};
