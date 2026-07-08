import { canonicalizeRuntimeValue } from "../pageRuntime/pageParameterResolver";

export type DynamicTableSourceBinding = {
  kind?: "schema" | "pipeline" | "workflow";
  schemaName?: string;
  pipelineName?: string;
  workflowName?: string;
  fields?: string[];
  params?: Record<string, unknown>;
};

export type NormalizedQueryEntry = readonly [key: string, value: string];

const toStableJsonValue = (
  value: unknown,
  seen = new WeakSet<object>(),
): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) {
    throw new TypeError("Request value is not JSON-serializable.");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) =>
      item === undefined ? null : toStableJsonValue(item, seen),
    );
    seen.delete(value);
    return result;
  }
  const result: Record<string, unknown> = {};
  Object.keys(value as Record<string, unknown>)
    .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
    .sort()
    .forEach((key) => {
      result[key] = toStableJsonValue(
        (value as Record<string, unknown>)[key],
        seen,
      );
    });
  seen.delete(value);
  return result;
};

const normalizeQueryValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    return JSON.stringify(toStableJsonValue(normalizeJsonRequestValue(value)));
  }
  const normalized =
    typeof value === "string" ? value.trim() : String(value);
  return normalized === "" ? null : normalized;
};

export const normalizeQueryEntries = (
  params: Record<string, unknown>,
): NormalizedQueryEntry[] =>
  Object.keys(params)
    .sort()
    .flatMap((key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value.flatMap((item): NormalizedQueryEntry[] => {
          const normalized = normalizeQueryValue(item);
          return normalized === null ? [] : [[key, normalized]];
        });
      }
      const normalized = normalizeQueryValue(value);
      return normalized === null ? [] : [[key, normalized]];
    });

export const serializeQueryEntries = (
  entries: readonly NormalizedQueryEntry[],
): string => {
  const query = new URLSearchParams();
  entries.forEach(([key, value]) => query.append(key, value));
  return query.toString();
};

export const getDynamicItemsQueryEntries = (
  schemaName: string,
  filters?: Record<string, unknown>,
): NormalizedQueryEntry[] =>
  normalizeQueryEntries({
    ...(filters || {}),
    schemaName,
  });

export const getDynamicItemsQueryKey = (
  schemaName: string,
  filters?: Record<string, unknown>,
  sourceRevision = "",
) => {
  if (!sourceRevision) {
    return filters
      ? (["dynamic", schemaName, "all", filters] as const)
      : (["dynamic", schemaName, "all"] as const);
  }

  return [
    "dynamic",
    schemaName,
    "all",
    sourceRevision,
    canonicalizeRuntimeValue(
      getDynamicItemsQueryEntries(schemaName, filters),
    ),
  ] as const;
};

export const normalizeJsonRequestValue = (value: unknown): unknown => {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError("Request value is not JSON-serializable.");
  }
  if (serialized === undefined) {
    throw new TypeError("Request value is not JSON-serializable.");
  }
  return JSON.parse(serialized) as unknown;
};

const tableReservedParameters = new Set([
  "schemaName",
  "sourceType",
  "pipelineName",
  "workflowName",
  "fields",
  "page",
  "limit",
  "sort",
  "asc",
  "search",
]);

export const getTableSourceQueryEntries = (
  page: number,
  limit: number,
  binding: DynamicTableSourceBinding,
  filters: Record<string, unknown>,
  resolvedParams?: Record<string, unknown>,
): NormalizedQueryEntry[] => {
  // Bound request parameters win collisions with editable UI filters. Reserved
  // table controls and source identity always come from their explicit inputs.
  const requestParams = {
    ...filters,
    ...(binding.params || {}),
    ...(resolvedParams || {}),
  };
  const nonReservedParams = Object.fromEntries(
    Object.entries(requestParams).filter(
      ([key]) => !tableReservedParameters.has(key),
    ),
  );

  return normalizeQueryEntries({
    ...nonReservedParams,
    schemaName: binding.schemaName || "",
    sourceType: binding.kind || "schema",
    pipelineName: binding.pipelineName,
    workflowName: binding.workflowName,
    fields: binding.fields?.length ? binding.fields.join(",") : undefined,
    page,
    limit,
    sort: filters.sort,
    asc: filters.asc,
    search: filters.search,
  });
};

export function getTableSourceQueryKey(
  page: number,
  limit: number,
  binding: DynamicTableSourceBinding,
  filters: Record<string, unknown>,
  resolvedParams?: Record<string, unknown>,
  sourceRevision = "",
) {
  const queryEntries = getTableSourceQueryEntries(
    page,
    limit,
    binding,
    filters,
    resolvedParams,
  );

  return [
    "dynamic",
    binding.schemaName || "",
    "table-source",
    binding.kind || "schema",
    binding.pipelineName || "",
    binding.workflowName || "",
    sourceRevision,
    canonicalizeRuntimeValue(queryEntries),
  ] as const;
}

export function shouldInvalidateDynamicQuery(
  queryKey: readonly unknown[],
  schemaName: string,
) {
  return (
    queryKey[0] === "dynamic" &&
    (queryKey[1] === schemaName || queryKey[2] === "table-source")
  );
}
