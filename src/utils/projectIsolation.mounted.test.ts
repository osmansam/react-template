// @vitest-environment jsdom
import { createElement as h } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "../utils/i18n";
import App from "../App";
import { UserContextProvider, useUserContext } from "../context/User.context";
import { useTenantProject } from "../hooks/useTenantProject";
import { axiosClient } from "./api/axiosClient";
import { useLoginConfig } from "./api/auth";
import { useGetAllPages } from "./api/page";
import { useGetDynamicItems } from "./dynamic";

const alpha = "/t/team/p/alpha/login";
const beta = "/t/team/p/beta/login";
const renders: string[] = [];
let actor = "alice";
let client: QueryClient;
const adapter = axiosClient.defaults.adapter;
vi.mock("../common/Sidebar", () => ({ Sidebar: () => null }));
vi.mock("../hooks/useWebSocket", () => ({ useWebSocket: () => undefined }));
vi.mock("../navigation/routes", () => ({ default: () => h(Probe) }));

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUserContext().user;
  const login = useLoginConfig().data?.schemaName;
  const page = useGetAllPages().data?.[0]?.name;
  const record = useGetDynamicItems<{ name: string }>("orders")?.[0]?.name;
  client = useQueryClient();
  const value = [location.pathname, user?._id, login, page, record].join("|");
  renders.push(value);
  return h("button", { onClick: () => navigate(beta) }, value);
}
beforeEach(() => {
  history.replaceState(null, "", alpha);
  localStorage.clear();
  actor = "alice";
  renders.length = 0;
  axiosClient.defaults.adapter = async config => {
    const project = config.url?.split("/")[2];
    const data = config.url?.endsWith("login-config") ? { schemaName: project }
      : config.url?.endsWith("page") ? [{ name: project }]
      : [{ name: project + "-" + actor }];
    return { data, config, headers: {}, status: 200, statusText: "OK" };
  };
});
afterEach(() => { cleanup(); axiosClient.defaults.adapter = adapter; });

it("never renders another project's actor, login config, pages or records when navigating", async () => {
  localStorage.setItem("project:team:alpha:user", JSON.stringify({ _id: "alice" }));
  render(h(BrowserRouter, {}, h(App)));
  await screen.findByText(alpha + "|alice|alpha|alpha|alpha-alice");
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(beta + "||beta|beta|beta-alice");
  expect(renders.filter(text => text.startsWith(beta)).every(text => !text.includes("alpha") && !text.includes("|alice|"))).toBe(true);
});

it("replaces the user's record cache on a cross-tab actor change", async () => {
  const key = "project:team:alpha:user";
  localStorage.setItem(key, JSON.stringify({ _id: "alice" }));
  render(h(BrowserRouter, {}, h(App)));
  await screen.findByText(alpha + "|alice|alpha|alpha|alpha-alice");
  actor = "bob";
  const newValue = JSON.stringify({ _id: "bob" });
  act(() => { localStorage.setItem(key, newValue); window.dispatchEvent(new StorageEvent("storage", { key, newValue })); });
  await screen.findByText(alpha + "|bob|alpha|alpha|alpha-bob");
  expect(renders.filter(text => text.includes("|bob|"))).not.toContain(alpha + "|bob|alpha|alpha|alpha-alice");
});

it("pins an old query function to its originating project when executed after navigation", async () => {
  render(h(BrowserRouter, {}, h(QueryClientProvider, { client: new QueryClient() }, h(Probe))));
  await screen.findByText(alpha + "||alpha|alpha|alpha-alice");
  const old = client.getQueryCache().getAll().find(query => query.queryKey[0] === "page")!;
  fireEvent.click(screen.getByRole("button"));
  await act(async () => { await old.fetch(); });
  expect(old.state.data).toEqual([{ name: "alpha" }]);
});

it.each(["{", "[]", '{"name":"missing id"}'])("starts without an actor for invalid stored identity %s", raw => {
  localStorage.setItem("project:team:alpha:user", raw);
  const wrapper = ({ children }: { children: React.ReactNode }) => h(BrowserRouter, {}, h(UserContextProvider, {}, children));
  const hook = renderHook(() => useUserContext().user, { wrapper });
  expect(hook.result.current).toBeUndefined();
});

it("parses only anchored project routes and builds safely encoded scoped paths", async () => {
  history.replaceState(null, "", "/prefix/t/team/p/x/login");
  const hook = renderHook(() => useTenantProject(), { wrapper: BrowserRouter });
  expect(hook.result.current.buildPath("/login")).toBe("/login");
  act(() => { history.replaceState(null, "", "/t/team%20two/p/blue/login"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await waitFor(() => expect(hook.result.current.tenant).toBe("team two"));
  expect(hook.result.current.buildPath("login")).toBe("/t/team%20two/p/blue/login");
});

it("rolls back a failed page creation only in the project that submitted it", async () => {
  const { usePageCrud } = await import("./api/page");
  let rejectCreate!: (err: Error) => void;
  const queryClient = new QueryClient();
  axiosClient.defaults.adapter = config => {
    if (config.method === "post") return new Promise((_, reject) => { rejectCreate = reject; });
    const name = config.url?.split("/")[2];
    return Promise.resolve({ config, data: [{ name }], headers: {}, status: 200, statusText: "OK" });
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => h(BrowserRouter, {}, h(QueryClientProvider, { client: queryClient }, children));
  const { result } = renderHook(() => ({ pages: useGetAllPages().data, create: usePageCrud().createPage, navigate: useNavigate() }), { wrapper });
  await waitFor(() => expect(result.current.pages?.[0]?.name).toBe("alpha"));
  act(() => result.current.create({ name: "draft" }));
  await waitFor(() => expect(result.current.pages?.map(p => p.name)).toEqual(["alpha", "draft"]));
  act(() => result.current.navigate(beta));
  await waitFor(() => expect(result.current.pages?.[0]?.name).toBe("beta"));
  const seen: unknown[] = [];
  const unsubscribe = queryClient.getQueryCache().subscribe(event => {
    if (event.query.queryKey.includes("beta")) seen.push(event.query.state.data);
  });
  await act(async () => { rejectCreate(new Error("rejected")); });
  unsubscribe();
  expect(seen).not.toContainEqual([{ name: "alpha" }]);
  expect(queryClient.getQueryData(["page", "team", "alpha", "all"])).toEqual([{ name: "alpha" }]);
});

it("clears stored actor and marker on a confirmed unauthenticated private session", async () => {
  const { PrivateRoutes } = await import("../navigation/PrivateRoutes");
  const { Routes, Route } = await import("react-router-dom");
  history.replaceState(null, "", "/t/team/p/alpha/dashboard");
  localStorage.setItem("project:team:alpha:user", JSON.stringify({ _id: "alice" }));
  localStorage.setItem("project:team:alpha:loggedIn", "true");
  axiosClient.defaults.adapter = async config => ({ config, data: { authenticated: false }, status: 200, statusText: "OK", headers: {} });
  render(h(BrowserRouter, {}, h(UserContextProvider, {}, h(QueryClientProvider, { client: new QueryClient() }, h(Routes, {},
    h(Route, { element: h(PrivateRoutes) }, h(Route, { path: "/t/team/p/alpha/dashboard", element: "Private" })),
    h(Route, { path: alpha, element: "Login" }))))));
  await screen.findByText("Login");
  expect(localStorage.getItem("project:team:alpha:user")).toBeNull();
  expect(localStorage.getItem("project:team:alpha:loggedIn")).toBeNull();
});


it("accepts the server session id field when restoring the actor", () => {
  localStorage.setItem("project:team:alpha:user", JSON.stringify({ id: "oauth-user", role: "reader" }));
  const wrapper = ({ children }: { children: React.ReactNode }) => h(BrowserRouter, {}, h(UserContextProvider, {}, children));
  const hook = renderHook(() => useUserContext().user, { wrapper });
  expect(hook.result.current).toMatchObject({ _id: "oauth-user", role: "reader" });
});

it("keeps the actor available in this tab when browser storage denies reads and writes", () => {
  const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage disabled"); });
  const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage disabled"); });
  try {
    const wrapper = ({ children }: { children: React.ReactNode }) => h(BrowserRouter, {}, h(UserContextProvider, {}, children));
    const hook = renderHook(useUserContext, { wrapper });
    expect(hook.result.current.user).toBeUndefined();
    act(() => hook.result.current.setUser({ _id: "guest", role: "reader", email: "" }));
    expect(hook.result.current.user?._id).toBe("guest");
    act(() => hook.result.current.setUser(undefined));
    expect(hook.result.current.user).toBeUndefined();
  } finally {
    getItem.mockRestore();
    setItem.mockRestore();
  }
});

it("retires successful cache and local state after a batched same-actor sign-out/sign-in", async () => {
  const {setProjectSessionItem,removeProjectSessionItem}=await import("./projectSessionStorage");
  setProjectSessionItem("user",JSON.stringify({_id:"alice"}),alpha);
  setProjectSessionItem("loggedIn","true",alpha);
  render(h(BrowserRouter,{},h(App)));
  await screen.findByText(alpha+"|alice|alpha|alpha|alpha-alice");
  const previous=client;actor="fresh-session";
  act(()=>{
    removeProjectSessionItem("loggedIn",alpha);removeProjectSessionItem("user",alpha);
    setProjectSessionItem("loggedIn","true",alpha);setProjectSessionItem("user",JSON.stringify({_id:"alice"}),alpha);
  });
  await screen.findByText(alpha+"|alice|alpha|alpha|alpha-fresh-session");
  expect(client).not.toBe(previous);
});
