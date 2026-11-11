import { BASE_QUERY_GC_TIME, BASE_QUERY_STALE_TIME, BASE_QUERY_REFETCH_ON_RECONNECT } from "../../config/queryClient";
import { CollectionError } from "../../visualBuilder/data/collectionFetch";
import { pageRequestSignature, type EffectivePageRequest, type PageRequestScope } from "./descriptor";
import { fetchPageRequest } from "./transport";

export function pageRequestQueryOptions(scope: PageRequestScope, descriptor: EffectivePageRequest, enabled = true) {
  return {
    queryKey: ["page-request", scope.tenant, scope.project, scope.identity, scope.pageKey, pageRequestSignature(descriptor)] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchPageRequest(scope, descriptor, signal),
    meta: { pageRequestSchema: descriptor.schemaName, tenant: scope.tenant, project: scope.project, identity: scope.identity },
    enabled,
    staleTime: BASE_QUERY_STALE_TIME, gcTime: BASE_QUERY_GC_TIME,
    refetchOnWindowFocus: false as const, refetchOnReconnect: BASE_QUERY_REFETCH_ON_RECONNECT,
    networkMode: "always" as const,
    retry: (count: number, error: unknown) => error instanceof CollectionError && error.retryable && count < 1,
  };
}
