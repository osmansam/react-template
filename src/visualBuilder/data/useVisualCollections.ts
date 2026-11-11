import { usePageRequestConsumer } from "../../pageRuntime/requests/ConsumerProvider";
import { usePageVisualCollections } from "./usePageVisualCollections";
import { useEffect, useMemo, useRef } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "../../context/User.context";
import { useTenantProject } from "../../hooks/useTenantProject";
import axios from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import { normalizeContainersResponse } from "../../utils/api/containerResponse";
import { getProjectSessionItem } from "../../utils/projectSessionStorage";
import { baseQueryOptions } from "../../config/queryClient";
import type { ComponentNode } from "../../visual-engine/model";
import { assembleCollections, collectionQueryOptions, collectionState, shouldRetryCollection, type CollectionAssembly, type CollectionScope } from "./collectionQuery";
import { classifyCollectionError } from "./collectionFetch";
import { planDocumentCollections, schemasNeedingFieldTypes, type CollectionFieldTypes } from "./collectionPlan";

/** Anonymous only once the session is known to be signed out; a signed-in marker without a user is unresolved. */
export function resolveCollectionIdentity(userId: string | undefined, signedInMarker: boolean): string | undefined {
  if (userId) return userId;
  return signedInMarker ? undefined : "anonymous";
}

function readSignedInMarker(): boolean {
  try { return getProjectSessionItem("loggedIn") === "true"; } catch { return false; }
}

/**
 * Fetches every repeater's records for a visual document, one request per distinct effective query,
 * and returns what the pure renderer needs. The renderer never fetches.
 */
function useStandaloneVisualCollections(root: ComponentNode, enabled = true): CollectionAssembly & { diagnostics: CollectionDiagnostics } {
  const { tenant, project } = useTenantProject();
  const { user } = useUserContext();
  const userId = typeof user?._id === "string" ? user._id : undefined;
  const signedIn = readSignedInMarker();
  const session = useQuery({
    networkMode: "always", queryKey: ["visual-session", tenant, project, userId || "", signedIn],
    queryFn: async ({ signal }) => {
      try {
        const response = await axiosClient.get<{ authenticated: boolean; user?: { _id?: string; id?: string } }>("/auth/session", { signal, timeout: 15000, runtimeScope: { tenant: tenant!, project: project! } });
        if (typeof response.data?.authenticated !== "boolean") throw new Error("The session could not be verified.");
        const id = response.data.user?._id || response.data.user?.id;
        if (response.data.authenticated && (typeof id !== "string" || !id)) throw new Error("The session identity could not be verified.");
        return response.data;
      } catch (reason) {
        if (axios.isAxiosError(reason) && reason.response?.status === 401 && !userId && !signedIn) return { authenticated: false };
        throw reason;
      }
    },
    enabled: enabled && Boolean(tenant && project), staleTime: 30000, refetchOnWindowFocus: false, retry: false,
  });
  const verifiedId = session.data?.user?._id || session.data?.user?.id;
  const identity = session.data?.authenticated && verifiedId ? verifiedId : session.data?.authenticated === false ? "anonymous" : undefined;
  const scopeReady = enabled && Boolean(tenant && project) && identity !== undefined && session.isSuccess && !session.isFetching;
  const queryClient = useQueryClient();
  // When the signed-in identity or project changes, cancel and drop the previous scope's records so a
  // late response or an old cache entry can never be shown to someone else. Unmounting alone keeps
  // the cache, because another block on the page may still use it.
  const previousScope = useRef<readonly unknown[]>();
  useEffect(() => {
    const next = ["visual-collection", tenant, project, identity] as const;
    const previous = previousScope.current;
    previousScope.current = next;
    if (previous && previous.some((part, index) => part !== next[index])) void queryClient.removeQueries({ queryKey: previous });
  }, [queryClient, tenant, project, identity]);

  const metadataSchemas = useMemo(() => schemasNeedingFieldTypes(root), [root]);
  const needsMetadata = metadataSchemas.length > 0;
  // Field metadata is isolated to this verified actor and project.
  const metadata = useQuery({
    networkMode: "always", queryKey: ["visual-field-types", tenant, project, identity],
    queryFn: async ({ signal }) => {
      try { return (await axiosClient.get<unknown>("/runtime/schemas", { signal, timeout: 15000, runtimeScope: { tenant: tenant!, project: project! } })).data; }
      catch (reason) { if (axios.isCancel(reason)) throw reason; throw classifyCollectionError(reason); }
    },
    enabled: needsMetadata && scopeReady,
    ...baseQueryOptions, retry: shouldRetryCollection,
  });
  const fieldTypesBySchema = useMemo(() => {
    if (!needsMetadata || metadata.data === undefined) return undefined;
    const result: Record<string, CollectionFieldTypes> = {};
    for (const container of normalizeContainersResponse(metadata.data)) {
      result[container.schemaName] = Object.fromEntries(container.fields.map((field) => [field.name, field.type]));
    }
    return result;
  }, [needsMetadata, metadata.data]);

  const plan = useMemo(() => planDocumentCollections(root, fieldTypesBySchema), [root, fieldTypesBySchema]);
  const scope: CollectionScope = { tenant: tenant ?? "", project: project ?? "", identity: identity ?? "unresolved" };
  const results = useQueries({
    queries: plan.descriptors.map((descriptor) => collectionQueryOptions(scope, descriptor, scopeReady && (!descriptor.filters.length || metadata.isSuccess && !metadata.isFetching))),
  });

  const metadataPending = useMemo(
    () => (needsMetadata && metadata.isPending && scopeReady ? new Set(metadataSchemas) : undefined),
    [needsMetadata, metadata.isPending, scopeReady, metadataSchemas],
  );
  const snapshots = results.map((result) => ({ status: result.status, data: result.data, error: result.error, refetch: result.refetch }));
  const assembly = assembleCollections(plan, snapshots, { metadataPending, waiting: !scopeReady });
  if (metadata.isError) for (const entry of plan.repeaters) if (entry.requiresFieldTypes) {
    assembly.collectionStates[entry.repeaterId] = collectionState({ status: "error", error: metadata.error, refetch: metadata.refetch });
    delete assembly.resolvedCollections[entry.sourceKey];
  }
  if (session.isError) for (const entry of plan.repeaters) assembly.collectionStates[entry.repeaterId] = { status: "error", message: "Your session could not be verified. Sign in or retry.", onRetry: () => void session.refetch() };
  return { ...assembly, diagnostics: { requestCount: plan.descriptors.length, repeaterCount: plan.repeaters.length } };
}

export interface CollectionDiagnostics {
  /** Distinct effective requests for this document. */
  requestCount: number;
  repeaterCount: number;
}

export function useVisualCollections(root: ComponentNode) {
 const consumer = usePageRequestConsumer();
 const page = usePageVisualCollections(root);
 const standalone = useStandaloneVisualCollections(root, !consumer);
 return consumer ? page : standalone;
}
