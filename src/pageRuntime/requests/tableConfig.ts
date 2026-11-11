import type { DataBinding } from "../../types/page";
import type { PageRequestSource } from "../../types/pageRequests";
export function tableRequestConfig(fallback?: DataBinding, source?: PageRequestSource) {
  const binding: DataBinding | undefined = source ? { ...fallback, kind: source.kind || (source.transport === "pipeline" ? "pipeline" : source.transport === "workflow" ? "workflow" : "schema"), schemaName: source.schemaName, pipelineName: source.pipelineName, workflowName: source.workflowName } : fallback;
  return { binding, mode: source && !["table-source", "page"].includes(source.transport) ? "unpaginated" as const : "paginated" as const, schemaActions: source ? ["list", "page"].includes(source.transport) || source.transport === "table-source" && source.kind === "schema" : binding?.kind === "schema" };
}
