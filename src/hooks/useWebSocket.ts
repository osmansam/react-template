// useWebSocket.ts
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useUserContext } from "../context/User.context";

type WSInvalidateEvent =
  | { type: "invalidate"; schema: string; userId?: string; ts?: number }
  | { type: "pageChanged"; ts?: number }
  | { type: "containerChanged"; ts?: number };

const API_URL = import.meta.env.VITE_API_URL as string;

// Helper to extract tenant and project from current URL
function getTenantAndProject(): { tenant: string; project: string } | null {
  const pathParts = window.location.pathname.split("/");
  const tIndex = pathParts.indexOf("t");
  const pIndex = pathParts.indexOf("p");

  if (
    tIndex !== -1 &&
    pIndex !== -1 &&
    pathParts[tIndex + 1] &&
    pathParts[pIndex + 1]
  ) {
    return {
      tenant: pathParts[tIndex + 1],
      project: pathParts[pIndex + 1],
    };
  }

  return null;
}

function toWsUrl(
  httpUrl: string,
  wsPath = "/ws",
  tenantId?: string,
  projectId?: string,
) {
  const u = new URL(httpUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = wsPath.startsWith("/") ? wsPath : `/${wsPath}`;

  // Add tenant and project as query parameters if available
  if (tenantId && projectId) {
    u.search = `?tenantId=${tenantId}&projectId=${projectId}`;
  } else {
    u.search = "";
  }

  return u.toString();
}

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef({ userClosed: false, delay: 1000 });

  const [connectTrigger, setConnectTrigger] = useState(0);

  useEffect(() => {
    if (!API_URL) {
      console.warn("VITE_API_URL is not set; WebSocket will not connect.");
      return;
    }

    // Get tenant and project from URL for WebSocket connection
    const tenantProject = getTenantAndProject();
    const WS_URL = toWsUrl(
      API_URL,
      "/ws",
      tenantProject?.tenant,
      tenantProject?.project,
    );
    const state = stateRef.current;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS connected:", WS_URL);
        state.delay = 1000;
      };

      ws.onmessage = async (evt) => {
        try {
          const msg: WSInvalidateEvent = JSON.parse(evt.data);
          console.log("WS message received:", msg);

          // Handle pageChanged event
          if (msg?.type === "pageChanged") {
            console.log("WS: Page data changed, invalidating page queries");
            await queryClient.invalidateQueries({
              queryKey: ["page"],
              type: "all",
              exact: false,
            });
            return;
          }

          // Handle containerChanged event
          if (msg?.type === "containerChanged") {
            console.log(
              "WS: Container data changed, invalidating container queries",
            );
            await queryClient.invalidateQueries({
              queryKey: ["container"],
              type: "all",
              exact: false,
            });
            return;
          }

          // Handle schema invalidate event
          if (msg?.type !== "invalidate" || !msg?.schema) return;

          // Skip invalidation if this event was triggered by the current user
          // (they already have optimistic updates)
          // Try to get userId from context first, fallback to localStorage
          let currentUserId = user?._id;
          if (!currentUserId) {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                currentUserId = parsedUser._id;
              } catch {
                // ignore parse errors
              }
            }
          }

          if (msg.userId && currentUserId && msg.userId === currentUserId) {
            return;
          }

          console.log("WS invalidating queries for schema:", msg.schema);
          await queryClient.invalidateQueries({
            queryKey: ["dynamic", msg.schema],
            type: "all",
            exact: false,
          });

          // (Optional) be extra-safe: directly hit array keys you know exist
          // await queryClient.invalidateQueries({ queryKey: ["dynamic", msg.schema] });
          // await queryClient.invalidateQueries({ queryKey: ["dynamic", msg.schema, "all"] });
        } catch {
          /* ignore non-JSON */
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore non-JSON */
        }
      };

      ws.onclose = () => {
        console.log("WS disconnected. Reconnecting...");
        if (state.userClosed) return;
        const d = state.delay;
        setTimeout(connect, d);
        state.delay = Math.min(d + 1000, 5000);
      };
    };

    connect();

    return () => {
      state.userClosed = true;
      try {
        wsRef.current?.close();
      } catch {
        /* ignore non-JSON */
      }
      wsRef.current = null;
    };
  }, [queryClient, connectTrigger]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, refreshing data and checking WS...");
        // Always invalidate to get fresh data
        queryClient.invalidateQueries();

        // Reconnect if not open
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log("WS not open, forcing reconnect...");
          setConnectTrigger((prev: number) => prev + 1);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [queryClient]);
}
