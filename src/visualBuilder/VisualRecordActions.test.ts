// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, cleanup, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, expect, it } from "vitest";
import { axiosClient } from "../utils/api/axiosClient";
import VisualRecordActions from "./VisualRecordActions";
import VisualBlock from "./VisualBlock";
import { collectionQueryOptions } from "./data/collectionQuery";
import { planCollection } from "./data/collectionPlan";
import type { ComponentDocument } from "../visual-engine/model";
import type { HostActionSpec } from "../visual-engine/model";

const original = axiosClient.defaults.adapter;
afterEach(() => { cleanup(); axiosClient.defaults.adapter = original; });
const action: HostActionSpec = { name: "record", config: { schemaName: "products", action: { kind: "edit", modalType: "form", buttonName: "Save changes", formFields: [{ formKey: "name", type: "text", label: "Name" }, { formKey: "price", type: "number", label: "Price" }] }, valueBindings: { productId: ["_id"], enabled: ["enabled"] } } };
const item = { _id: "id-b", name: "Table", price: 0, enabled: false };
function mount() {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 return render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(VisualRecordActions, { children: (host) => createElement("button", { onClick: () => host.onHostAction({ nodeId: "button-b", action, item }) }, "Edit second card") }))));
}
it("prefills the existing modal from the clicked record and submits its hidden id and typed values", async () => {
 const requests: Array<{ url: string; data: unknown }> = [];
 axiosClient.defaults.adapter = async config => { requests.push({ url: config.url || "", data: JSON.parse(config.data || "{}") }); return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: {} }; };
 mount();
 fireEvent.click(screen.getByRole("button", { name: "Edit second card" }));
 const name = screen.getByPlaceholderText("Name") as HTMLInputElement;
 expect(name.value).toBe("Table"); expect((screen.getByPlaceholderText("Price") as HTMLInputElement).value).toBe("0");
 expect(requests).toHaveLength(0);
 fireEvent.change(name, { target: { value: "Edited table" } });
 fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
 await waitFor(() => expect(requests).toHaveLength(1));
 expect(requests[0].url).toContain("/dynamic/id-b?schemaName=products");
 expect(requests[0].data).toEqual({ name: "Edited table", price: 0, productId: "id-b", enabled: false });
 await waitFor(() => expect(screen.queryByPlaceholderText("Name")).toBeNull());
 expect(item).toEqual({ _id: "id-b", name: "Table", price: 0, enabled: false });
});
it("shows a request error and keeps the editable modal values for retry", async () => {
 axiosClient.defaults.adapter = async config => { throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { config, status: 403, statusText: "Forbidden", headers: new AxiosHeaders(), data: { message: "Not allowed" } }); };
 mount();
 fireEvent.click(screen.getByRole("button", { name: "Edit second card" }));
 const name = screen.getByPlaceholderText("Name") as HTMLInputElement;
 fireEvent.change(name, { target: { value: "Keep this edit" } });
 fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
 await screen.findByRole("alert");
 expect(name.value).toBe("Keep this edit");
});
it("passes explicit values to a different schema's create form without copying the source id", async () => {
 const createAction: HostActionSpec = { name: "record", config: { schemaName: "orders", action: { kind: "create", modalType: "form", buttonName: "Place order", formFields: [{ formKey: "quantity", type: "number", label: "Quantity", defaultValue: 1 }] }, valueBindings: { productId: ["_id"], unitPrice: ["price"] } } };
 const requests: Array<{ url: string; data: unknown }> = [];
 axiosClient.defaults.adapter = async config => { requests.push({ url: config.url || "", data: JSON.parse(config.data || "{}") }); return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: {} }; };
 render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(VisualRecordActions, { children: host => createElement("button", { onClick: () => host.onHostAction({ nodeId: "buy", action: createAction, item }) }, "Buy") }))));
 fireEvent.click(screen.getByRole("button", { name: "Buy" }));
 expect((screen.getByPlaceholderText("Quantity") as HTMLInputElement).value).toBe("1");
 fireEvent.click(screen.getByRole("button", { name: "Place order" }));
 await waitFor(() => expect(requests).toHaveLength(1));
 expect(requests[0].url).toContain("/dynamic?schemaName=orders");
 expect(requests[0].data).toEqual({ quantity: 1, productId: "id-b", unitPrice: 0 });
});
it("runs a workflow with the original id and a typed mapped payload once", async () => {
 const workflowAction: HostActionSpec = { name: "record", config: { schemaName: "products", action: { kind: "update", modalType: "none", submit: { workflowSchema: "products", workflowName: "reserve" }, constantValues: { _id: "cannot-retarget" } }, valueBindings: { productId: ["_id"], enabled: ["enabled"] } } };
 const requests: Array<{ url: string; data: unknown }> = [];
 axiosClient.defaults.adapter = async config => { requests.push({ url: config.url || "", data: JSON.parse(config.data || "{}") }); return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: {} }; };
 render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(VisualRecordActions, { children: host => createElement("button", { onClick: () => { const event = { nodeId: "reserve", action: workflowAction, item }; host.onHostAction(event); host.onHostAction(event); } }, "Reserve") }))));
 fireEvent.click(screen.getByRole("button", { name: "Reserve" }));
 await waitFor(() => expect(requests).toHaveLength(1));
 expect(requests[0].url).toContain("/dynamic/workflow/reserve?schemaName=products");
 expect(requests[0].data).toEqual({ record: { ...item, productId: "id-b" }, oldRecord: item });
});
it("waits for confirmation before deleting and prevents duplicate submissions", async () => {
 const deleteAction: HostActionSpec = { name: "record", config: { schemaName: "products", action: { kind: "delete", modalType: "confirm" } } };
 const requests: string[] = [];
 let finish!: () => void;
 axiosClient.defaults.adapter = config => { requests.push(config.url || ""); return new Promise(resolve => { finish = () => resolve({ config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: {} }); }); };
 render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(VisualRecordActions, { children: host => createElement("button", { onClick: () => host.onHostAction({ nodeId: "delete", action: deleteAction, item }) }, "Delete card") }))));
 fireEvent.click(screen.getByRole("button", { name: "Delete card" }));
 expect(requests).toHaveLength(0);
 fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
 fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
 await waitFor(() => expect(requests).toHaveLength(1));
 expect(requests[0]).toContain("/dynamic/id-b?schemaName=products");
 finish();
 await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull());
});
it("treats form fields named id and updates as ordinary submitted values", async () => {
 const fieldsAction: HostActionSpec = { name: "record", config: { schemaName: "logs", action: { kind: "create", modalType: "form", buttonName: "Save log", formFields: [{ formKey: "id", type: "text", label: "Id", defaultValue: "external" }, { formKey: "updates", type: "text", label: "Updates", defaultValue: "notes" }] } } };
 const requests: unknown[] = [];
 axiosClient.defaults.adapter = async config => { requests.push(JSON.parse(config.data || "{}")); return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: {} }; };
 render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(VisualRecordActions, { children: host => createElement("button", { onClick: () => host.onHostAction({ nodeId: "log", action: fieldsAction, item }) }, "Log") }))));
 fireEvent.click(screen.getByRole("button", { name: "Log" }));
 fireEvent.click(screen.getByRole("button", { name: "Save log" }));
 await waitFor(() => expect(requests).toHaveLength(1));
 expect(requests[0]).toEqual({ id: "external", updates: "notes" });
});
it("normalizes populated select arrays like table edit forms before displaying and submitting", async () => {
 const selectionAction: HostActionSpec = { name: "record", config: { schemaName: "products", action: { kind: "edit", modalType: "form", buttonName: "Save roles", formFields: [{ formKey: "permissionRoles", type: "select", label: "Roles", isMultiple: true, formKeyType: "stringArray", staticOptions: [{ value: "role-1", label: "Admin" }, { value: "role-2", label: "Editor" }] }] } } };
 const requests: unknown[] = [];
 axiosClient.defaults.adapter = async config => { requests.push(JSON.parse(config.data || "{}")); return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: {} }; };
 render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(VisualRecordActions, { children: host => createElement("button", { onClick: () => host.onHostAction({ nodeId: "roles", action: selectionAction, item: { ...item, permissionRoles: [{ _id: "role-1", name: "admin" }] } }) }, "Change roles") }))));
 fireEvent.click(screen.getByRole("button", { name: "Change roles" }));
 expect(screen.getByText("Admin")).toBeTruthy();
 fireEvent.click(screen.getByRole("button", { name: "Save roles" }));
 await waitFor(() => expect(requests).toHaveLength(1));
 expect(requests[0]).toEqual({ permissionRoles: ["role-1"] });
});
it("keeps malformed action buttons inert without removing the surrounding content", () => {
 const malformed: HostActionSpec = { name: "record", config: { schemaName: "products", action: { kind: "edit", modalType: "form", formFields: [{ formKey: "choice", type: "select", staticOptions: "oops" }] } } };
 render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(VisualRecordActions, { children: host => createElement("div", null, createElement("p", null, "The card remains visible"), createElement("button", { disabled: host.getHostActionState({ nodeId: "bad", action: malformed, item }).disabled }, "Malformed action")) }))));
 expect((screen.getByRole("button", { name: "Malformed action" }) as HTMLButtonElement).disabled).toBe(true);
 expect(screen.getByText("The card remains visible")).toBeTruthy();
});

it("refreshes the table and all matching card copies after a visual edit without a socket event", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 let record = { ...item, name: "Before visual edit" }, visualReads = 0, tableReads = 0, writes = 0;
 axiosClient.defaults.adapter = async config => {
  let data: unknown;
  if (config.method === "patch") { writes++; record = { ...record, ...JSON.parse(config.data) }; data = { data: record }; }
  else if (config.url?.includes("auth/session")) data = { authenticated: true, user: { _id: "u1" } };
  else if (config.url?.includes("table-source")) { visualReads++; data = { items: [record], totalItems: 1, totalPages: 1, currentPage: 1 }; }
  else { tableReads++; data = { items: [record] }; }
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data };
 };
 const client = new QueryClient();
 const unrelated = [
  { key: ["visual-collection", "acme", "other", "u1", "products"], schema: "products" },
  { key: ["visual-collection", "other", "shop", "u1", "products"], schema: "products" },
  { key: ["visual-collection", "acme", "shop", "u1", "categories"], schema: "categories" },
 ];
 for (const entry of unrelated) await client.fetchQuery({ queryKey: entry.key, meta: { visualCollectionSchema: entry.schema }, queryFn: async () => ({ items: [{ name: "Untouched" }] }), staleTime: Infinity });
 const document: ComponentDocument = { version: 2, id: "edit-doc", name: "Editable cards", root: { id: "root", type: "section", children: [{ id: "list", type: "repeater", itemAlias: "item", source: { kind: "autotable", schemaName: "products", limit: 5 }, children: [{ id: "slot", type: "slot", name: "item", children: [{ id: "card", type: "card", element: "article", children: [{ id: "name", type: "heading", level: 3, text: "{{item.name}}" }, { id: "edit", type: "button", label: "Edit data", action }] }] }] }] } };
 function Page() {
  const table = useQuery({ queryKey: ["dynamic", "products", "page"], queryFn: async () => (await axiosClient.get<{ items: typeof record[] }>("/dynamic/page?schemaName=products")).data });
  return createElement("div", null, createElement("p", null, `Table: ${table.data?.items[0]?.name || "Loading"}`), ...["copy-a", "copy-b"].map(id => createElement(VisualBlock, { key: id, component: { id, type: "custom", props: { visualBuilder: { document } } } })));
 }
 render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(Page))));
 await waitFor(() => expect(screen.getAllByRole("heading", { name: "Before visual edit" })).toHaveLength(2));
 expect(screen.getByText("Table: Before visual edit")).toBeTruthy();
 expect(visualReads).toBe(1); expect(tableReads).toBe(1);
 fireEvent.click(screen.getAllByRole("button", { name: "Edit data" })[0]);
 fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "After visual edit" } });
 fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
 await waitFor(() => expect(screen.queryByPlaceholderText("Name")).toBeNull());
 await waitFor(() => expect(screen.getAllByRole("heading", { name: "After visual edit" })).toHaveLength(2));
 expect(screen.getByText("Table: After visual edit")).toBeTruthy();
 expect(writes).toBe(1); expect(visualReads).toBe(2); expect(tableReads).toBe(2);
 for (const entry of unrelated) expect(client.getQueryState(entry.key)?.isInvalidated).toBe(false);
});

it("does not accept an older in-flight collection response as the refresh for a completed edit", async () => {
 window.history.replaceState(null, "", "/t/acme/p/shop/catalog");
 let record = { ...item, name: "Before edit" }, reads = 0, writes = 0;
 let releaseOld!: () => void;
 axiosClient.defaults.adapter = async config => {
  let data: unknown;
  if (config.method === "patch") { writes++; record = { ...record, ...JSON.parse(config.data) }; data = { data: record }; }
  else {
   reads++;
   const captured = { ...record };
   if (reads === 2) await new Promise<void>(resolve => { releaseOld = resolve; });
   data = { items: [captured], totalItems: 1, totalPages: 1, currentPage: 1 };
  }
  return { config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data };
 };
 const client = new QueryClient();
 const plan = planCollection({ kind: "autotable", schemaName: "products", limit: 5 });
 if (!plan.ok) throw new Error("Invalid fixture");
 const options = collectionQueryOptions({ tenant: "acme", project: "shop", identity: "u1" }, plan.descriptor);
 function Data() {
  const query = useQuery(options);
  return createElement(VisualRecordActions, { children: host => createElement("div", null, createElement("h3", null, query.data?.items[0]?.name as string || "Loading"), createElement("button", { onClick: () => host.onHostAction({ nodeId: "edit", action, item: query.data?.items[0] }) }, "Edit record")) });
 }
 render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, createElement(Data))));
 await screen.findByRole("heading", { name: "Before edit" });
 let oldRead!: Promise<void>;
 act(() => { oldRead = client.refetchQueries({ queryKey: options.queryKey }); });
 await waitFor(() => expect(releaseOld).toBeTypeOf("function"));
 fireEvent.click(screen.getByRole("button", { name: "Edit record" }));
 fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "After edit" } });
 fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
 await waitFor(() => expect(writes).toBe(1));
 await act(async () => { releaseOld(); await oldRead; });
 await waitFor(() => expect(screen.queryByPlaceholderText("Name")).toBeNull());
 expect(screen.getByRole("heading", { name: "After edit" })).toBeTruthy();
});
