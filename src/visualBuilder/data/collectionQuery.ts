import type { QueryKey } from "@tanstack/react-query";
import { BASE_QUERY_GC_TIME, BASE_QUERY_REFETCH_ON_RECONNECT, BASE_QUERY_STALE_TIME } from "../../config/queryClient";
import type { ResolvedCollectionMap, ResolvedCollectionState, ResolvedCollectionStateMap } from "../../visual-engine/renderer/repeaters";
import { CollectionError, fetchCollection, type CollectionPage } from "./collectionFetch";
import type { CollectionDescriptor, DocumentCollectionPlan } from "./collectionPlan";

export interface CollectionScope {
  tenant: string;
  project: string;
  /** Application user id, or `anonymous` once the session is known to be signed out. */
  identity: string;
}

export const collectionQueryKey = (scope: CollectionScope, descriptor: CollectionDescriptor): QueryKey =>
  ["visual-collection", scope.tenant, scope.project, scope.identity, descriptor.key];

/** Shared by every consumer: auth/config failures never retry, transient ones retry once. */
export function shouldRetryCollection(failureCount: number, error: unknown): boolean {
  return error instanceof CollectionError && error.retryable && failureCount < 1;
}

export function collectionQueryOptions(scope: CollectionScope, descriptor: CollectionDescriptor, enabled = true) {
  return {
    networkMode: "always" as const,
    queryKey: collectionQueryKey(scope, descriptor),
    meta: { visualCollectionSchema: descriptor.schemaName },
    queryFn: ({ signal }: { signal: AbortSignal }): Promise<CollectionPage> => fetchCollection(descriptor, signal, scope),
    enabled,
    staleTime: BASE_QUERY_STALE_TIME,
    gcTime: BASE_QUERY_GC_TIME,
    refetchOnWindowFocus: false as const,
    refetchOnReconnect: BASE_QUERY_REFETCH_ON_RECONNECT,
    retry: shouldRetryCollection,
  };
}

/** Subset of a React Query result that the presentation mapping depends on. */
export interface CollectionQuerySnapshot {
  status: "pending" | "error" | "success";
  data?: CollectionPage;
  error?: unknown;
  refetch: () => unknown;
}

const MESSAGES = {
  loading: "Loading…",
  empty: "No items to display.",
  retry: "Try again",
  generic: "This content could not be loaded.",
} as const;

function errorMessage(error: unknown): string {
  if (error instanceof CollectionError) {
    switch (error.kind) {
      case "auth": return error.status === 401 ? "Sign in to view this content." : "You do not have access to this content.";
      case "timeout": return "The data took too long to load.";
      case "network": return "The data could not be loaded. Check your connection.";
      case "malformed": return "The data could not be read.";
      case "config": return "This content is not set up correctly.";
      case "server": return "The data service had a problem.";
    }
  }
  return MESSAGES.generic;
}

/**
 * Maps a query to repeater presentation. An errored query always reads as an error even when it
 * still holds earlier data, so a failed refresh (for example after access was revoked) never keeps
 * showing records.
 */
export function collectionState(snapshot: CollectionQuerySnapshot): ResolvedCollectionState {
  if (snapshot.status === "error") {
    return { status: "error", message: errorMessage(snapshot.error), retryLabel: MESSAGES.retry, onRetry: () => void snapshot.refetch(), reason: snapshot.error instanceof CollectionError ? snapshot.error.kind : "unknown" };
  }
  if (snapshot.status === "pending" || !snapshot.data) return { status: "loading", message: MESSAGES.loading };
  return snapshot.data.items.length === 0 ? { status: "empty", message: MESSAGES.empty } : { status: "success", message: `Showing ${snapshot.data.items.length} of ${snapshot.data.total} records · first page, up to ${snapshot.data.pageSize}.` };
}

export interface CollectionAssembly {
  resolvedCollections: ResolvedCollectionMap;
  collectionStates: ResolvedCollectionStateMap;
}

/**
 * Joins the document plan with query results. `snapshots` is aligned with `plan.descriptors`.
 * `metadataPending` holds schemas whose field metadata is still loading, so their filtered
 * repeaters show loading rather than a configuration error.
 */
export function assembleCollections(plan: DocumentCollectionPlan, snapshots: readonly CollectionQuerySnapshot[], options: { metadataPending?: ReadonlySet<string>; waiting?: boolean } = {}): CollectionAssembly {
  const bySourceDescriptor = new Map(plan.descriptors.map((descriptor, index) => [descriptor.key, snapshots[index]] as const));
  const resolvedCollections: ResolvedCollectionMap = {};
  const collectionStates: ResolvedCollectionStateMap = {};
  for (const entry of plan.repeaters) {
    if (!entry.plan.ok) {
      collectionStates[entry.repeaterId] = (entry.requiresFieldTypes && options.waiting) || options.metadataPending?.has(entry.schemaName)
        ? { status: "loading", message: MESSAGES.loading }
        : { status: "error", message: "This content is not set up correctly.", reason: entry.plan.reason };
      continue;
    }
    const snapshot = bySourceDescriptor.get(entry.plan.descriptor.key);
    if (options.waiting || !snapshot) {
      collectionStates[entry.repeaterId] = { status: "loading", message: MESSAGES.loading };
      continue;
    }
    const state = collectionState(snapshot);
    collectionStates[entry.repeaterId] = state;
    if (state.status === "success" && snapshot.data) resolvedCollections[entry.sourceKey] = snapshot.data.items;
  }
  return { resolvedCollections, collectionStates };
}

