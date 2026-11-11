import { useEffect, useRef } from "react";
import type { TrackedPageRead } from "./ReadStatus";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { JsonRequestValue, PageRequestValues } from "../../types/pageRequests";
import { usePageRequestConsumer } from "./ConsumerProvider";
import { compilePageRequest, type EffectivePageRequest } from "./descriptor";
import { pageRequestQueryOptions } from "./query";
import { resolvePageRequest } from "./resolver";
import { selectPageRequestResult } from "./adapters";
import { requestRecord } from "../../utils/pageRequests";

export interface SelectionLocalRequestOptions {
  filters?: Record<string, unknown>;
  dataFields?: string[];
  ready?: boolean;
  trackRead?: boolean;
}

export function selectionDescriptor(path: string): EffectivePageRequest {
  const url = new URL(path, "https://runtime.invalid");
  const query = [...url.searchParams.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return { method: "GET", path: url.pathname, query, schemaName: url.searchParams.get("schemaName") || "", transport: "selection", envelope: "raw", headers: { "Content-Type": "application/json" } };
}
export function usePageSelectionOptions() {
  const consumer = usePageRequestConsumer();
  const reads: Array<{ slot: string; read: TrackedPageRead }> = [];
  const previous = useRef<{ signature: string; cleanups: Array<(() => void) | undefined> }>({ signature: "", cleanups: [] });
  useEffect(() => {
    const signature = JSON.stringify(reads);
    if (signature === previous.current.signature) return;
    previous.current.cleanups.forEach(cleanup => cleanup?.());
    previous.current = { signature, cleanups: reads.map(({ slot, read }) => consumer?.trackRead(slot, read)) };
  });
  useEffect(() => () => previous.current.cleanups.forEach(cleanup => cleanup?.()), [consumer?.trackRead]);
  const options = function options<T>(slot: string, path: string, legacy: UseQueryOptions<T>, local?: SelectionLocalRequestOptions): UseQueryOptions<T> {
    const ready = local?.ready !== false;
    if (!consumer) return ready ? legacy : { ...legacy, enabled: false };
    const connection = consumer.connections.get(slot);
    const localValues: PageRequestValues | undefined = local?.filters
      ? { filters: local.filters as Record<string, JsonRequestValue> }
      : undefined;
    const source = connection
      ? local?.dataFields?.length && connection.definition.source.transport === "selection"
        ? {
            ...connection.definition.source,
            dataFields: Array.from(
              new Set([...(connection.definition.source.dataFields || []), ...local.dataFields]),
            ),
          }
        : connection.definition.source
      : undefined;
    const descriptor = connection && source
      ? compilePageRequest(
          source,
          resolvePageRequest(
            connection.definition,
            connection.values,
            connection.connection,
            localValues,
          ),
        )
      : selectionDescriptor(path);
    if (!consumer.scope) return { ...legacy, enabled: false };
    const enabled = ready && (connection ? true : legacy.enabled !== false);
    const shared = pageRequestQueryOptions(consumer.scope, descriptor, enabled);
    if (enabled && local?.trackRead !== false) reads.push({ slot, read: { key: shared.queryKey } });
    return {
      ...shared,
      select: (payload: unknown) => {
        const value = connection ? selectPageRequestResult(payload, connection.connection.result || connection.definition.result) : payload;
        return (Array.isArray(value) ? value : requestRecord(value) ? value.items || value.data || [] : []) as T;
      },
    } as UseQueryOptions<T>;
  };
  return Object.assign(options, { connected: (slot: string) => !!consumer?.connections.has(slot) });
}
