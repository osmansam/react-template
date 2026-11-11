// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, renderHook, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosHeaders } from "axios";
import { afterEach, expect, it } from "vitest";
import { axiosClient } from "../../utils/api/axiosClient";
import { PageRuntimeProvider } from "../PageRuntimeProvider";
import { PageRequestConsumerProvider } from "./ConsumerProvider";
import { useGetTableSourceItems } from "../../utils/dynamic";
import { useVisualCollections } from "../../visualBuilder/data/useVisualCollections";
import { useFormSelectionData } from "../../components/forms/useFormSelectionData";
import { buildFormInputs } from "../../utils/formConfig";
import type { FormComponentConfig } from "../../types/page";
import type { ComponentNode } from "../../visual-engine/model";
import type { PageRequestValues } from "../../types/pageRequests";
import type { ComponentBlock, PageModel } from "../../types/page";
const original = axiosClient.defaults.adapter;
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; localStorage.clear(); });
it("connects dropdown options without requiring an inline source", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/products");
 let reads = 0;
 axiosClient.defaults.adapter = async config => {
  const session = config.url?.includes("auth/session"); if (!session) reads++;
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: session ? { authenticated: true, user: { _id: "u" } } : { items: [{ _id: "p", name: "Product" }], totalItems: 1 } };
 };
 const form: FormComponentConfig = { schemaName: "orders", fields: [{ formKey: "product", type: "select", sourceLabelField: "name" }] };
 const component: ComponentBlock = { id: "form", type: "form", form, requestBindings: { "options:product": { requestId: "products" } } };
 const page: PageModel = { id: "page", name: "P", sections: [{ type: "component", component }], requests: [{ id: "products", name: "Products", source: { transport: "table-source", kind: "schema", schemaName: "products" }, result: { kind: "records" } }] };
 const client = new QueryClient();
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/products"] }, createElement(PageRuntimeProvider, { page }, createElement(PageRequestConsumerProvider, { component }, children))));
 const hook = renderHook(() => buildFormInputs(form, useFormSelectionData(form)), { wrapper });
 await waitFor(() => expect(hook.result.current[0]?.options?.[0]?.label).toBe("Product"));
 expect(reads).toBe(1);
 client.clear();
});
it("shares table and visual reads then separates a visual filter override", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/products");
 let reads = 0;
 axiosClient.defaults.adapter = async config => {
  const session = config.url?.includes("auth/session"); if (!session) reads++;
  const active = config.url?.includes("active=true");
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: session ? { authenticated: true, user: { _id: "u" } } : { items: [{ _id: "p", name: active ? "Active" : "All" }], totalItems: 1, currentPage: 1, totalPages: 1 } };
 };
 const root: ComponentNode = { id: "root", type: "section", children: [{ id: "repeater", type: "repeater", itemAlias: "item", source: { kind: "autotable", schemaName: "products", limit: 20 }, children: [] }] };
 const table: ComponentBlock = { id: "table", type: "table", requestBindings: { data: { requestId: "products" } } };
 const visual: ComponentBlock = { id: "visual", type: "custom", props: { visualBuilder: { document: { root } } }, requestBindings: { "collection:repeater": { requestId: "products" } } };
 const page: PageModel = { id: "page", name: "Products", requests: [{ id: "products", name: "Products", source: { transport: "table-source", kind: "schema", schemaName: "products" }, defaults: { controls: { page: 1, limit: 20 } }, result: { kind: "records" } }], sections: [table, visual].map(component => ({ type: "component", component })) };
 const client = new QueryClient();
 const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/products"] }, createElement(PageRuntimeProvider, { page }, children)));
 const a = renderHook(({ overrides }: { overrides?: PageRequestValues }) => useGetTableSourceItems<{ name: string }>(1, 20, { kind: "schema", schemaName: "products" }, {}, {}, "", true, overrides), { initialProps: { overrides: undefined as PageRequestValues | undefined }, wrapper: ({ children }) => createElement(wrapper, null, createElement(PageRequestConsumerProvider, { component: table }, children)) });
 const b = renderHook(() => useVisualCollections(root), { wrapper: ({ children }) => createElement(wrapper, null, createElement(PageRequestConsumerProvider, { component: visual }, children)) });
 await waitFor(() => expect(a.result.current?.items[0].name).toBe("All"));
 await waitFor(() => expect(Object.values(b.result.current.resolvedCollections)[0]?.[0]?.name).toBe("All"));
 expect(reads).toBe(1);
 a.rerender({ overrides: { filters: { active: true } } });
 await waitFor(() => expect(a.result.current?.items[0].name).toBe("Active"));
 expect(Object.values(b.result.current.resolvedCollections)[0]?.[0]?.name).toBe("All");
 expect(reads).toBe(2);
 a.rerender({ overrides: { controls: { sort: "name", asc: false } } });
 await waitFor(() => expect(reads).toBe(3));
 a.rerender({ overrides: undefined });
 await waitFor(() => expect(a.result.current?.items[0].name).toBe("All"));
 expect(reads).toBe(3);
 cleanup(); client.clear();
});


it.each(["dataset:products", "datasetDataset15476Fa8F15F41809E62Debd7984Cf05"])("renders retired dataset layouts without fetching their former sources (%s)", async slot => {
 const { default: VisualBlock } = await import("../../visualBuilder/VisualBlock");
 window.history.replaceState(null, "", "/t/acme/p/shop/products");
 let reads = 0;
 axiosClient.defaults.adapter = async config => {
  const session = config.url?.includes("auth/session");
  if (!session) reads++;
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: session ? { authenticated: true, user: { _id: "u" } } : { items: [], totalItems: 0 } };
 };
 const component: ComponentBlock = { id: "visual", type: "custom", requestBindings: { [slot]: { requestId: "removed" } }, props: { visualBuilder: { document: { version: 2, id: "doc", name: "Catalog", datasets: [{ id: "products" }], root: { id: "root", type: "section", children: [{ id: "rows", type: "repeater", datasetId: "products", itemAlias: "product", source: { kind: "autotable", schemaName: "product", limit: 20 }, children: [{ id: "template", type: "slot", name: "item", children: [{ id: "text", type: "text", text: "Catalog card" }] }] }] } } } } };
 const page: PageModel = { id: "page", name: "Catalog", sections: [{ type: "component", component }] };
 const client = new QueryClient();
 render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/products"] }, createElement(PageRuntimeProvider, { page }, createElement(PageRequestConsumerProvider, { component }, createElement(VisualBlock, { component }))))));
 await screen.findByText("Catalog card");
 expect(screen.queryByRole("alert")).toBeNull();
 expect(reads).toBe(0);
 cleanup(); client.clear();
});
