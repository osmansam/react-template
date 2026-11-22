import { Field } from "../../../../utils/api/container";
import { ColumnType, RowKeyType } from "../../shared/types";

export const convertValueByType = (
  value: unknown,
  fieldType: string,
): unknown => {
  if (value === null || value === undefined || value === "") {
    return value;
  }
  const type = fieldType.toLowerCase();
  const originalType = fieldType;

  // Handle string array types
  const isStringArray =
    type === "stringarray" ||
    originalType === "stringArray" ||
    type === "string[]" ||
    type === "array<string>";

  if (isStringArray) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
    return [];
  }

  // Handle int array types
  const isIntArray =
    type === "intarray" ||
    originalType === "intArray" ||
    type === "int[]" ||
    type === "array<int>";

  if (isIntArray) {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? parseInt(item, 10) : item))
        .filter((item) => !isNaN(item as number));
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => parseInt(item.trim(), 10))
        .filter((item) => !isNaN(item));
    }
    return [];
  }

  // Handle number array types
  const isNumberArray =
    type === "numberarray" ||
    originalType === "numberArray" ||
    type === "number[]" ||
    type === "array<number>";

  if (isNumberArray) {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? parseFloat(item) : item))
        .filter((item) => !isNaN(item as number));
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => parseFloat(item.trim()))
        .filter((item) => !isNaN(item));
    }
    return [];
  }

  // Handle number types (int, float, double, number, etc.)
  if (
    type.includes("int") ||
    type.includes("float") ||
    type.includes("double") ||
    type === "number"
  ) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  // Handle boolean types
  if (type === "boolean" || type === "bool") {
    if (typeof value === "boolean") return value;
    const strValue = String(value).toLowerCase();
    return strValue === "true" || strValue === "1";
  }

  // Handle date types
  if (type === "date" || type === "datetime") {
    if (value instanceof Date) return value;
    const dateValue = new Date(value as string);
    return isNaN(dateValue.getTime()) ? value : dateValue;
  }

  // Default: return as-is
  return value;
};

export const parseExcelRows = <T,>(
  data: unknown[],
  usedColumns: ColumnType[] | undefined,
  usedRowKeys: RowKeyType<T>[],
  containerFields?: Field[],
): Record<string, unknown>[] => {
  const headers = data[0] as string[];

  // Map column keys to their translated names
  const columnMap = new Map<string, string>();
  usedColumns?.forEach((col, index) => {
    if (col.correspondingKey) {
      columnMap.set(col.key, usedRowKeys[index]?.key as string);
    }
  });

  // Create a field type map for quick lookup
  const fieldTypeMap = new Map<string, string>();
  if (containerFields) {
    containerFields.forEach((field) => {
      fieldTypeMap.set(field.name, field.type);
    });
  }

  return data.slice(1).map((row) => {
    const item: Record<string, unknown> = {};
    (row as unknown[]).forEach((cell: unknown, index: number) => {
      const header = headers[index];
      const fieldKey = columnMap.get(header);
      if (fieldKey) {
        // Convert value based on field type if available
        const fieldType = fieldTypeMap.get(fieldKey);
        const convertedValue = fieldType
          ? convertValueByType(cell, fieldType)
          : cell;
        item[fieldKey] = convertedValue;
      }
    });
    return item;
  });
};
