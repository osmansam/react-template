import { useEffect, useRef } from "react";
import { canonicalizeRuntimeValue } from "../pageParameterResolver";
import { useQuery } from "@tanstack/react-query";
import { usePageRequestConsumer } from "./ConsumerProvider";
import { compilePageRequest, type EffectivePageRequest } from "./descriptor";
import { pageRequestQueryOptions } from "./query";
import { resolvePageRequest } from "./resolver";
import type { PageRequestValues } from "../../types/pageRequests";
import { selectPageRequestResult } from "./adapters";

export function usePageRead(slot: string, legacy?: EffectivePageRequest, overrides?: PageRequestValues, enabled = true) {
  const consumer = usePageRequestConsumer();
  const connection = consumer?.connections.get(slot);
  let descriptor = legacy, error: unknown;
  try { if (connection) descriptor = compilePageRequest(connection.definition.source, resolvePageRequest(connection.definition, connection.values, connection.connection, overrides)); }
  catch (reason) { descriptor = undefined; error = reason; }
  const handled = !!consumer;
  const options = descriptor && consumer?.scope ? pageRequestQueryOptions(consumer.scope, descriptor, enabled) : undefined;
  const query = useQuery<unknown, unknown>(options || { queryKey: ["page-request-disabled"], queryFn: async () => undefined, enabled: false });
  let data: unknown = query.isError ? undefined : query.data;
  try { if (data !== undefined && connection) data = selectPageRequestResult(data, connection.connection.result || connection.definition.result); }
  catch (reason) { error = reason; data = undefined; }
  const keySignature = canonicalizeRuntimeValue(options?.queryKey);
  const tracked = useRef({ signature: keySignature, key: options?.queryKey });
  if (tracked.current.signature !== keySignature) tracked.current = { signature: keySignature, key: options?.queryKey };
  const trackedKey = tracked.current.key;
  const trackRead = consumer?.trackRead;
  const localError = error instanceof Error ? error.message : error ? String(error) : undefined;
  useEffect(() => {
    if (enabled && trackedKey) return trackRead?.(slot, { key: trackedKey, error: localError });
  }, [trackRead, slot, enabled, trackedKey, localError]);
  return { ...query, error: error || query.error, status: error ? "error" as const : query.status, data, handled, descriptor, queryKey: options?.queryKey, connection };
}

export function usePageReadKey(slot: string, legacy?: EffectivePageRequest, overrides?: PageRequestValues) {
  const consumer = usePageRequestConsumer();
  const connection = consumer?.connections.get(slot);
  try {
    const descriptor = connection ? compilePageRequest(connection.definition.source, resolvePageRequest(connection.definition, connection.values, connection.connection, overrides)) : legacy;
    return consumer?.scope && descriptor ? pageRequestQueryOptions(consumer.scope, descriptor).queryKey : undefined;
  } catch { return undefined; }

}
