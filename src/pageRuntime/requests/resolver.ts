import type { PageRequestConnection, PageRequestDefinition, PageRequestValues } from "../../types/pageRequests";
export function mergePageRequestValues(...layers: (PageRequestValues | undefined)[]): PageRequestValues {
  const result: PageRequestValues = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const bag of ["params", "filters", "controls"] as const) {
      if (layer[bag]) Object.assign(result[bag] ||= {}, layer[bag]);
    }
    if (Object.hasOwn(layer, "fields")) result.fields = layer.fields;
  }
  return result;
}
export function resolvePageRequest(definition: PageRequestDefinition, resolvedBindings: PageRequestValues, connection?: PageRequestConnection, localOverrides?: PageRequestValues): PageRequestValues {
  return mergePageRequestValues(definition.defaults, resolvedBindings, connection?.overrides, localOverrides);
}
