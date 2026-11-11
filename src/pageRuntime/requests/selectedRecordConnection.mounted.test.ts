// @vitest-environment jsdom
import { createElement as h, Fragment, Profiler } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AxiosHeaders } from "axios";
import { afterEach, expect, it } from "vitest";
import { axiosClient } from "../../utils/api/axiosClient";
import { GeneralContextProvider } from "../../context/General.context";
import { PageRuntimeProvider, usePageRuntimeStore } from "../PageRuntimeProvider";
import { PageSectionView } from "../../components/DynamicPageSections";
import type { PageModel } from "../../types/page";

const original = axiosClient.defaults.adapter;
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; });
it("continues updating connected reads when a bound page filter changes", async () => {
  window.history.replaceState(null, "", "/t/acme/p/shop/products");
  let reads = 0;
  axiosClient.defaults.adapter = async config => {
    const url = config.url || "";
    let data: unknown;
    if (url.includes("auth/session")) data = { authenticated: true, user: { _id: "u" } };
    else if (url.includes("runtime/schemas")) data = [{ _id: "schema", schemaName: "products", fields: [{ name: "name", type: "string" }] }];
    else { reads++; data = { items: [{ _id: "product", name: url.includes("active=true") ? "Active product" : "Inactive product" }], totalItems: 1, totalPages: 1, currentPage: 1 }; }
    return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data };
  };
  const page: PageModel = { id: "filtered-page", name: "Products", filters: [{ id: "active", key: "active", label: "Active", type: "boolean", defaultValue: false, placement: { kind: "navbar" } }], requests: [{ id: "products", name: "Products", source: { transport: "table-source", kind: "schema", schemaName: "products" }, bindings: { filters: { active: { source: "pageFilter", filterId: "active" } } }, result: { kind: "records" } }], sections: [{ type: "component", component: { id: "table", type: "table", requestBindings: { data: { requestId: "products" } }, table: { columns: [{ field: "name", displayName: "Name" }] } } }] };
  function ChangeFilter() { const store = usePageRuntimeStore(); return h("button", { onClick: () => store.setPageFilterValue("active", true) }, "Set active"); }
  const client = new QueryClient();
  render(h(QueryClientProvider, { client }, h(MemoryRouter, { initialEntries: ["/t/acme/p/shop/products"] }, h(GeneralContextProvider, {}, h(PageRuntimeProvider, { page }, h(ChangeFilter), h(PageSectionView, { section: page.sections[0], pageFilters: [], routeParams: {} }))))));
  await screen.findByText("Inactive product");
  fireEvent.click(screen.getByRole("button", { name: "Set active" }));
  await screen.findByText("Active product");
  expect(reads).toBe(2);
  client.clear();
});
it.each([["paginated", false], ["all", false], ["paginated", true], ["all", true]] as const)("settles the real %s table and visual connection (nested=%s)", async (dataMode, nested) => {
  Object.defineProperty(HTMLElement.prototype, "scroll", { configurable: true, value: () => {} });
  window.history.replaceState(null, "", "/t/acme/p/shop/products");
  let reads = 0, commits = 0;
  axiosClient.defaults.adapter = async config => {
    const url = config.url || "";
    const rows = [{ _id: "alice", name: "Alice" }, { _id: "bob", name: "Bob" }];
    let data: unknown;
    if (url.includes("auth/session")) data = { authenticated: true, user: { _id: "u" } };
    else if (url.includes("runtime/schemas")) data = [{ _id: "schema", schemaName: "products", fields: [{ name: "_id", type: "string" }, { name: "name", type: "string" }] }];
    else { reads++; data = dataMode === "all" ? rows : { items: rows, totalItems: 2, totalPages: 1, currentPage: 1 }; }
    return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data };
  };
  const page: PageModel = { id: "page", name: "Products", sections: [
    { type: "component", component: { id: "table", type: "table", dataBinding: { kind: "schema", schemaName: "products" }, table: { dataMode, columns: [{ field: "name", displayName: "Name" }] }, outputs: [{ id: "selected", key: "selectedRecord", type: "record", source: { kind: "tableSelectedRecord" } }] } },
    { type: "component", component: { id: "details", type: "custom", dataBinding: { kind: "schema", parameters: { item: { source: "componentOutput", componentId: "table", outputId: "selected" } } }, props: { visualBuilder: { document: { version: 2, id: "details-doc", name: "Details", root: { id: "root", type: "section", children: [{ id: "name", type: "heading", level: 2, text: "Selected: {{item.name}}" }] } } } } } },
  ] };
  if (nested) page.sections[0] = { type: "component", component: { id: "tabs", type: "tabPanel", tabs: [{ title: "Products", components: [page.sections[0].component!] }] } };
  const client = new QueryClient();
  const sections = h(Fragment, null, ...page.sections.map((section, index) => h(PageSectionView, { key: index, section, pageFilters: [], routeParams: {} })));
  const guarded = h(Profiler, { id: "connection", onRender: () => { if (++commits > 60) throw new Error("Selected-record connection entered a render loop"); } }, sections);
  render(h(QueryClientProvider, { client }, h(MemoryRouter, { initialEntries: ["/t/acme/p/shop/products"] }, h(GeneralContextProvider, {}, h(PageRuntimeProvider, { page }, guarded)))));
  await screen.findByRole("heading", { name: "Selected: Alice" }, { timeout: 5000 });
  const beforeSelection = commits;
  fireEvent.click(screen.getByText("Bob"));
  await screen.findByRole("heading", { name: "Selected: Bob" }, { timeout: 5000 });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(commits - beforeSelection).toBeLessThan(15);
  expect(reads).toBe(1);
  expect(screen.queryByText(/No visible record/)).toBeNull();
  client.clear();
});
