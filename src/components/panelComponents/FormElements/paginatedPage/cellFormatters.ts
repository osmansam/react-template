import type { Field } from "../../../../utils/api/container";
import { formatPopulatedArrayValue } from "../../../../utils/populatedArrayDisplay";
import type { SelectionDataMap } from "./formInputBuilders";

export const formatPopulatedObjectContent = (
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

export const formatObjectIdArrayContent = (
  value: unknown,
  field: Field,
  selectionDataMap: SelectionDataMap,
): string => {
  if (!Array.isArray(value) || value.length === 0) {
    return String(value || "");
  }

  const hasPopulatedObjects = value.some(
    (item) => item && typeof item === "object",
  );
  if (hasPopulatedObjects) {
    return formatPopulatedArrayValue(
      value,
      field.populationSettings?.displayFields || [],
    );
  }

  const displayItems = value.map((item) => {
    if (item && typeof item === "object") {
      const itemObj = item as Record<string, unknown>;
      const displayValues = (field.populationSettings?.displayFields || [])
        .map((fieldName) => itemObj[fieldName])
        .filter(Boolean)
        .map(String);
      return displayValues.join(" - ") || String(itemObj._id || "");
    } else if (typeof item === "string") {
      const selectionOptions = selectionDataMap.get(field.name) || [];
      const foundOption = selectionOptions.find((opt) => opt._id === item);
      if (foundOption) {
        return String(
          foundOption[field.populationSettings?.inputSelectionField || "name"] ||
            item,
        );
      }
      return item;
    }
    return String(item || "");
  });
  return displayItems.join(", ");
};
