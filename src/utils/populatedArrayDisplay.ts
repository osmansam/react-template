const objectDisplayValue = (
  value: Record<string, unknown>,
  displayFields: string[],
): string => {
  const fields = displayFields.length > 0 ? displayFields : ["name"];
  const displayed = fields.map((field) => value[field]).filter(Boolean).map(String);
  return displayed.join(" - ") || String(value._id ?? value.id ?? "");
};

export const formatPopulatedArrayValue = (
  value: unknown,
  displayFields: string[] = [],
): string => {
  if (!Array.isArray(value)) return String(value ?? "");
  return value.map((item) =>
    item && typeof item === "object"
      ? objectDisplayValue(item as Record<string, unknown>, displayFields)
      : String(item ?? ""),
  ).filter(Boolean).join(", ");
};
