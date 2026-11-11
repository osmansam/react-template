import type { PageRequestSource, PageRequestValues, JsonRequestValue } from "../../types/pageRequests";
import { normalizeQueryEntries, getTableSourceQueryEntries, serializeQueryEntries } from "../../utils/dynamicQueryKeys";
import { canonicalizeRuntimeValue } from "../pageParameterResolver";
import { validateRequestValues } from "../../utils/pageRequests";

export interface PageRequestScope { tenant: string; project: string; identity: string; pageKey: string }
export interface EffectivePageRequest {
  method: "GET" | "POST";
  path: string;
  query: readonly (readonly [string, string])[];
  body?: JsonRequestValue;
  headers: Record<string, string>;
  schemaName: string;
  transport: PageRequestSource["transport"];
  envelope: string;
}
export function compilePageRequest(source: PageRequestSource, values: PageRequestValues = {}): EffectivePageRequest {
  const error = validateRequestValues(source, values);
  if (error) throw new Error(error);
  if (!source.schemaName) throw new Error("Choose a schema for this request.");
  const controls = values.controls || {};
  const params = { ...values.filters, ...values.params };
  let query: readonly (readonly [string, string])[];
  let path: string = `/dynamic/${source.transport}`;
  let body: JsonRequestValue | undefined;
  let envelope = "raw";
  switch (source.transport) {
    case "table-source":
      if (source.kind === "pipeline" && !source.pipelineName || source.kind === "workflow" && !source.workflowName) throw new Error("Choose the source pipeline or workflow.");
      query = getTableSourceQueryEntries(controls.page ?? 1, controls.limit ?? 20, { kind: source.kind || "schema", schemaName: source.schemaName, pipelineName: source.pipelineName, workflowName: source.workflowName, fields: values.fields }, { ...params, ...controls });
      break;
    case "list": path = "/dynamic"; query = normalizeQueryEntries({ ...params, ...controls, schemaName: source.schemaName }); break;
    case "page": query = normalizeQueryEntries({ ...params, ...controls, schemaName: source.schemaName, page: controls.page ?? 1, limit: controls.limit ?? 20 }); break;
    case "pipeline":
      if (!source.pipelineName) throw new Error("Choose a pipeline.");
      query = normalizeQueryEntries({ ...params, schemaName: source.schemaName, pipelineName: source.pipelineName }); break;
    case "workflow":
      if (!source.workflowName) throw new Error("Choose a workflow.");
      path = `/dynamic/workflow/${encodeURIComponent(source.workflowName)}`;
      query = normalizeQueryEntries({ ...params, schemaName: source.schemaName }); body = { record: params }; envelope = "data"; break;
    case "selection":
      if (!source.fieldName) throw new Error("Choose an option label field.");
      query = normalizeQueryEntries({ ...values.params, ...controls, ...Object.fromEntries(Object.entries(values.filters || {}).map(([key, value]) => [`filter.${key}`, value])), schemaName: source.schemaName, fieldName: source.fieldName, valueField: source.valueField, dataFields: source.dataFields?.length ? [...new Set(source.dataFields)].sort().join(",") : undefined }); break;
    default: throw new Error("Unsupported page request source.");
  }
  return { method: body === undefined ? "GET" : "POST", path, query, body, headers: { "Content-Type": "application/json" }, schemaName: source.schemaName, transport: source.transport, envelope };
}
export function requestURL(descriptor: EffectivePageRequest): string {
  const query = serializeQueryEntries(descriptor.query);
  return descriptor.path + (query ? `?${query}` : "");
}
export function pageRequestSignature(descriptor: EffectivePageRequest): string {
  // Same representation drives the wire and the cache. Never include component IDs or display selectors.
  return canonicalizeRuntimeValue({ method: descriptor.method, url: requestURL(descriptor), body: descriptor.body, headers: descriptor.headers, envelope: descriptor.envelope });
}
