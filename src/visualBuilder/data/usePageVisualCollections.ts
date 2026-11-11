import { safeInstanceKey } from "../../visual-engine/renderer/instances";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { ComponentNode, AutoTableCollectionSource } from "../../visual-engine/model";
import type { CollectionAssembly } from "./collectionQuery";
import { collectionState } from "./collectionQuery";
import { usePageRequestConsumer } from "../../pageRuntime/requests/ConsumerProvider";
import { compilePageRequest, pageRequestSignature } from "../../pageRuntime/requests/descriptor";
import { pageRequestQueryOptions } from "../../pageRuntime/requests/query";
import { resolvePageRequest } from "../../pageRuntime/requests/resolver";
import { selectPageRequestResult, toCollectionPage } from "../../pageRuntime/requests/adapters";
import { collectionSourceKey } from "../../visual-engine/renderer/repeaters";
import { planCollection, encodeFilterValue, type CollectionFieldTypes } from "./collectionPlan";
import { axiosClient } from "../../utils/api/axiosClient";
import { normalizeContainersResponse } from "../../utils/api/containerResponse";
import { CollectionError } from "./collectionFetch";
import { baseQueryOptions } from "../../config/queryClient";

export function usePageVisualCollections(root: ComponentNode): CollectionAssembly & { diagnostics: { requestCount: number; repeaterCount: number } } {
  const consumer = usePageRequestConsumer(), scope = consumer?.scope;
  const componentId = consumer?.component.id;
  const repeaters = useMemo(() => {
    const entries: Array<{ id: string; source: AutoTableCollectionSource; slot: string }> = [];
    const walk = (node: ComponentNode) => {
      if (node.type === "repeater") {
        const suffix = componentId ? `--${safeInstanceKey(componentId)}` : "";
        const originalId = suffix && node.id.endsWith(suffix) ? node.id.slice(0, -suffix.length) : node.id;
        entries.push({ id: node.id, source: node.source, slot: `collection:${node.source.requestSlot || originalId}` });
      }
      if ("children" in node) node.children.forEach(walk);
    }; walk(root); return entries;
  }, [root, componentId]);
  const needsMetadata = repeaters.some(entry => !consumer?.connections.has(entry.slot) && entry.source.filters?.length);
  const metadata = useQuery({
    queryKey: ["visual-field-types", scope?.tenant, scope?.project, scope?.identity],
    queryFn: async ({ signal }) => (await axiosClient.get("/runtime/schemas", { signal, timeout: 15000, runtimeScope: scope })).data as unknown,
    enabled: !!scope && needsMetadata, ...baseQueryOptions,
  });
  const fieldTypes = useMemo(() => Object.fromEntries(normalizeContainersResponse(metadata.data).map(container => [container.schemaName, Object.fromEntries(container.fields.map(field => [field.name, field.type]))])) as Record<string, CollectionFieldTypes>, [metadata.data]);
  const planned = repeaters.map(entry => {
    const connection = consumer?.connections.get(entry.slot);
    try {
      if (connection) {
        const values = resolvePageRequest(connection.definition, connection.values, connection.connection);
        return { entry, descriptor: compilePageRequest(connection.definition.source, values), result: connection.connection.result || connection.definition.result, page: values.controls?.page ?? 1, limit: values.controls?.limit ?? entry.source.limit };
      }
      if (entry.source.requestSlot) throw new Error("Connect this collection to a page request.");
      const plan = planCollection(entry.source, fieldTypes[entry.source.schemaName]);
      if (!plan.ok) throw new Error(plan.reason);
      const filters: Record<string, string | string[]> = {};
      for (const filter of plan.descriptor.filters) {
        const encoded = encodeFilterValue(filter, plan.descriptor.filterTypes?.[filter.field]);
        const previous = filters[filter.field]; filters[filter.field] = previous === undefined ? encoded : [...(Array.isArray(previous) ? previous : [previous]), encoded];
      }
      const sort = plan.descriptor.sort;
      return { entry, descriptor: compilePageRequest({ transport: "table-source", kind: "schema", schemaName: entry.source.schemaName }, { filters, controls: { page: 1, limit: entry.source.limit, ...(sort ? { sort: sort.field, asc: sort.direction === "asc" } : {}) } }), result: { kind: "records" as const }, page: 1, limit: entry.source.limit };
    } catch (error) { return { entry, error }; }
  });
  const queries = useQueries({ queries: planned.map(plan => plan.descriptor && scope ? pageRequestQueryOptions(scope, plan.descriptor) : { queryKey: ["page-collection-disabled", plan.entry.id], queryFn: async () => undefined, enabled: false }) });
  const resolvedCollections: CollectionAssembly["resolvedCollections"] = {}, collectionStates: CollectionAssembly["collectionStates"] = {};
  planned.forEach((plan, index) => {
    const query = queries[index];
    if (!consumer) return;
    if (plan.error) { collectionStates[plan.entry.id] = needsMetadata && metadata.isPending && !consumer.connections.has(plan.entry.slot) ? { status: "loading", message: "Loading…" } : { status: "error", message: plan.error instanceof Error ? plan.error.message : "Invalid page request." }; return; }
    try {
      const data = query.isSuccess ? toCollectionPage(selectPageRequestResult(query.data, plan.result!), plan.page!, plan.limit!) : undefined;
      const state = collectionState({ status: query.status, data, error: query.error, refetch: query.refetch });
      if (state.status === "success" && data) {
        resolvedCollections[collectionSourceKey(plan.entry.source)] = data.items;
        state.message = `Showing ${Math.min(data.items.length, plan.entry.source.limit, 100)} of ${data.total} records · page ${data.page}, up to ${data.pageSize}.`;
      }
      collectionStates[plan.entry.id] = state;
    } catch (error) { collectionStates[plan.entry.id] = collectionState({ status: "error", error: new CollectionError("malformed", error instanceof Error ? error.message : "Invalid data."), refetch: query.refetch }); }
  });
  return { resolvedCollections, collectionStates, diagnostics: { requestCount: new Set(planned.flatMap(plan => plan.descriptor ? [pageRequestSignature(plan.descriptor)] : [])).size, repeaterCount: repeaters.length } };
}
