// @vitest-environment jsdom
import { createElement as h, StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useWebSocket } from "./useWebSocket";
import type { ProjectScope } from "../utils/projectScope";
class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static instances: Socket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => unknown) | null = null;
  constructor(public url: string) {
    Socket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}
const alpha = { tenant: "alpha", project: "one" },
  beta = { tenant: "beta", project: "two" };
function Probe({
  scope = alpha,
  apiUrl = "http://localhost:3002/api/v1",
}: {
  scope?: ProjectScope;
  apiUrl?: string;
}) {
  useWebSocket({ scope, apiUrl });
  return null;
}
function tree(
  client: QueryClient,
  scope = alpha,
  strict = false,
  apiUrl?: string,
) {
  const inner = h(QueryClientProvider, { client }, h(Probe, { scope, apiUrl }));
  return strict ? h(StrictMode, {}, inner) : inner;
}
beforeEach(() => {
  vi.useFakeTimers();
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("reconnects after Strict Mode setup/cleanup/setup", () => {
  render(tree(new QueryClient(), alpha, true));
  const socket = Socket.instances.at(-1)!;
  socket.open();
  socket.close();
  const count = Socket.instances.length;
  vi.advanceTimersByTime(1000);
  expect(Socket.instances).toHaveLength(count + 1);
});
it("cancels a pending reconnect on unmount", () => {
  const view = render(tree(new QueryClient()));
  Socket.instances[0].open();
  Socket.instances[0].close();
  view.unmount();
  vi.advanceTimersByTime(10000);
  expect(Socket.instances).toHaveLength(1);
});
it("replaces the project connection and ignores stale events", async () => {
  const client = new QueryClient(),
    invalidate = vi.spyOn(client, "invalidateQueries");
  const view = render(tree(client));
  const old = Socket.instances[0],
    message = old.onmessage!;
  view.rerender(tree(client, beta));
  expect(old.readyState).toBe(Socket.CLOSED);
  expect(Socket.instances).toHaveLength(2);
  expect(Socket.instances[1].url).toContain("/beta/two/ws");
  await message({ data: JSON.stringify({ type: "pageChanged" }) });
  expect(invalidate).not.toHaveBeenCalled();
});
it("does not replace connecting sockets on visibility events", () => {
  render(tree(new QueryClient()));
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  for (let i = 0; i < 3; i++)
    document.dispatchEvent(new Event("visibilitychange"));
  expect(Socket.instances).toHaveLength(1);
});
it.each(["not a URL", "ftp://localhost/api", ""])(
  "does not connect for invalid API setting %s",
  (apiUrl) => {
    expect(() =>
      render(tree(new QueryClient(), alpha, false, apiUrl)),
    ).not.toThrow();
    expect(Socket.instances).toHaveLength(0);
  },
);
