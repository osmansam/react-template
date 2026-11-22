import { formatPopulatedArrayValue } from "../../../../utils/populatedArrayDisplay";

export type GrowthPercentagePresentation =
  | { kind: "empty" }
  | { kind: "raw"; text: string }
  | {
      kind: "formatted";
      arrow: "↑" | "↓" | "→";
      sign: "+" | "";
      formattedNumber: string;
      color: string;
    };

export const formatNumberCellValue = (v: unknown): string | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString();
};

export const formatCurrencyCellValue = (v: unknown): string | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n)
    ? String(v)
    : n.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

export const formatPercentageCellValue = (v: unknown): string | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? String(v) : `${n.toLocaleString()}%`;
};

export const formatGrowthPercentageCellValue = (
  v: unknown,
): GrowthPercentagePresentation => {
  if (v === undefined || v === null || v === "") return { kind: "empty" };
  const n = Number(v);
  if (isNaN(n)) return { kind: "raw", text: String(v) };

  const isPositive = n > 0;
  const isNegative = n < 0;
  return {
    kind: "formatted",
    arrow: isPositive ? "↑" : isNegative ? "↓" : "→",
    sign: isPositive ? "+" : "",
    formattedNumber: n.toLocaleString(),
    color: isPositive ? "#2e7d32" : isNegative ? "#c62828" : "#827717",
  };
};

export const formatArrayCellValue = (v: unknown): string => {
  if (Array.isArray(v)) {
    return formatPopulatedArrayValue(v);
  }
  return String(v || "");
};

export const formatPopulatedObjectCellValue = (
  value: unknown,
  displayFields: string[],
): string => {
  if (value && typeof value === "object") {
    const valueObj = value as Record<string, unknown>;
    const displayValues = displayFields
      .map((fieldName) => valueObj[fieldName])
      .filter(Boolean)
      .map(String);
    return displayValues.join(" - ") || String(valueObj._id || "");
  }
  return String(value || "");
};

export const formatPopulatedObjectArrayCellValue = (
  value: unknown,
  displayFields: string[],
  inputSelectionField: string,
  selectionOptions: Record<string, unknown>[],
): string => {
  if (Array.isArray(value) && value.length > 0) {
    const displayItems = value.map((item) => {
      if (item && typeof item === "object") {
        const itemObj = item as Record<string, unknown>;
        const displayValues = displayFields
          .map((fieldName) => itemObj[fieldName])
          .filter(Boolean)
          .map(String);
        return displayValues.join(" - ") || String(itemObj._id || "");
      }
      if (typeof item === "string") {
        const foundOption = selectionOptions.find((opt) => opt._id === item);
        if (foundOption) {
          return String(foundOption[inputSelectionField] || item);
        }
        return item;
      }
      return String(item || "");
    });
    return displayItems.join(", ");
  }
  return String(value || "");
};
