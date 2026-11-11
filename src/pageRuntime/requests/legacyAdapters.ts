import type { PageRequestSource, PageRequestValues, JsonRequestValue, PageRequestControls } from "../../types/pageRequests";
import { compilePageRequest } from "./descriptor";
import { normalizeJsonRequestValue } from "../../utils/dynamicQueryKeys";
import { requestReserved } from "../../utils/pageRequests";
export function legacyRead(source: PageRequestSource, values: PageRequestValues = {}) {
  if (!source.schemaName || source.transport === "pipeline" && !source.pipelineName || source.transport === "workflow" && !source.workflowName || source.transport === "selection" && !source.fieldName) return undefined;
  return compilePageRequest(source, values);
}
export function legacyValues(filters: Record<string, unknown> = {}, params: Record<string, unknown> = {}, controls: PageRequestControls = {}, fields?: string[]): PageRequestValues {
  const entries = (record: Record<string, unknown>) => Object.fromEntries(Object.entries(record).filter(([key, value]) => !requestReserved.has(key) && value !== undefined).map(([key, value]) => [key, normalizeJsonRequestValue(value) as JsonRequestValue]));
  const value: PageRequestValues = { filters: entries(filters), params: entries(params), controls: { ...controls } };
  if (typeof filters.sort === "string" && filters.sort) { value.controls!.sort = filters.sort; value.controls!.asc = filters.asc === true || filters.asc === 1 || filters.asc === "true" || filters.asc === "1"; }
  if (filters.search !== undefined && filters.search !== "") value.controls!.search = String(filters.search);
  if (fields?.length) value.fields = fields;
  return value;
}
