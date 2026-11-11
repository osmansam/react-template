// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { AxiosHeaders, AxiosError } from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import { PageRuntimeProvider } from "../PageRuntimeProvider";
import { GeneralContextProvider } from "../../context/General.context";
import { PageSectionView } from "../../components/DynamicPageSections";
import type { PageModel } from "../../types/page";
const original = axiosClient.defaults.adapter;
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; });
it.each(["forbidden", "malformed"]) ("offers recovery when a legacy page session cannot be verified (%s)", async failure => {
 window.history.replaceState(null, "", "/t/acme/p/shop/products");
 axiosClient.defaults.adapter = async config => {
  if (failure === "malformed" && config.url?.includes("auth/session")) return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: { authenticated: true, user: { _id: { invalid: true } } } };
  if (config.url?.includes("auth/session")) throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, status: 403, statusText: "Forbidden", headers: new AxiosHeaders(), data: {} });
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: [] };
 };
 const page: PageModel = { id: "legacy", name: "Legacy", sections: [{ type: "component", component: { id: "table", type: "table", dataBinding: { kind: "schema", schemaName: "products" } } }] };
 const client = new QueryClient();
 render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/products"] }, createElement(GeneralContextProvider, {}, createElement(PageRuntimeProvider, { page }, createElement(PageSectionView, { section: page.sections[0], pageFilters: [], routeParams: {} }))))));
 expect((await screen.findByRole("alert")).textContent).toContain("session");
 expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
 client.clear();
});
it("keeps shared page two on the first table mount", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/products");
 const requestedPages: string[] = [];
 axiosClient.defaults.adapter = async config => {
  const url = config.url || "";
  let data: unknown;
  if (url.includes("auth/session")) data = { authenticated: true, user: { _id: "u" } };
  else if (url.includes("runtime/schemas")) data = [{ _id: "schema", schemaName: "products", fields: [{ name: "_id", type: "string" }, { name: "name", type: "string" }] }];
  else { const page = new URL(url, "https://fixture.invalid").searchParams.get("page") || "1"; requestedPages.push(page); data = { items: [{ _id: "p", name: `Page ${page} product` }], totalItems: 40, totalPages: 2, currentPage: Number(page) }; }
  return { config, data, status: 200, statusText: "OK", headers: new AxiosHeaders() };
 };
 const page: PageModel = { id: "page", name: "Products", requests: [{ id: "products", name: "Products", source: { transport: "table-source", kind: "schema", schemaName: "products" }, defaults: { controls: { page: 2, limit: 20 } }, result: { kind: "records" } }], sections: [{ type: "component", component: { id: "table", type: "table", requestBindings: { data: { requestId: "products" } }, table: { columns: [{ field: "name", displayName: "Name" }] } } }] };
 const client = new QueryClient();
 render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/products"] }, createElement(GeneralContextProvider, {}, createElement(PageRuntimeProvider, { page }, createElement(PageSectionView, { section: page.sections[0], pageFilters: [], routeParams: {} }))))));
 await screen.findByText("Page 2 product");
 await waitFor(() => expect(client.isFetching()).toBe(0));
 expect(requestedPages).toEqual(["2"]);
 client.clear();
});
