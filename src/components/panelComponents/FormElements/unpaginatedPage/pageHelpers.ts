import type React from "react";
import type { TFunction } from "i18next";
import type { FormElementsState } from "../../../../types";
import type {
  TableComponentConfig,
  TableFilterPanelInputConfig,
  TableToggleConfig,
} from "../../../../types/page";
import {
  ContainerModel,
  Field,
  Types,
} from "../../../../utils/api/container";
import {
  RawContainer,
  getFieldLabel,
  getMatchingRowClassNames,
  isDisplayablePrimitive,
  normalizeContainer,
  normalizeField,
  tailwindBgToStyle,
} from "../../../../utils/genericPageHelpers";
import { getTableDisplayName } from "../../../../utils/tableConfig";
import {
  isTableColumnVisible,
  resolveToggleRequestEffects,
} from "../../../../utils/tableToggles";
import type { GenericItem } from "../tableActionForm";

export const isArrayFieldType = (
  fieldType: string,
  originalType: string,
): boolean => {
  const isStringArray =
    fieldType === Types.StringArray ||
    originalType === Types.StringArray ||
    originalType === "stringArray" ||
    fieldType === "string[]" ||
    fieldType === "array<string>";
  const isIntArray =
    fieldType === Types.IntArray ||
    originalType === Types.IntArray ||
    originalType === "intArray" ||
    fieldType === "int[]" ||
    fieldType === "array<int>";
  const isNumberArray =
    fieldType === Types.NumberArray ||
    originalType === Types.NumberArray ||
    originalType === "numberArray" ||
    fieldType === "number[]" ||
    fieldType === "array<number>";

  return isStringArray || isIntArray || isNumberArray;
};

export const findMatchingContainer = (
  rawContainers: RawContainer[] | undefined,
  schemaName: string,
): ContainerModel | undefined => {
  if (!rawContainers) return undefined;
  const normalized = rawContainers.map((c: RawContainer) =>
    normalizeContainer(c),
  );
  return normalized.find(
    (c: ContainerModel) =>
      (c.schemaName || "").toLowerCase() === schemaName.toLowerCase(),
  );
};

export const computeRowStyle = (
  row: GenericItem,
  container: ContainerModel | undefined,
  tableConfig: TableComponentConfig | undefined,
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

  // Container level configs
  if (container?.frontend?.rowClassName) {
    Object.assign(
      styles,
      tailwindBgToStyle(
        getMatchingRowClassNames(row, container.frontend.rowClassName),
      ),
    );
  }

  // Field level configs
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

export const containerHasImageField = (
  container: ContainerModel | undefined,
): boolean => {
  if (!container?.fields) return false;
  return container.fields.some(
    (field) => (field.type || "").toLowerCase() === Types.Image,
  );
};

export const computeDisplayFields = ({
  container,
  includeFields,
  excludeFields,
  userRole,
  tableConfig,
  tableToggleState,
  configuredTableToggles,
}: {
  container: ContainerModel | undefined;
  includeFields?: string[];
  excludeFields?: string[];
  userRole?: string;
  tableConfig?: TableComponentConfig;
  tableToggleState: Record<string, boolean>;
  configuredTableToggles: TableToggleConfig[];
}): Field[] => {
  if (!container?.fields) return [];
  let fields = container.fields
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
  fields = fields.filter((f) => f.name !== "_id" && f.name !== "id");

  // Filter by authorizeRole if isAuthorized is true
  fields = fields.filter((f) => {
    if (!f.isAuthorized) return true;
    if (!userRole) return false;
    if (!f.authorizeRole || f.authorizeRole.length === 0) return false;
    return f.authorizeRole.includes(userRole);
  });

  return fields;
};

export const buildRequestFilters = ({
  filterFormElements,
  constantFilters,
  constantSort,
  defaultSort,
  configuredTableToggles,
  tableToggleState,
  constantFilter,
  resolvedParams,
}: {
  filterFormElements: FormElementsState;
  constantFilters?: TableComponentConfig["constantFilters"];
  constantSort?: TableComponentConfig["constantSort"];
  defaultSort?: string;
  configuredTableToggles: TableToggleConfig[];
  tableToggleState: Record<string, boolean>;
  constantFilter?: Record<string, unknown>;
  resolvedParams?: Record<string, unknown>;
}): Record<string, unknown> => ({
  ...filterFormElements,
  ...(!filterFormElements.sort && constantSort?.sort
    ? {
        sort: constantSort.sort,
        asc: constantSort.asc ?? 1,
      }
    : !filterFormElements.sort && defaultSort
      ? { sort: defaultSort, asc: 1 }
      : {}),
  ...resolveToggleRequestEffects(configuredTableToggles, tableToggleState),
  ...(constantFilters || {}),
  ...(constantFilter || {}),
  ...(resolvedParams || {}),
});

export const buildFiltersById = (
  configuredFilterInputs: TableFilterPanelInputConfig[] | undefined,
  filterFormElements: FormElementsState,
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  (configuredFilterInputs || []).forEach((filter) => {
    if (
      filter.id &&
      filter.formKey &&
      Object.hasOwn(filterFormElements, filter.formKey)
    ) {
      normalized[filter.id] = filterFormElements[filter.formKey];
    }
  });
  return normalized;
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

export type TableColumnDef = {
  key: string;
  label?: string;
  isSortable: boolean;
  correspondingKey?: string;
};

export const buildTableColumns = ({
  displayFields,
  tableConfig,
  generatedColumns,
  actionsEnabled,
  t,
}: {
  displayFields: Field[];
  tableConfig?: TableComponentConfig;
  generatedColumns: TableColumnDef[];
  actionsEnabled: boolean;
  t: TFunction;
}): TableColumnDef[] => {
  const baseCols: TableColumnDef[] = [
    ...displayFields.map((f) => ({
      key: t(getTableDisplayName(tableConfig, f) || getFieldLabel(f)),
      isSortable:
        tableConfig?.columns?.find((column) => column.field === f.name)
          ?.type !== "computedLabel",
      correspondingKey: f.name,
    })),
    ...generatedColumns,
  ];
  if (actionsEnabled) {
    return [
      ...baseCols,
      {
        key: t("Actions"),
        label: tableConfig?.actionsColumnLabel?.trim()
          ? tableConfig.actionsColumnLabel
          : undefined,
        isSortable: false,
      },
    ];
  }
  return baseCols;
};
