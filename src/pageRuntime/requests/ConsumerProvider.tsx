import { removeRetiredVisualConnections } from "../../visual-engine/model/retiredData";
import type { RuntimeSnapshot } from "../types";
import { resolvePageRequest } from "./resolver";
import { tableRequestConfig } from "./tableConfig";
import { PageRequestReadStatus, type TrackedPageRead } from "./ReadStatus";
import { canonicalizeRuntimeValue } from "../pageParameterResolver";
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useSyncExternalStore, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { ComponentBlock, DataBinding, ParameterBinding } from "../../types/page";
import type { PageRequestDefinition, PageRequestValues, PageRequestConnection } from "../../types/pageRequests";
import { useOptionalPageRuntime } from "../PageRuntimeProvider";
import { useTenantProject } from "../../hooks/useTenantProject";
import { useUserContext } from "../../context/User.context";
import { getProjectSessionItem } from "../../utils/projectSessionStorage";
import { axiosClient } from "../../utils/api/axiosClient";
import { compileComponentParameters } from "../pageBindingCompiler";
import { resolveComponentParameters } from "../pageParameterResolver";
import { pageRequestDefinitions, validatePageRequests, listComponentRequestSlots, validateRequestValues } from "../../utils/pageRequests";
import { validatePageRequestGraph } from "./graph";
import type { PageRequestScope } from "./descriptor";
import { BASE_QUERY_STALE_TIME } from "../../config/queryClient";

export interface ResolvedRequestConnection { definition: PageRequestDefinition; connection: PageRequestConnection; values: PageRequestValues }
interface ConsumerContext { component: ComponentBlock; scope?: PageRequestScope; connections: Map<string, ResolvedRequestConnection>; trackRead: (slot: string, read: TrackedPageRead) => () => void }
const Context = createContext<ConsumerContext | null>(null);
const emptySnapshot: RuntimeSnapshot = { pageFilters: {}, pageVariables: {}, components: {} };
const noSubscribe = () => () => {};
export const usePageRequestConsumer = () => useContext(Context);
export function useVerifiedPageRequestScope() {
  const { tenant, project } = useTenantProject();
  const { user } = useUserContext();
  const runtime = useOptionalPageRuntime();
  const userId = user?._id;
  let signedIn = false;
  try { signedIn = getProjectSessionItem("loggedIn") === "true"; } catch { /* unresolved marker */ }
  const session = useQuery({
    queryKey: ["visual-session", tenant, project, userId || "", signedIn], networkMode: "always",
    queryFn: async ({ signal }) => {
      try {
        const response = await axiosClient.get<{ authenticated: boolean; user?: { _id?: string; id?: string } }>("/auth/session", { signal, timeout: 15000, runtimeScope: { tenant: tenant!, project: project! } });
        const id = response.data.user?._id || response.data.user?.id;
        if (typeof response.data.authenticated !== "boolean" || response.data.authenticated && typeof id !== "string") throw new Error("The session identity could not be verified.");
        return response.data;
      } catch (reason) {
        if (axios.isAxiosError(reason) && reason.response?.status === 401 && !userId && !signedIn) return { authenticated: false, user: undefined };
        throw reason;
      }
    },
    enabled: !!tenant && !!project, staleTime: BASE_QUERY_STALE_TIME, retry: false, refetchOnWindowFocus: false,
  });
  const identity = session.data?.authenticated ? session.data.user?._id || session.data.user?.id : session.data?.authenticated === false ? "anonymous" : undefined;
  const pageKey = runtime?.pageKey || "standalone";
  const ready = session.isSuccess && !session.isFetching;
  const scope = useMemo<PageRequestScope | undefined>(() => ready && tenant && project && identity ? { tenant, project, identity, pageKey } : undefined, [ready, tenant, project, identity, pageKey]);
  const previous = useRef<PageRequestScope>();
  const client = useQueryClient();
  useEffect(() => {
    const before = previous.current;
    if (scope) previous.current = scope;
    if (before && (!scope || before.tenant !== scope.tenant || before.project !== scope.project || before.identity !== scope.identity)) {
      const key = ["page-request", before.tenant, before.project, before.identity];
      void client.cancelQueries({ queryKey: key }); client.removeQueries({ queryKey: key });
    }
  }, [client, scope]);
  return { scope, session };
}
function RuntimePageRequestConsumerProvider({ component, children }: { component: ComponentBlock; children?: ReactNode }) {
  const [tracked, setTracked] = useState<Record<string, TrackedPageRead>>({});
  const trackRead = useCallback((slot: string, read: TrackedPageRead) => {
    setTracked(previous => canonicalizeRuntimeValue(previous[slot]) === canonicalizeRuntimeValue(read) ? previous : { ...previous, [slot]: read });
    return () => setTracked(previous => { if (canonicalizeRuntimeValue(previous[slot]) !== canonicalizeRuntimeValue(read)) return previous; const next = { ...previous }; delete next[slot]; return next; });
  }, []);
  const runtime = useOptionalPageRuntime();
  const { scope, session } = useVerifiedPageRequestScope();
  const compiled = useMemo(() => {
    const results = new Map<string, ReturnType<typeof compileComponentParameters>>();
    if (runtime) for (const definition of pageRequestDefinitions(runtime.page)) {
      const bindings: Record<string, ParameterBinding> = {};
      for (const bag of ["params", "filters", "controls"] as const) for (const [key, binding] of Object.entries(definition.bindings?.[bag] || {})) bindings[`${bag}:${key}`] = binding;
      results.set(definition.id, compileComponentParameters(runtime.page, `request:${definition.id}`, bindings));
    }
    return results;
  }, [runtime]);
  const getRequestSnapshot = useMemo(() => {
    const dependencies = Object.values(component.requestBindings || {}).flatMap(connection => compiled.get(connection.requestId)?.dependencies || []);
    let previous: RuntimeSnapshot | undefined;
    return () => {
      const current = runtime?.store.getSnapshot() || emptySnapshot;
      if (previous && dependencies.every(dependency => {
        if (dependency.kind === "pageFilter") return previous!.pageFilters[dependency.filterId] === current.pageFilters[dependency.filterId];
        return previous!.components[dependency.componentId]?.outputs[dependency.outputId] === current.components[dependency.componentId]?.outputs[dependency.outputId];
      })) return previous;
      previous = current;
      return current;
    };
  }, [runtime, compiled, component.requestBindings]);
  const snapshot = useSyncExternalStore(runtime?.store.subscribe || noSubscribe, getRequestSnapshot, getRequestSnapshot);
  const resolved = useMemo(() => {
    const connections = new Map<string, ResolvedRequestConnection>();
    if (!runtime) return { connections };
    const issues = [...validatePageRequests(runtime.page), ...validatePageRequestGraph(runtime.page)];
    if (issues.length) return { connections, error: issues[0].message };
    const definitions = pageRequestDefinitions(runtime.page);
    for (const [slot, connection] of Object.entries(component.requestBindings || {})) {
      const definition = definitions.find(request => request.id === connection.requestId);
      if (!definition) return { connections, error: `Missing page request for ${slot}.` };
      const result = resolveComponentParameters(compiled.get(definition.id)!, snapshot);
      if (result.status !== "ready") return { connections, error: result.status === "error" ? result.errors[0]?.message || "Invalid request parameters." : undefined, waiting: result.status === "waiting" };
      const values: PageRequestValues = {};
      for (const [target, value] of Object.entries(result.values)) {
        const split = target.indexOf(":"), bag = target.slice(0, split) as "params" | "filters" | "controls", key = target.slice(split + 1);
        (values[bag] ||= {} as never)[key as never] = value as never;
      }
      const valueError = validateRequestValues(definition.source, resolvePageRequest(definition, values, connection));
      if (valueError) return { connections, error: valueError };
      connections.set(slot, { definition, connection, values });
    }
    return { connections };
  }, [runtime, component, compiled, snapshot]);
  const context = useMemo(() => ({ component, scope, connections: resolved.connections, trackRead }), [component, scope, resolved.connections, trackRead]);
  if (session.isError && listComponentRequestSlots(component).length > 0) return <p role="alert">Your session could not be verified. <button type="button" onClick={() => void session.refetch()}>Try again</button></p>;
  if (resolved.error) return <p role="alert">{resolved.error}</p>;
  if (Object.keys(component.requestBindings || {}).length && (resolved.waiting || !scope)) return session.isError ? <p role="alert">Your session could not be verified. <button onClick={() => void session.refetch()}>Try again</button></p> : <p role="status">Loading page data…</p>;
  return <Context.Provider value={context}><PageRequestReadStatus reads={Object.values(tracked)} />{children}</Context.Provider>;
}
export function useConnectedDataBinding(fallback?: DataBinding): DataBinding | undefined {
  const context = usePageRequestConsumer();
  const definition = context?.connections.get("data")?.definition;
  if (!definition) return fallback;
  return tableRequestConfig(fallback, definition.source).binding;
}

export function PageRequestConsumerProvider(props: { component: ComponentBlock; children?: ReactNode }) {
  const runtime = useOptionalPageRuntime();
  const component = useMemo(() => removeRetiredVisualConnections(props.component), [props.component]);
  return runtime ? <RuntimePageRequestConsumerProvider {...props} component={component} /> : <>{props.children}</>;
}
