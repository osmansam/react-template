import { useRef } from "react";
import type { PageRequestValues } from "../../types/pageRequests";
import { canonicalizeRuntimeValue } from "../pageParameterResolver";
import { usePageRequestConsumer } from "./ConsumerProvider";
import { mergePageRequestValues, resolvePageRequest } from "./resolver";
import { pageRequestControls } from "../../utils/pageRequests";

export function tableRequestOverrides(current: PageRequestValues, initial: PageRequestValues, inherited?: PageRequestValues): PageRequestValues {
  const result: PageRequestValues = {};
  for (const bag of ["params", "filters", "controls"] as const) {
    const changed = Object.fromEntries(Object.entries(current[bag] || {}).filter(([key, value]) => canonicalizeRuntimeValue(value) !== canonicalizeRuntimeValue((initial[bag] as Record<string, unknown> | undefined)?.[key]) && (inherited === undefined || canonicalizeRuntimeValue(value) !== canonicalizeRuntimeValue((inherited[bag] as Record<string, unknown> | undefined)?.[key]))));
    if (Object.keys(changed).length) Object.assign(result, { [bag]: changed });
  }
  return result;
}
export function useTableRequestDefaults() {
  const consumer = usePageRequestConsumer(), connection = consumer?.connections.get("data");
  return connection ? resolvePageRequest(connection.definition, connection.values, connection.connection) : undefined;
}
export function useTableRequestOverrides(observed: PageRequestValues, fixed?: PageRequestValues, resetKey = 0) {
  const defaults = useTableRequestDefaults();
  const source = usePageRequestConsumer()?.connections.get("data")?.definition.source;
  const baseline = useRef({ observed, resetKey });
  if (baseline.current.resetKey !== resetKey) baseline.current = { observed, resetKey };
  const overrides = defaults ? mergePageRequestValues(fixed, tableRequestOverrides(observed, baseline.current.observed, defaults)) : undefined;
  if (overrides?.controls && source) overrides.controls = Object.fromEntries(Object.entries(overrides.controls).filter(([key]) => pageRequestControls(source).includes(key)));
  return overrides;
}
