// @vitest-environment jsdom
import { createElement } from "react";
import { renderHook, waitFor, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import { useVisualCollections } from "./useVisualCollections";
import { useWebSocket } from "../../hooks/useWebSocket";
import { collectionQueryOptions } from "./collectionQuery";
import { planCollection } from "./collectionPlan";
import type { ComponentNode } from "../../visual-engine/model";
vi.hoisted(() => {
 // useWebSocket captures its API URL at import time, before test setup runs.
 vi.stubEnv("VITE_API_URL", "https://api.example.test/api/v1");
});
const actor = vi.hoisted(() => ({ user: undefined as undefined | { _id: string } }));
vi.mock("../../context/User.context", () => ({ useUserContext: () => actor }));
const original = axiosClient.defaults.adapter;
const root: ComponentNode = { id: "root", type: "section", children: ["a", "b"].map(id => ({ id, type: "repeater", source: { kind: "autotable", schemaName: "products", limit: 5 }, itemAlias: "item", children: [{ id: `${id}-slot`, type: "slot", name: "item", children: [] }] })) };
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; actor.user = undefined; localStorage.clear(); vi.unstubAllGlobals(); });
afterAll(() => { vi.unstubAllEnvs(); });
it("refreshes all active visual copies after a schema event without touching other projects or schemas", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 class Socket {
  static OPEN = 1; static CLOSED = 3; static instances: Socket[] = [];
  readyState = 1;
  onopen: (() => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => unknown) | null = null;
  constructor() { Socket.instances.push(this); }
  close() { this.readyState = 3; }
 }
 vi.stubGlobal("WebSocket", Socket);
 let name = "Before edit", calls = 0;
 axiosClient.defaults.adapter = async config => {
  const session = config.url?.includes("auth/session");
  if (!session) calls++;
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: session ? { authenticated: true, user: { _id: "u1" } } : { items: [{ _id: "p1", name }], totalItems: 1, totalPages: 1, currentPage: 1 } };
 };
 const client = new QueryClient();
 const unrelated = [];
 for (const [tenant, project, schemaName] of [["acme", "other", "products"], ["another", "shop", "products"], ["acme", "shop", "categories"]]) {
  const plan = planCollection({ kind: "autotable", schemaName, limit: 5 });
  if (!plan.ok) throw new Error("Invalid fixture");
  const options = collectionQueryOptions({ tenant, project, identity: "u1" }, plan.descriptor);
  await client.fetchQuery({ ...options, queryFn: async () => ({ items: [{ name: "Unchanged" }], total: 1, page: 1, pageSize: 5 }) });
  unrelated.push(options.queryKey);
 }
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, children));
 const hook = renderHook(() => { useWebSocket(); return useVisualCollections(root); }, { wrapper });
 await waitFor(() => expect(Object.values(hook.result.current.resolvedCollections)[0]?.[0]?.name).toBe("Before edit"));
 expect(calls).toBe(1);
 name = "After table edit";
 await act(async () => { await Socket.instances.at(-1)!.onmessage?.({ data: JSON.stringify({ type: "invalidate", schema: "products" }) }); });
 await waitFor(() => expect(Object.values(hook.result.current.resolvedCollections)[0]?.[0]?.name).toBe("After table edit"));
 expect(hook.result.current.collectionStates.a.status).toBe("success");
 expect(hook.result.current.collectionStates.b.status).toBe("success");
 expect(calls).toBe(2);
 for (const key of unrelated) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});
it("waits for a confirmed session, deduplicates records and reuses them after styling edits", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 let finish: (() => void) | undefined;
 let collections = 0;
 axiosClient.defaults.adapter = async config => {
  if (config.url?.includes("auth/session")) await new Promise<void>(resolve => { finish = resolve; });
  else collections++;
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: config.url?.includes("auth/session") ? { authenticated: true, user: { _id: "u1" } } : { items: [{ _id: "p1", ProductSKU: "Exact" }], totalItems: 1, totalPages: 1, currentPage: 1 } };
 };
 const client = new QueryClient();
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, children));
 const hook = renderHook(({ node }) => useVisualCollections(node), { wrapper, initialProps: { node: root } });
 await waitFor(() => expect(finish).toBeTypeOf("function"));
 expect(collections).toBe(0);
 finish!();
 await waitFor(() => expect(hook.result.current.collectionStates.a.status).toBe("success"));
 expect(collections).toBe(1);
 expect(Object.values(hook.result.current.resolvedCollections)[0][0]).toHaveProperty("ProductSKU", "Exact");
 hook.rerender({ node: { ...root, style: { spacing: { padding: "lg" } } } });
 expect(collections).toBe(1);
});
it("hides cached rows after a forbidden refresh and retries only on request", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 let denied = false, calls = 0;
 axiosClient.defaults.adapter = async config => {
  const session = config.url?.includes("auth/session");
  const response = { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: session ? { authenticated: true, user: { _id: "u1" } } : { items: [{ _id: "p1", name: "Private record" }], totalItems: 1, currentPage: 1, totalPages: 1 } };
  if (!session) { calls++; if (denied) throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { ...response, status: 403 }); }
  return response;
 };
 const client = new QueryClient();
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, children));
 const hook = renderHook(() => useVisualCollections(root), { wrapper });
 await waitFor(() => expect(hook.result.current.collectionStates.a.status).toBe("success"));
 denied = true;
 await act(async () => { await client.refetchQueries({ queryKey: ["visual-collection"] }); });
 await waitFor(() => expect(hook.result.current.collectionStates.a.status).toBe("error"));
 expect(Object.keys(hook.result.current.resolvedCollections)).toHaveLength(0); expect(calls).toBe(2);
 denied = false;
 act(() => hook.result.current.collectionStates.a.onRetry?.());
 await waitFor(() => expect(hook.result.current.collectionStates.a.status).toBe("success"));
 expect(calls).toBe(3);
});
it("cancels and removes the previous actor's in-flight query before accepting new records", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 actor.user = { _id: "u1" }; let finishOld: (() => void) | undefined;
 axiosClient.defaults.adapter = async config => {
  const session = config.url?.includes("auth/session");
  const id = actor.user?._id;
  if (!session && id === "u1") await new Promise<void>(resolve => { finishOld = resolve; });
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: session ? { authenticated: true, user: { _id: id } } : { items: [{ _id: id, name: id }], totalItems: 1, totalPages: 1, currentPage: 1 } };
 };
 const client = new QueryClient();
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, children));
 const hook = renderHook(() => useVisualCollections(root), { wrapper });
 await waitFor(() => expect(finishOld).toBeTypeOf("function"));
 actor.user = { _id: "u2" }; hook.rerender();
 await waitFor(() => expect(Object.values(hook.result.current.resolvedCollections)[0]?.[0]?.name).toBe("u2"));
 await act(async () => { finishOld!(); });
 expect(Object.values(hook.result.current.resolvedCollections)[0]?.[0]?.name).toBe("u2");
 expect(client.getQueryCache().findAll({ queryKey: ["visual-collection", "acme", "shop", "u1"] })).toHaveLength(0);
});
it("offers retry for failed field metadata without automatically repeating a forbidden read", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 let denied = true, metadataCalls = 0, collectionCalls = 0;
 axiosClient.defaults.adapter = async config => {
  let data: unknown;
  if (config.url?.includes("auth/session")) data = { authenticated: true, user: { _id: "u1" } };
  else if (config.url?.includes("runtime/schemas")) {
   metadataCalls++;
   if (denied) throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, headers: new AxiosHeaders(), status: 403, statusText: "Forbidden", data: {} });
   data = [{ schemaName: "products", fields: [{ name: "name", type: "string" }] }];
  } else { collectionCalls++; data = { items: [{ _id: "1", name: "A" }], totalItems: 1, totalPages: 1, currentPage: 1 }; }
  return { config, headers: new AxiosHeaders(), status: 200, statusText: "OK", data };
 };
 const filtered = structuredClone(root);
 if (filtered.type !== "section") throw new Error("Missing section");
 for (const child of filtered.children) if (child.type === "repeater") child.source.filters = [{ field: "name", operator: "eq", value: "A" }];
 const client = new QueryClient();
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, children));
 const hook = renderHook(() => useVisualCollections(filtered), { wrapper });
 await waitFor(() => expect(hook.result.current.collectionStates.a.status).toBe("error"), { timeout: 3000 });
 expect(metadataCalls).toBe(1); expect(collectionCalls).toBe(0);
 expect(hook.result.current.collectionStates.a.onRetry).toBeTypeOf("function");
 denied = false;
 act(() => hook.result.current.collectionStates.a.onRetry?.());
 await waitFor(() => expect(hook.result.current.collectionStates.a.status).toBe("success"));
 expect(metadataCalls).toBe(2); expect(collectionCalls).toBe(1);
});
