import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  currentProjectScope,
  projectQueryKey,
  type ProjectScope,
} from "../utils/projectScope";
import { pageRequestInvalidationPredicate } from "../pageRuntime/requests/invalidation";
import {
  shouldInvalidateDynamicQuery,
  shouldInvalidateVisualCollectionQuery,
} from "../utils/dynamicQueryKeys";

export function handleWebSocketVisibilityChange({
  visibilityState,
  socketReadyState,
  reconnect,
}: {
  visibilityState: DocumentVisibilityState;
  socketReadyState: number | null;
  reconnect: () => void;
}) {
  if (
    visibilityState === "visible" &&
    socketReadyState !== WebSocket.OPEN &&
    socketReadyState !== WebSocket.CONNECTING
  )
    reconnect();
}

interface ConnectionOptions {
  scope?: ProjectScope | null;
  apiUrl?: string;
}

/** One effect owns the connection, retry timer, and all callbacks for its project. */
export function useWebSocket(options: ConnectionOptions = {}) {
  const client = useQueryClient();
  const scope =
    options.scope === undefined ? currentProjectScope() : options.scope;
  const tenant = scope?.tenant,
    project = scope?.project;
  const apiUrl = options.apiUrl ?? import.meta.env.VITE_API_URL;
  useEffect(() => {
    if (!apiUrl || typeof WebSocket === "undefined") return;
    let url: URL;
    try {
      url = new URL(apiUrl);
      if (!["https:", "http:"].includes(url.protocol)) return;
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname =
        tenant && project
          ? `${url.pathname.replace(/\/$/, "")}/${encodeURIComponent(tenant)}/${encodeURIComponent(project)}/ws`
          : "/ws";
      url.search =
        tenant && project
          ? new URLSearchParams({
              tenantSlug: tenant,
              projectSlug: project,
            }).toString()
          : "";
      url.hash = "";
    } catch {
      return;
    }
    const activeScope = tenant && project ? { tenant, project } : null;
    let disposed = false,
      delay = 1000;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clearRetry = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const disconnect = () => {
      if (!socket) return;
      const previous = socket;
      socket = null;
      previous.onopen =
        previous.onmessage =
        previous.onerror =
        previous.onclose =
          null;
      previous.close();
    };
    const schedule = () => {
      if (disposed || timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        connect();
      }, delay);
      delay = Math.min(delay + 1000, 5000);
    };
    const connect = () => {
      if (
        disposed ||
        (socket &&
          (socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING))
      )
        return;
      let current: WebSocket;
      try {
        current = new WebSocket(url.toString());
      } catch {
        schedule();
        return;
      }
      socket = current;
      const owned = () => !disposed && socket === current;
      current.onopen = () => {
        if (owned()) delay = 1000;
      };
      current.onmessage = async (event) => {
        if (!owned()) return;
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "pageChanged") {
            await client.invalidateQueries({
              queryKey: projectQueryKey(activeScope, ["page"]),
              type: "all",
            });
          } else if (message?.type === "containerChanged") {
            await client.invalidateQueries({
              predicate: (query) =>
                ["container", "containers", "containerTypes"].some((family) =>
                  projectQueryKey(activeScope, [family]).every(
                    (part, i) => query.queryKey[i] === part,
                  ),
                ),
              type: "all",
            });
          } else if (
            message?.type === "invalidate" &&
            typeof message.schema === "string" &&
            message.schema
          ) {
            await client.invalidateQueries({
              predicate: (query) =>
                shouldInvalidateDynamicQuery(
                  query.queryKey,
                  message.schema,
                  activeScope,
                ) ||
                shouldInvalidateVisualCollectionQuery(
                  query,
                  message.schema,
                  activeScope,
                ) ||
                pageRequestInvalidationPredicate(
                  activeScope,
                  message.schema,
                )(query),
              refetchType: "active",
            });
          }
        } catch {
          /* Ignore malformed messages and failed background invalidation. */
        }
      };
      current.onerror = () => {
        if (owned()) current.close();
      };
      current.onclose = () => {
        if (owned()) {
          socket = null;
          schedule();
        }
      };
    };
    const onVisible = () =>
      handleWebSocketVisibilityChange({
        visibilityState: document.visibilityState,
        socketReadyState: socket?.readyState ?? null,
        reconnect: () => {
          clearRetry();
          disconnect();
          connect();
        },
      });
    document.addEventListener("visibilitychange", onVisible);
    connect();
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearRetry();
      disconnect();
    };
  }, [client, apiUrl, tenant, project]);
}
