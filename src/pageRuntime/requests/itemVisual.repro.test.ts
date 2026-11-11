// @vitest-environment jsdom
// Reproduction for the reported table + selected-record visual failure (Item page).
import { createElement } from "react";
import { render, cleanup, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AxiosHeaders } from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import { PageRuntimeProvider } from "../PageRuntimeProvider";
import { GeneralContextProvider } from "../../context/General.context";
import { PageSectionView } from "../../components/DynamicPageSections";
import type { PageModel } from "../../types/page";
import itemPage from "../../../temp_item_page.json";
const original = axiosClient.defaults.adapter;
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; });

it("renders the Item table and keeps the selected-record visual available", async () => {
  const page = structuredClone(itemPage) as unknown as PageModel;
  window.history.replaceState(null, "", "/t/acme/p/shop/item");
  const calls: string[] = [];
  axiosClient.defaults.adapter = async config => {
    const url = config.url || "";
    let data: unknown;
    if (url.includes("auth/session")) data = { authenticated: true, user: { _id: "u" } };
    else if (url.includes("runtime/schemas")) data = [{ _id: "schema", schemaName: "item", fields: [{ name: "_id", type: "string" }, { name: "name", type: "string" }, { name: "price", type: "number" }] }];
    else if (url.includes("dynamic/table-source")) data = { items: [{ _id: "p1", name: "Item One", price: 50 }], totalItems: 1, totalPages: 1, currentPage: 1 };
    else if (url.includes("dynamic/page")) data = { items: [{ _id: "p1", name: "Item One", price: 50 }], totalItems: 1, totalPages: 1, currentPage: 1 };
    else data = [];
    calls.push(url);
    return { config, data, status: 200, statusText: "OK", headers: new AxiosHeaders() };
  };
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const client = new QueryClient();
  try {
  render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/item"] }, createElement(GeneralContextProvider, {}, createElement(PageRuntimeProvider, { page }, page.sections.map((section, index) => createElement(PageSectionView, { key: index, section, pageFilters: [], routeParams: {} })))))));
    const cell = await screen.findByRole("cell", { name: "Item One" });
    fireEvent.click(cell.closest("tr")!);
    await screen.findByRole("heading", { name: "Item One" });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(document.querySelector("[data-visual-block]")?.textContent).toContain("Item One");
    expect(calls.filter(url => /dynamic(?:\/table-source|\/page)/.test(url))).toHaveLength(1);
    const errors = spy.mock.calls.map(call => call.join(" "));
    expect(errors.filter(text => /closure function|getSnapshot|Maximum update depth|Rich data|infinite/.test(text))).toEqual([]);
  } finally {
    cleanup();
    client.clear();
    spy.mockRestore();
  }
}, 12000);
