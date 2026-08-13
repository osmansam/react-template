import type { DynamicArrayTarget } from "./api/dynamicArray";

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
