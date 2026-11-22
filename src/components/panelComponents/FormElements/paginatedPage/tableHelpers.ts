import type React from "react";
import type { FormElementsState } from "../../../../types";
import type {
  TableComponentConfig,
  TableFilterPanelInputConfig,
  TableToggleConfig,
} from "../../../../types/page";
import {
  type ContainerModel,
  type Field,
  Types,
} from "../../../../utils/api/container";
import {
  getFieldLabel,
  getMatchingRowClassNames,
  isDisplayablePrimitive,
  normalizeField,
  tailwindBgToStyle,
} from "../../../../utils/genericPageHelpers";
import { getTableDisplayName } from "../../../../utils/tableConfig";
import { resolveTableDragState } from "../../../../utils/tableRowReorder";
import { isTableColumnVisible } from "../../../../utils/tableToggles";
import type { GenericItem } from "../tableActionForm";

export type TranslateFn = (key: string) => string;

export type TableColumnItem = {
  key: string;
  label?: string;
  isSortable: boolean;
  correspondingKey?: string;
};

export const isArrayFieldType = (field: Field): boolean => {
  const fieldType = (field.type || "").toLowerCase();
  const originalType = field.type || "";
  const isStringArray =
    fieldType === Types.StringArray ||
    originalType === "stringArray" ||
    fieldType === "string[]" ||
    fieldType === "array<string>";
  const isIntArray =
    fieldType === Types.IntArray ||
    originalType === "intArray" ||
    fieldType === "int[]" ||
    fieldType === "array<int>";
  const isNumberArray =
    fieldType === Types.NumberArray ||
    originalType === "numberArray" ||
    fieldType === "number[]" ||
    fieldType === "array<number>";
  return isStringArray || isIntArray || isNumberArray;
};

export const mergeTableRequestFilters = (
  filters: FormElementsState,
  constantFilter?: Record<string, unknown>,
  tableConfig?: TableComponentConfig,
): FormElementsState => {
  const constantSort = tableConfig?.constantSort;
  const hasUserSort = Boolean(filters.sort);
  const dragState = resolveTableDragState(
    tableConfig?.drag,
    filters.sort,
    constantSort?.sort,
  );
  const sortDefaults =
    constantSort?.sort && !hasUserSort
      ? {
          sort: constantSort.sort,
          asc: constantSort.asc ?? filters.asc,
        }
      : dragState.defaultSort
        ? { sort: dragState.defaultSort, asc: 1 }
        : {};

  return {
    ...filters,
    ...sortDefaults,
    ...(tableConfig?.constantFilters || {}),
    ...(constantFilter || {}),
  } as FormElementsState;
};

export const buildFiltersById = (
  configuredFilterInputs: TableFilterPanelInputConfig[] | undefined,
  filterPanelFormElements: FormElementsState,
): Record<string, unknown> => {
  const normalized = Object.create(null) as Record<string, unknown>;
  (configuredFilterInputs || []).forEach((filter) => {
    if (
      typeof filter.id === "string" &&
      filter.id.length > 0 &&
      filter.formKey &&
      Object.hasOwn(filterPanelFormElements, filter.formKey)
    ) {
      normalized[filter.id] = filterPanelFormElements[filter.formKey];
    }
  });
  return normalized;
};

export const resolveDisplayFields = ({
  containerFields,
  tableConfig,
  tableToggleState,
  configuredTableToggles,
  includeFields,
  excludeFields,
  userRole,
}: {
  containerFields?: Field[];
  tableConfig?: TableComponentConfig;
  tableToggleState: Record<string, boolean>;
  configuredTableToggles: TableToggleConfig[];
  includeFields?: string[];
  excludeFields?: string[];
  userRole?: string;
}): Field[] => {
  let fields = (containerFields || [])
    .map(normalizeField)
    .filter(isDisplayablePrimitive);

  if (tableConfig?.columns?.length) {
    fields = tableConfig.columns
      .filter((column) =>
        isTableColumnVisible(
          column.visibilityToggle,
          tableToggleState,
          configuredTableToggles,
        ),
      )
      .map((column) => {
        const field = fields.find((item) => item.name === column.field);
        return (
          field || {
            name: column.field,
            type: "string",
            frontend: column.displayName
              ? { displayName: column.displayName }
              : undefined,
          }
        );
      })
      .filter((field): field is Field => Boolean(field?.name));
  }

  if (includeFields?.length) {
    fields = includeFields
      .map((name) => fields.find((f) => f.name === name))
      .filter((f): f is Field => Boolean(f));
  }
  if (excludeFields?.length) {
    const ex = new Set(excludeFields);
    fields = fields.filter((f) => !ex.has(f.name));
  }
  const uniq = new Set<string>();
  fields = fields.filter(
    (f) =>
      f.name &&
      !["_id", "id"].includes(f.name) &&
      !uniq.has(f.name) &&
      (uniq.add(f.name), true),
  );

  // Filter by authorizeRole if isAuthorized is true
  fields = fields.filter((f) => {
    if (!f.isAuthorized) return true;
    if (!userRole) return false;
    if (!f.authorizeRole || f.authorizeRole.length === 0) return false;
    return f.authorizeRole.includes(userRole);
  });

  return fields;
};

export const buildTableColumns = ({
  displayFields,
  constantFilter,
  tableConfig,
  generatedColumns,
  isActionsActive,
  t,
}: {
  displayFields: Field[];
  constantFilter?: Record<string, unknown>;
  tableConfig?: TableComponentConfig;
  generatedColumns: TableColumnItem[];
  isActionsActive: boolean;
  t: TranslateFn;
}): TableColumnItem[] => {
  const constantFilterKeys = constantFilter ? Object.keys(constantFilter) : [];
  const baseCols: TableColumnItem[] = displayFields
    .filter((f) => !constantFilterKeys.includes(f.name))
    .map((f) => ({
      key: t(getTableDisplayName(tableConfig, f) || getFieldLabel(f)),
      isSortable:
        tableConfig?.columns?.find((column) => column.field === f.name)
          ?.type !== "computedLabel",
      correspondingKey: f.name,
    }));
  const withGenerated = [...baseCols, ...generatedColumns];
  return isActionsActive
    ? [
        ...withGenerated,
        {
          key: t("Actions"),
          label: tableConfig?.actionsColumnLabel?.trim()
            ? tableConfig.actionsColumnLabel
            : undefined,
          isSortable: false,
        },
      ]
    : withGenerated;
};

export const computeRowStyle = (
  row: GenericItem,
  tableConfig?: TableComponentConfig,
  container?: ContainerModel,
): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  const rowClassName = tableConfig?.rows?.className;

  if (rowClassName) {
    Object.assign(
      styles,
      tailwindBgToStyle(getMatchingRowClassNames(row, rowClassName)),
    );
    return styles;
  }

  if (container?.frontend?.rowClassName) {
    Object.assign(
      styles,
      tailwindBgToStyle(
        getMatchingRowClassNames(row, container.frontend.rowClassName),
      ),
    );
  }

  container?.fields.forEach((field) => {
    if (field.frontend?.rowClassName) {
      Object.assign(
        styles,
        tailwindBgToStyle(
          getMatchingRowClassNames(row, field.frontend.rowClassName),
        ),
      );
    }
  });

  return styles;
};

export const normalizeRowForEdit = (
  rowToAction: GenericItem,
  displayFields: Field[],
): GenericItem => {
  const normalizedUpdates: GenericItem = { ...rowToAction };
  displayFields.forEach((f) => {
    const fieldType = (f.type || "").toLowerCase();
    if (
      (fieldType === Types.ObjectId || fieldType === Types.AutoIncrementId) &&
      f.populationSettings &&
      normalizedUpdates[f.name] &&
      typeof normalizedUpdates[f.name] === "object"
    ) {
      const populatedValue = normalizedUpdates[f.name] as Record<
        string,
        unknown
      >;
      normalizedUpdates[f.name] = populatedValue._id;
    } else if (
      fieldType === Types.ObjectIdArray &&
      f.populationSettings &&
      normalizedUpdates[f.name] &&
      Array.isArray(normalizedUpdates[f.name])
    ) {
      const populatedArray = normalizedUpdates[f.name] as Array<
        Record<string, unknown>
      >;
      normalizedUpdates[f.name] = populatedArray.map((item) =>
        item && typeof item === "object" ? item._id : item,
      );
    }
  });
  return normalizedUpdates;
};

export type ExportScope = "all" | "currentPage" | "numberOfPages";

export const buildExportPayload = ({
  schemaName,
  selectedFields,
  includeSearch,
  includeFilters,
  exportScope,
  pageCount,
  rowsPerPage,
  currentPage,
  filterPanelFormElements,
}: {
  schemaName: string;
  selectedFields: string[];
  includeSearch: boolean;
  includeFilters: boolean;
  exportScope: ExportScope;
  pageCount?: number;
  rowsPerPage: number;
  currentPage: number;
  filterPanelFormElements: FormElementsState;
}) => {
  let calculatedLimit = rowsPerPage;
  let calculatedPage = currentPage;

  if (exportScope === "all") {
    calculatedLimit = 0;
    calculatedPage = 1;
  } else if (exportScope === "numberOfPages" && pageCount) {
    calculatedLimit = rowsPerPage * pageCount;
    calculatedPage = 1;
  } else if (exportScope === "currentPage") {
    calculatedLimit = rowsPerPage;
    calculatedPage = currentPage;
  }

  return {
    schemaName,
    fields: selectedFields,
    filters: includeFilters ? filterPanelFormElements : {},
    search: includeSearch ? String(filterPanelFormElements.search || "") : "",
    limit: calculatedLimit,
    page: calculatedPage,
  };
};
