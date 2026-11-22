import type React from "react";
import { CheckSwitch } from "../../../../common/CheckSwitch";
import { LinkCell, renderLinkedCellContent } from "../../../../components/LinkCell";
import type {
  TableComponentConfig,
  TableToggleConfig,
} from "../../../../types/page";
import { Field, Types } from "../../../../utils/api/container";
import {
  evaluateRowCondition,
  getMatchingRowClassPresentation,
} from "../../../../utils/genericPageHelpers";
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
import type { useTableLookupSelectionData } from "../../../../utils/tableLookupSelection";
import {
  isBooleanColumnEditable,
  isBooleanColumnSwitchPresentation,
} from "../../../../utils/tableToggles";
import { type GenericItem, isTruthyBooleanValue } from "../tableActionForm";
import {
  formatArrayCellValue,
  formatCurrencyCellValue,
  formatGrowthPercentageCellValue,
  formatNumberCellValue,
  formatPercentageCellValue,
  formatPopulatedObjectArrayCellValue,
  formatPopulatedObjectCellValue,
} from "./cellFormatters";
import { isArrayFieldType } from "./pageHelpers";
import {
  BadgeCell,
  BooleanBadgeCell,
  BooleanSwitchCell,
  GrowthPercentageCell,
  ProgressBarCell,
} from "./TableCellNodes";

export type BaseRowKey = {
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
  updateDynamicItem,
  selectionDataMap,
  lookupSelectionDataMap,
  tableConfig,
  tableToggleState,
  configuredTableToggles,
}: {
  displayFields: Field[];
  updateDynamicItem: (id: string | number, updates: Partial<GenericItem>) => void;
  selectionDataMap: Map<string, Record<string, unknown>[]>;
  lookupSelectionDataMap: ReturnType<typeof useTableLookupSelectionData>;
  tableConfig?: TableComponentConfig;
  tableToggleState: Record<string, boolean>;
  configuredTableToggles: TableToggleConfig[];
}): BaseRowKey[] =>
  displayFields.map((f) => {
    const fieldType = (f.type || "").toLowerCase();
    const originalType = f.type || "";
    const isArray = isArrayFieldType(fieldType, originalType);

    const rowKey: BaseRowKey = {
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
          <span>{renderTableColumnTemplate(columnConfig.template, row)}</span>,
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
      rowKey.node = (row: GenericItem) => {
        const progress = getProgressBarValue(
          tableConfig,
          f.name,
          row,
          evaluateRowCondition,
        );
        if (!progress) return <span>-</span>;
        return <ProgressBarCell {...progress} />;
      };
      return rowKey;
    }

    if (columnConfig?.type === "number") {
      rowKey.node = (row: GenericItem) => {
        const formatted = formatNumberCellValue(row[f.name]);
        if (formatted === null) return <span>-</span>;
        return renderLinkedCellContent(f, row, linkConfig, <span>{formatted}</span>);
      };
      return rowKey;
    }

    if (columnConfig?.type === "currency") {
      rowKey.node = (row: GenericItem) => {
        const formatted = formatCurrencyCellValue(row[f.name]);
        if (formatted === null) return <span>-</span>;
        return renderLinkedCellContent(
          f,
          row,
          linkConfig,
          <span>{formatted} ₺</span>,
        );
      };
      return rowKey;
    }

    if (columnConfig?.type === "percentage") {
      rowKey.node = (row: GenericItem) => {
        const formatted = formatPercentageCellValue(row[f.name]);
        if (formatted === null) return <span>-</span>;
        return renderLinkedCellContent(f, row, linkConfig, <span>{formatted}</span>);
      };
      return rowKey;
    }

    if (columnConfig?.type === "growthPercentage") {
      rowKey.node = (row: GenericItem) => {
        const presentation = formatGrowthPercentageCellValue(row[f.name]);
        if (presentation.kind === "empty") return <span>-</span>;
        if (presentation.kind === "raw") {
          return renderLinkedCellContent(
            f,
            row,
            linkConfig,
            <span>{presentation.text}</span>,
          );
        }
        return renderLinkedCellContent(
          f,
          row,
          linkConfig,
          <GrowthPercentageCell presentation={presentation} />,
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
        const isInteractive =
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
            isInteractive={isInteractive}
            label={getTableDisplayName(tableConfig, f)}
            onToggle={() => {
              updateDynamicItem(row._id, {
                [f.name]: !isChecked,
              });
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
          <BadgeCell text={String(v)} />,
        );
      };
      return rowKey;
    }

    if (columnConfig?.type === "array") {
      rowKey.node = (row: GenericItem) => {
        const v = row[f.name];
        if (v === undefined || v === null) return <span>-</span>;
        const content = Array.isArray(v)
          ? formatArrayCellValue(v)
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
            updateDynamicItem(row._id, {
              [f.name]: !row[f.name],
            });
          }}
        />
      );
    } else if (isArray) {
      rowKey.node = (row: GenericItem) => {
        const content = formatArrayCellValue(row[f.name]);
        return linkConfig?.linkTemplate ? (
          <LinkCell field={f} row={row} linkConfig={linkConfig} />
        ) : (
          <span>{content}</span>
        );
      };
    } else if (
      (fieldType === Types.ObjectId || fieldType === Types.AutoIncrementId) &&
      f.populationSettings &&
      f.populationSettings.displayFields &&
      f.populationSettings.displayFields.length > 0
    ) {
      rowKey.node = (row: GenericItem) => {
        const content = formatPopulatedObjectCellValue(
          row[f.name],
          f.populationSettings!.displayFields,
        );
        return linkConfig?.linkTemplate ? (
          <LinkCell field={f} row={row} linkConfig={linkConfig} />
        ) : (
          <span>{content}</span>
        );
      };
    } else if (
      fieldType === Types.ObjectIdArray &&
      f.populationSettings &&
      f.populationSettings.displayFields &&
      f.populationSettings.displayFields.length > 0
    ) {
      rowKey.node = (row: GenericItem) => {
        const content = formatPopulatedObjectArrayCellValue(
          row[f.name],
          f.populationSettings!.displayFields,
          f.populationSettings!.inputSelectionField,
          selectionDataMap.get(f.name) || [],
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
