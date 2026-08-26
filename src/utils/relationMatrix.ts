import type { DynamicArrayTarget } from "./api/dynamicArray";

type MatrixColumnConfig = Pick<
  import("../types/page").RelationMatrixConfig,
  "rowLabelField" | "columnIdField" | "columnLabelField"
>;

const displayValue = (value: unknown): string => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return String(record.name ?? record.label ?? record._id ?? record.id ?? "-");
  }
  return value == null || value === "" ? "-" : String(value);
};

export const buildRelationMatrixTableDescriptors = (
  columns: Array<Record<string, unknown>>,
  config: MatrixColumnConfig,
) => {
  const dynamic = columns.map((column) => {
    const key = `relation:${normalizeRelationId(column[config.columnIdField])}`;
    return {
      key,
      label: displayValue(column[config.columnLabelField]),
    };
  });
  return {
    columns: [
      {
        key: config.rowLabelField,
        isSortable: false,
        correspondingKey: config.rowLabelField,
      },
      ...dynamic.map((column) => ({
        key: column.label,
        isSortable: false,
        correspondingKey: column.key,
        className: "mx-auto justify-center",
      })),
    ],
    rowKeys: [config.rowLabelField, ...dynamic.map((column) => column.key)],
  };
};

export const normalizeRelationId = (value: unknown): string => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return normalizeRelationId(record._id ?? record.id);
  }
  return value == null ? "" : String(value);
};

export const isRelationMatrixMember = (
  items: unknown,
  matchField: string,
  rowId: unknown,
): boolean => {
  if (!Array.isArray(items)) return false;
  const expected = normalizeRelationId(rowId);
  return items.some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    return normalizeRelationId((item as Record<string, unknown>)[matchField]) === expected;
  });
};

export const buildRelationArrayTarget = (
  column: Record<string, unknown>,
  config: Pick<
    import("../types/page").RelationMatrixConfig,
    "columnSchemaName" | "columnIdField" | "targetArrayField" | "targetItemMatchField"
  >,
): DynamicArrayTarget => ({
  schemaName: config.columnSchemaName,
  parentId: normalizeRelationId(column[config.columnIdField]),
  arrayField: config.targetArrayField,
  rowIdentityField: config.targetItemMatchField,
});

export const replaceRelationParentInDynamicData = <T>(
  data: T,
  parent: Record<string, unknown> | undefined,
  idField: string,
): T => {
  if (!parent) return data;
  const parentId = normalizeRelationId(parent[idField]);
  if (!parentId) return data;

  const replaceRecord = (record: unknown) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return record;
    }
    const typed = record as Record<string, unknown>;
    return normalizeRelationId(typed[idField]) === parentId ? parent : record;
  };

  if (Array.isArray(data)) {
    return data.map(replaceRecord) as T;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return {
        ...record,
        items: record.items.map(replaceRecord),
      } as T;
    }
  }

  return data;
};
