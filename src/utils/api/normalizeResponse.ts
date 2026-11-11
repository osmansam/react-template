import { camelCase, isPlainObject } from "lodash";

/** Normalize API metadata without renaming authored visual-document keys. */
export function normalizeResponse(value: unknown, insideProps = false): unknown {
  if (Array.isArray(value)) return value.map(item => normalizeResponse(item, insideProps));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    const normalized = key === "_id" ? key : camelCase(key);
    // Slot IDs and authored filter field paths are dictionary keys, not API metadata. Preserve punctuation and case.
    if (normalized === "requestBindings" && isPlainObject(entry)) return [normalized, Object.fromEntries(Object.entries(entry as Record<string, unknown>).map(([slot, connection]) => [slot, normalizeResponse(connection)]))];
    if (normalized === "sourceRequestFilters" && isPlainObject(entry)) return [normalized, { ...(entry as Record<string, unknown>) }];
    return [normalized, insideProps && normalized === "visualBuilder" ? entry : normalizeResponse(entry, normalized === "props")];
  }));
}
