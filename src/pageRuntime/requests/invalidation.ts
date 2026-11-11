import type { PageRequestScope } from "./descriptor";
export function pageRequestInvalidationPredicate(scope: Pick<PageRequestScope, "tenant" | "project"> & { identity?: string } | null | undefined, schemaName: string) {
  return (query: { queryKey: readonly unknown[]; meta?: Record<string, unknown> }) => !!scope && query.queryKey[0] === "page-request" && query.queryKey[1] === scope.tenant && query.queryKey[2] === scope.project && (scope.identity === undefined || query.queryKey[3] === scope.identity) && query.meta?.pageRequestSchema === schemaName;
}
