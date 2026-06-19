type RouteParamValue = string | undefined;
export type RouteParams = Record<string, RouteParamValue>;

const routeParamToken = /\{\{\s*route\.([A-Za-z0-9_-]+)\s*\}\}/g;
const exactRouteParamToken = /^\{\{\s*route\.([A-Za-z0-9_-]+)\s*\}\}$/;

export function resolveRouteParamValue<T>(value: T, routeParams: RouteParams): T {
  if (typeof value === "string") {
    const exactMatch = value.match(exactRouteParamToken);
    if (exactMatch) {
      return (routeParams[exactMatch[1]] ?? "") as T;
    }

    return value.replace(routeParamToken, (_match, key: string) => {
      return routeParams[key] ?? "";
    }) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveRouteParamValue(item, routeParams)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        resolveRouteParamValue(item, routeParams),
      ]),
    ) as T;
  }

  return value;
}

export function resolveRouteParamRecord<T extends Record<string, unknown>>(
  value: T | undefined,
  routeParams: RouteParams,
): T | undefined {
  if (!value) return value;
  return resolveRouteParamValue(value, routeParams);
}
