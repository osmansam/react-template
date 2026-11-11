// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { AxiosHeaders } from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import { PageRuntimeProvider } from "../PageRuntimeProvider";
import { PageRequestConsumerProvider } from "./ConsumerProvider";
import { GeneralContextProvider } from "../../context/General.context";
import RelationMatrix from "../../components/RelationMatrix";
import type { ComponentBlock, PageModel, RelationMatrixConfig } from "../../types/page";
const original = axiosClient.defaults.adapter;
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; });
it.each([false, true])("keeps a matrix mutation visible in the effective column schema (connected=%s)", async connected => {
 window.history.replaceState(null, "", "/t/acme/p/shop/matrix");
 let linked = false, columnReads = 0;
 const writes: string[] = [];
 axiosClient.defaults.adapter = async config => {
  const url = config.url || "";
  let data: unknown;
  if (url.includes("auth/session")) data = { authenticated: true, user: { _id: "u" } };
  else if (config.method === "post") { writes.push(url); linked = true; data = { data: { parent: { _id: "group", name: "Group", members: [{ product: "row" }] } } }; }
  else if (url.includes("schemaName=groups")) { columnReads++; data = { items: [{ _id: "group", name: "Group", members: linked ? [{ product: "row" }] : [] }], totalItems: 1, currentPage: 1, totalPages: 1 }; }
  else data = { items: [{ _id: "row", name: "Product" }], totalItems: 1, currentPage: 1, totalPages: 1 };
  return { config, data, status: 200, statusText: "OK", headers: new AxiosHeaders() };
 };
 const config: RelationMatrixConfig = { rowSchemaName: "products", rowIdField: "_id", rowLabelField: "name", columnSchemaName: connected ? "oldGroups" : "groups", columnIdField: "_id", columnLabelField: "name", targetArrayField: "members", targetItemMatchField: "product" };
 const component: ComponentBlock = { id: "matrix", type: "relationMatrix", relationMatrix: config, ...(connected ? { requestBindings: { columns: { requestId: "groups" } } } : {}) };
 const page: PageModel = { id: "page", name: "Matrix", requests: connected ? [{ id: "groups", name: "Groups", source: { transport: "page", schemaName: "groups" }, result: { kind: "records" } }] : undefined, sections: [{ type: "component", component }] };
 const client = new QueryClient();
 render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/matrix"] }, createElement(GeneralContextProvider, {}, createElement(PageRuntimeProvider, { page }, createElement(PageRequestConsumerProvider, { component }, createElement(RelationMatrix, { config })))))));
 const toggle = await screen.findByRole("switch");
 expect(toggle.getAttribute("aria-checked")).toBe("false");
 fireEvent.click(toggle);
 await waitFor(() => expect(columnReads).toBe(2));
 await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true"));
 expect(writes).toEqual(["/acme/shop/dynamic/groups/group/array/members"]);
 client.clear();
});
