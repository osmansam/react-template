// @vitest-environment jsdom
import { createElement as h, type PropsWithChildren } from "react";
import axios, { AxiosError } from "axios";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../App";
import { useTenantProject } from "../hooks/useTenantProject";
import { LanguageSelector } from "../components/header/LanguageSelector";
import { UserContextProvider, useUserContext } from "../context/User.context";
import { axiosClient } from "./api/axiosClient";
import { useLogin, useLogout, useRegister } from "./api/auth";
import { usePageCrud } from "./api/page";
import { useExportDynamicItems } from "./dynamic";
import { shouldInvalidateDynamicQuery } from "./dynamicQueryKeys";
import { captureProjectRequest, ownsProjectRequest } from "./projectSessionStorage";
import "./i18n";

vi.mock("../hooks/useWebSocket", () => ({ useWebSocket: () => undefined }));
vi.mock("../components/DynamicPageRenderer", () => ({ DynamicPageRenderer: () => h("p", {}, "Reports route") }));
function LocalizedLabel() {
  const { t } = useTranslation();
  return h("aside", {}, h(LanguageSelector), h("span", {}, [t("Greeting"), t("Status")].join("|")));
}
vi.mock("../common/Sidebar", () => ({ Sidebar: () => h(LocalizedLabel) }));
const originalAdapter = axiosClient.defaults.adapter;
const refreshAdapter = axios.defaults.adapter;
const userKey = "project:acme:alpha:user";
const markerKey = "project:acme:alpha:loggedIn";
const initialPath = "/t/acme/p/alpha/reports";
let client: QueryClient;

function wrapper({ children }: PropsWithChildren) {
  return h(BrowserRouter, {}, h(UserContextProvider, {}, h(QueryClientProvider, { client }, children)));
}
function switchActor(id: string) {
  const oldValue = localStorage.getItem(userKey);
  const newValue = JSON.stringify({ _id: id });
  localStorage.setItem(userKey, newValue);
  window.dispatchEvent(new StorageEvent("storage", { key: userKey, oldValue, newValue }));
}
beforeEach(() => {
  history.replaceState(null, "", initialPath);
  localStorage.clear();
  localStorage.setItem(userKey, JSON.stringify({ _id: "alice" }));
  localStorage.setItem(markerKey, "true");
  client = new QueryClient();
});
afterEach(() => {
  cleanup(); axiosClient.defaults.adapter = originalAdapter; axios.defaults.adapter = refreshAdapter; vi.restoreAllMocks();
});

it.each(["before the 401", "during refresh"])("discards Alice's mutation after Bob signs in %s", async moment => {
  let writes = 0, refreshes = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  axiosClient.defaults.adapter = async config => {
    if (++writes === 1) {
      if (moment === "before the 401") await gate;
      throw new AxiosError("Expired", "ERR_BAD_REQUEST", config, undefined, { status: 401, statusText: "Unauthorized", config, headers: {}, data: {} });
    }
    return { config, data: {}, headers: {}, status: 200, statusText: "OK" };
  };
  axios.defaults.adapter = async config => {
    refreshes++;
    if (moment === "during refresh") await gate;
    return { config, data: {}, headers: {}, status: 200, statusText: "OK" };
  };
  const result = axiosClient.patch("/dynamic/1?schemaName=orders", { total: 10 }).catch(error => error);
  await waitFor(() => expect(moment === "before the 401" ? writes : refreshes).toBe(1));
  switchActor("bob");
  release();
  expect(axios.isCancel(await result)).toBe(true);
  expect(writes).toBe(1);
  expect(refreshes).toBe(moment === "before the 401" ? 0 : 1);
});

it("keeps Bob's pending read across both storage notifications for one cross-tab sign-in", async () => {
  localStorage.removeItem(markerKey);
  const alice = localStorage.getItem(userKey);
  const bob = JSON.stringify({ _id: "bob" });
  const hook = renderHook(() => ({ actor: useUserContext().user?._id, config: useTenantProject().requestConfig }), { wrapper });

  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  axiosClient.defaults.adapter = async config => {
    const actorAtDispatch = JSON.parse(localStorage.getItem(userKey)!)._id;
    await gate;
    return { config, data: { actor: actorAtDispatch }, headers: {}, status: 200, statusText: "OK" };
  };
  const aliceRead = axiosClient.get("/records", hook.result.current.config).catch(error => error);

  // Both writes are visible before the browser delivers the writer's first notification.
  localStorage.setItem(markerKey, "true");
  localStorage.setItem(userKey, bob);
  act(() => { window.dispatchEvent(new StorageEvent("storage", { key: markerKey, oldValue: null, newValue: "true" })); });
  expect(hook.result.current.actor).toBe("bob");
  const bobRead = axiosClient.get("/records", hook.result.current.config);
  act(() => { window.dispatchEvent(new StorageEvent("storage", { key: userKey, oldValue: alice, newValue: bob })); });

  release();
  expect(axios.isCancel(await aliceRead)).toBe(true);
  await expect(bobRead).resolves.toMatchObject({ data: { actor: "bob" } });
});

it.each(["actor replacement", "logout and login"])("retires the old Alice request after queued %s events", async transition => {
  const hook = renderHook(() => useTenantProject().requestConfig, { wrapper });
  const original = hook.result.current;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  axiosClient.defaults.adapter = async config => {
    await gate;
    return { config, data: {}, headers: {}, status: 200, statusText: "OK" };
  };
  const oldRead = axiosClient.get("/records", original).catch(error => error);
  const events: StorageEvent[] = [];
  function write(key: string, newValue: string | null) {
    const oldValue = localStorage.getItem(key);
    if (newValue === null) localStorage.removeItem(key);
    else localStorage.setItem(key, newValue);
    events.push(new StorageEvent("storage", { key, oldValue, newValue }));
  }
  const alice = localStorage.getItem(userKey);
  if (transition === "actor replacement") {
    write(userKey, JSON.stringify({ _id: "bob" }));
    write(userKey, alice);
  } else {
    write(markerKey, null);
    write(userKey, null);
    write(markerKey, "true");
    write(userKey, alice);
  }
  act(() => { window.dispatchEvent(events.shift()!); });
  const final = hook.result.current;
  const freshRead = axiosClient.get("/records", final).catch(error => error);
  for (const event of events) act(() => { window.dispatchEvent(event); });
  release();
  expect(axios.isCancel(await oldRead)).toBe(true);
  expect(await freshRead).toMatchObject({ status: 200 });
  expect(hook.result.current).toBe(final);
});

it.each([true, false])("keeps a fresh owner captured before queued application notifications (already observed: %s)", async observed => {
  const scope = { tenant: "acme", project: observed ? "tracked" : "untracked" };
  const pathname = `/t/acme/p/${scope.project}/reports`;
  history.replaceState(null, "", pathname);
  localStorage.setItem(`project:acme:${scope.project}:user`, JSON.stringify({ _id: "alice" }));
  const old = observed ? captureProjectRequest(scope) : undefined;
  // A second module instance models the writer tab's separate in-memory state.
  vi.resetModules();
  const writer = await import("./projectSessionStorage");
  const events: StorageEvent[] = [];
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) {
    const oldValue = this.getItem(key);
    setItem.call(this, key, value);
    if (oldValue !== value) events.push(new StorageEvent("storage", { key, oldValue, newValue: value }));
  });
  writer.setProjectSessionItem("user", JSON.stringify({ _id: "bob" }), pathname);
  writer.setProjectSessionItem("user", JSON.stringify({ _id: "alice" }), pathname);

  const hook = renderHook(() => useTenantProject().requestConfig, { wrapper });
  const fresh = hook.result.current;
  if (old) expect(ownsProjectRequest(old)).toBe(false);
  for (const event of events) {
    act(() => { window.dispatchEvent(event); });
    expect(ownsProjectRequest(fresh)).toBe(true);
  }
  expect(hook.result.current).toEqual(fresh);
});

it("does not dispatch a queued write after changing actor", async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  vi.spyOn(client, "cancelQueries").mockReturnValue(gate);
  let writes = 0;
  axiosClient.defaults.adapter = async config => { writes++; return { config, data: {}, headers: {}, status: 200, statusText: "OK" }; };
  const hook = renderHook(usePageCrud, { wrapper });
  const pending = hook.result.current.createMutation.mutateAsync({ name: "Alice draft" }).catch(e => e);
  act(() => switchActor("bob"));
  await act(async () => { release(); await pending; });
  expect(writes).toBe(0);
});

it.each(["login", "register", "logout", "export"])("drops stale %s completion after an actor change", async operation => {
  let finish!: () => void;
  axiosClient.defaults.adapter = config => new Promise(resolve => { finish = () => resolve({ config, data: { data: { user: { _id: "old" } } }, headers: {}, status: 200, statusText: "OK" }); });
  const hook = renderHook(() => ({
    login: useLogin("/old-redirect").login, register: useRegister("/old-redirect").register,
    logout: useLogout().logout, download: useExportDynamicItems().exportDynamicItems,
  }), { wrapper });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  vi.stubGlobal("URL", class extends URL { static createObjectURL() { return "blob:test"; } });
  try {
    act(() => {
      if (operation === "login") hook.result.current.login({});
      if (operation === "register") hook.result.current.register({ schemaName: "users" });
      if (operation === "logout") void hook.result.current.logout().catch(() => undefined);
      if (operation === "export") hook.result.current.download({ schemaName: "orders", fields: [], filters: {}, search: "", limit: 10, page: 1 });
    });
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    act(() => switchActor("bob"));
    await act(async () => { finish(); });
    expect(JSON.parse(localStorage.getItem(userKey)!)).toMatchObject({ _id: "bob" });
    expect(localStorage.getItem(markerKey)).toBe("true");
    expect(localStorage.getItem("project:acme:alpha:loggedOut")).toBeNull();
    expect(location.pathname).toBe(initialPath);
    expect(click).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});

function serveProject() {
  axiosClient.defaults.adapter = async config => {
    const project = config.url?.split("/")[2];
    const data = config.url?.endsWith("/auth/session") ? { authenticated: true, user: { id: "alice" } }
      : config.url?.endsWith("/page") ? [{ id: "reports", slug: "reports", name: "Reports", sections: [] }]
      : config.url?.endsWith("/settings") ? { enabledLocales: ["en"], defaultLocale: "en", sourceLocale: "en" }
      : config.url?.endsWith("/translations") ? project === "alpha" ? { Greeting: "From Alpha", Status: "Alpha status" } : { Status: "Beta status" }
      : { data: {} };
    return { config, data, headers: {}, status: 200, statusText: "OK" };
  };
}
it("restores a missing login marker for the matching actor and opens the dynamic deep link", async () => {
  localStorage.removeItem(markerKey);
  serveProject();
  render(h(BrowserRouter, {}, h(App)));
  await screen.findByText("Reports route");
  expect(localStorage.getItem(markerKey)).toBe("true");
});
it("renders Beta's fallback label when only Alpha defines a translation for the same locale", async () => {
  localStorage.setItem("project:acme:beta:user", JSON.stringify({ _id: "alice" }));
  localStorage.setItem("project:acme:beta:loggedIn", "true");
  serveProject();
  render(h(BrowserRouter, {}, h(App)));
  await screen.findByText("From Alpha|Alpha status");
  act(() => { history.pushState(null, "", "/t/acme/p/beta/reports"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await screen.findByText("Greeting|Beta status");
});

it.each(["replacement", "clear"])("reconciles an in-memory actor after external storage %s", change => {
  const hook = renderHook(useUserContext, { wrapper });
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota"); });
  act(() => hook.result.current.setUser({ _id: "fallback", role: "user", email: "" }));
  expect(hook.result.current.user?._id).toBe("fallback");
  act(() => {
    if (change === "replacement") switchActor("bob");
    else { localStorage.clear(); window.dispatchEvent(new StorageEvent("storage", { key: null })); }
  });
  expect(hook.result.current.user?._id).toBe(change === "replacement" ? "bob" : undefined);
});
it("matches the current project when the legacy invalidation caller omits the scope", () => {
  expect(shouldInvalidateDynamicQuery(["dynamic", "acme", "alpha", "orders", "all"], "orders")).toBe(true);
  expect(shouldInvalidateDynamicQuery(["dynamic", "acme", "other", "orders", "all"], "orders")).toBe(false);
});
