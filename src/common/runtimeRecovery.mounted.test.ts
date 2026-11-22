// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import {
  GeneralContextProvider,
  useGeneralContext,
} from "../context/General.context";
import { PrivateRoutes } from "../navigation/PrivateRoutes";
import { axiosClient } from "../utils/api/axiosClient";
import { get } from "../utils/api";
const adapter = axiosClient.defaults.adapter;
afterEach(() => {
  cleanup();
  axiosClient.defaults.adapter = adapter;
  localStorage.clear();
  vi.restoreAllMocks();
});
function Preferences() {
  const value = useGeneralContext();
  return h("div", {}, String(value.isSidebarOpen));
}
it("recovers malformed optional preferences", () => {
  localStorage.setItem("sidebar-open", "bad JSON");
  expect(() =>
    render(h(GeneralContextProvider, {}, h(Preferences))),
  ).not.toThrow();
  expect(screen.getByText("true")).toBeTruthy();
});
it("recovers storage denial while rendering preferences", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Denied", "SecurityError");
  });
  expect(() =>
    render(h(GeneralContextProvider, {}, h(Preferences))),
  ).not.toThrow();
});
it("offers retry for temporary session failures without navigating to login", async () => {
  axiosClient.defaults.adapter = async (config) => {
    throw new AxiosError("Unavailable", undefined, config, undefined, {
      config,
      data: {},
      status: 503,
      statusText: "Unavailable",
      headers: new AxiosHeaders(),
    });
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    h(
      MemoryRouter,
      { initialEntries: ["/"] },
      h(
        QueryClientProvider,
        { client },
        h(
          Routes,
          {},
          h(
            Route,
            { element: h(PrivateRoutes) },
            h(Route, { path: "/", element: h("p", {}, "Protected") }),
          ),
          h(Route, {
            path: "/login",
            element: h("p", {}, "Login destination"),
          }),
        ),
      ),
    ),
  );
  await waitFor(() =>
    expect(screen.queryByText("Login destination")).toBeNull(),
  );
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});
it("gives ordinary reads a finite timeout and preserves explicit timeout and cancellation", async () => {
  const values: number[] = [];
  let passedSignal: AbortSignal | undefined;
  axiosClient.defaults.adapter = async (config) => {
    values.push(config.timeout!);
    passedSignal = config.signal as AbortSignal;
    return {
      config,
      data: {},
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
    };
  };
  await get({ path: "/recovery-test" });
  const controller = new AbortController();
  await get({
    path: "/recovery-test",
    config: { timeout: 711, signal: controller.signal },
  });
  expect(values).toEqual([15000, 711]);
  expect(passedSignal).toBe(controller.signal);
});
