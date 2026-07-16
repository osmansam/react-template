type ExtraSelectionParams =
  | Record<string, unknown>
  | readonly (readonly [string, string])[];

export interface SelectionQueryConfigParams {
  schemaName?: string;
  fieldName?: string;
  valueField?: string;
  tenantSlug?: string;
  projectSlug?: string;
  basePath?: string;
  extraParams?: ExtraSelectionParams;
  sourceRevision?: string;
}

const cleanEntries = (params: Record<string, unknown>) => {
  const preferredOrder = ["schemaName", "fieldName", "valueField"];
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);
      if (leftIndex >= 0 || rightIndex >= 0) {
        return (
          (leftIndex >= 0 ? leftIndex : preferredOrder.length) -
          (rightIndex >= 0 ? rightIndex : preferredOrder.length)
        );
      }
      return left.localeCompare(right);
    });
  return entries;
};

const serializeEntries = (entries: readonly (readonly [string, unknown])[]) => {
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => params.append(key, String(value)));
  return params.toString();
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, stableValue(nestedValue)]),
  );
};

const isEntryArray = (
  value: ExtraSelectionParams,
): value is readonly (readonly [string, string])[] => Array.isArray(value);

export const getSelectionScopeFromLocation = () => {
  if (typeof window === "undefined") return {};

  const parts = window.location.pathname.split("/");
  const tenantIndex = parts.indexOf("t");
  const projectIndex = parts.indexOf("p");

  return {
    tenantSlug: tenantIndex >= 0 ? parts[tenantIndex + 1] || "" : "",
    projectSlug: projectIndex >= 0 ? parts[projectIndex + 1] || "" : "",
  };
};

export const getSelectionQueryConfig = ({
  schemaName = "",
  fieldName = "",
  valueField = "",
  tenantSlug,
  projectSlug,
  basePath = "/dynamic",
  extraParams = {},
  sourceRevision = "",
}: SelectionQueryConfigParams) => {
  const routeScope = getSelectionScopeFromLocation();
  const resolvedTenantSlug = tenantSlug ?? routeScope.tenantSlug ?? "";
  const resolvedProjectSlug = projectSlug ?? routeScope.projectSlug ?? "";
  const queryParams = {
    schemaName,
    fieldName,
    valueField,
  };
  const extraEntries = isEntryArray(extraParams)
    ? extraParams
    : cleanEntries(extraParams);

  return {
    path: `${basePath}/selection?${serializeEntries([
      ...cleanEntries(queryParams),
      ...extraEntries,
    ])}`,
    queryKey: [
      "dynamic",
      resolvedTenantSlug,
      resolvedProjectSlug,
      "selection",
      schemaName,
      fieldName,
      valueField,
      sourceRevision,
      stableValue(extraParams),
    ] as const,
  };
};
