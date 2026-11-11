// @vitest-environment jsdom
import { createElement } from "react";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import { AxiosHeaders } from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import { compilePageRequest } from "./descriptor";
import { pageRequestQueryOptions } from "./query";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageRequestReadStatus } from "./ReadStatus";
import { AxiosError } from "axios";
const original = axiosClient.defaults.adapter;
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; });
it("shows a scoped error and retries the failed read", async () => {
 let denied = true;
 axiosClient.defaults.adapter = async config => {
  if (denied) throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, status: 403, statusText: "Forbidden", headers: new AxiosHeaders(), data: {} });
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: { items: [] } };
 };
 const client = new QueryClient();
 const descriptor = compilePageRequest({ transport: "list", schemaName: "products" });
 const options = pageRequestQueryOptions({ tenant: "t", project: "p", identity: "u", pageKey: "page" }, descriptor);
 function App() { useQuery(options); return createElement(PageRequestReadStatus, { reads: [{ key: options.queryKey }] }); }
 render(createElement(QueryClientProvider, { client }, createElement(App)));
 await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("could not"));
 denied = false;
 fireEvent.click(screen.getByRole("button", { name: "Try again" }));
 await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
 client.clear();
});
it("shares pending and fresh reads and keeps the remaining subscriber alive", async () => {
 let calls = 0; let finish: (() => void) | undefined;
 axiosClient.defaults.adapter = async config => { calls++; await new Promise<void>(resolve => { finish = resolve; }); return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: { items: [{ _id: "p", name: "Product" }], totalItems: 1 } }; };
 const client = new QueryClient();
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, children);
 const descriptor = compilePageRequest({ transport: "table-source", kind: "schema", schemaName: "products" }, { controls: { page: 1, limit: 20 } });
 const options = pageRequestQueryOptions({ tenant: "t", project: "p", identity: "u", pageKey: "page" }, descriptor);
 const a = renderHook(() => useQuery(options), { wrapper });
 const b = renderHook(() => useQuery(options), { wrapper });
 await waitFor(() => expect(calls).toBe(1));
 a.unmount(); finish!();
 await waitFor(() => expect(b.result.current.data).toEqual({ items: [{ _id: "p", name: "Product" }], totalItems: 1 }));
 const c = renderHook(() => useQuery(options), { wrapper });
 await waitFor(() => expect(c.result.current.isSuccess).toBe(true));
 expect(calls).toBe(1);
 client.clear();
});
