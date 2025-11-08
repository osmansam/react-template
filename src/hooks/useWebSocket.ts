// useWebSocket.ts
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type WSInvalidateEvent = { type: "invalidate"; schema: string; ts?: number };

const API_URL = import.meta.env.VITE_API_URL as string;

function toWsUrl(httpUrl: string, wsPath = "/ws") {
  const u = new URL(httpUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = wsPath.startsWith("/") ? wsPath : `/${wsPath}`;
  u.search = "";
  return u.toString();
}
export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef({ userClosed: false, delay: 1000 });

  useEffect(() => {
    if (!API_URL) {
      console.warn("VITE_API_URL is not set; WebSocket will not connect.");
      return;
    }

    const WS_URL = toWsUrl(API_URL, "/ws");

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS connected:", WS_URL);
        stateRef.current.delay = 1000;
      };

      ws.onmessage = async (evt) => {
        try {
          const msg: WSInvalidateEvent = JSON.parse(evt.data);
          console.log("WS message received:", msg);
          if (msg?.type !== "invalidate" || !msg?.schema) return;
          console.log("WS invalidating queries for schema:", msg.schema);
          await queryClient.invalidateQueries({
            queryKey: ["dynamic", msg.schema, "all"],
            type: "active",
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
        if (stateRef.current.userClosed) return;
        const d = stateRef.current.delay;
        setTimeout(connect, d);
        stateRef.current.delay = Math.min(d + 1000, 5000);
      };
    };

    connect();

    return () => {
      stateRef.current.userClosed = true;
      try {
        wsRef.current?.close();
      } catch {
        /* ignore non-JSON */
      }
      wsRef.current = null;
    };
  }, [queryClient]);
}
