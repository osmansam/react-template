import type { ComponentOutputDefinition } from "../types/page";
import { matchesRuntimeValueType } from "./pageParameterResolver";
import type { RuntimeValue } from "./types";

export interface TableOutputState {
  filters: Readonly<Record<string, unknown>>;
  search: string;
  selectedIds?: readonly (string | number)[];
}

const unavailable = (): RuntimeValue => ({ status: "unavailable" });

const available = (value: unknown): RuntimeValue => ({
  status: "available",
  value,
});

const availableWhenTypeMatches = (
  value: unknown,
  outputDefinition: ComponentOutputDefinition,
): RuntimeValue =>
  matchesRuntimeValueType(value, outputDefinition.type)
    ? available(value)
    : unavailable();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const resolveSelectedRowIds = (
  rows: readonly unknown[],
  initialized: boolean,
): readonly (string | number)[] | undefined => {
  if (!initialized) return undefined;

  const ids: Array<string | number> = [];
  for (const row of rows) {
    if (!isRecord(row) || !Object.hasOwn(row, "_id")) return undefined;
    const id = row._id;
    if (
      !(
        (typeof id === "string" && id.length > 0) ||
        (typeof id === "number" && Number.isFinite(id))
      )
    ) {
      return undefined;
    }
    ids.push(id);
  }
  return ids;
};

const supportedTypes = new Set<ComponentOutputDefinition["type"]>([
  "string",
  "number",
  "boolean",
  "dateRange",
  "stringArray",
  "numberArray",
]);

export const resolveTableOutput = (
  outputDefinition: ComponentOutputDefinition,
  state: TableOutputState,
): RuntimeValue => {
  if (
    !isRecord(outputDefinition) ||
    !isRecord(outputDefinition.source) ||
    typeof outputDefinition.source.kind !== "string" ||
    !supportedTypes.has(outputDefinition.type)
  ) {
    return unavailable();
  }

  const source = outputDefinition.source;
  switch (source.kind) {
    case "tableFilter": {
      if (
        typeof source.filterId !== "string" ||
        source.filterId.length === 0 ||
        !Object.hasOwn(state.filters, source.filterId)
      ) {
        return unavailable();
      }
      const value = state.filters[source.filterId];
      return value === undefined
        ? unavailable()
        : availableWhenTypeMatches(value, outputDefinition);
    }
    case "tableSearch":
      return outputDefinition.type === "string" &&
        typeof state.search === "string"
        ? availableWhenTypeMatches(state.search.trim(), outputDefinition)
        : unavailable();
    case "tableSelectedIds":
      if (
        (outputDefinition.type !== "stringArray" &&
          outputDefinition.type !== "numberArray") ||
        state.selectedIds === undefined
      ) {
        return unavailable();
      }
      return availableWhenTypeMatches(
        [...state.selectedIds],
        outputDefinition,
      );
    default:
      return unavailable();
  }
};
