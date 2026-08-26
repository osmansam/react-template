import { describe, expect, it } from "vitest";
import type { PageModel, PageNavigatorConfig } from "../types/page";
import { buildPageNavigatorViewModel } from "./pageNavigatorIntegration";

const pages: PageModel[] = [{ id: "page", name: "Page", slug: "page", sections: [] }];
const buildPath = (path: string) => path;

describe("page navigator integration adapter", () => {
  it("suppresses missing and disabled configuration", () => {
    expect(buildPageNavigatorViewModel({ pages, page: pages[0], routeParams: {}, buildPath })).toEqual([]);
    const disabled: PageNavigatorConfig = { enabled: false, mode: "automatic", showHome: true };
    expect(buildPageNavigatorViewModel({ pages, page: { ...pages[0], pageNavigator: disabled }, routeParams: {}, buildPath })).toEqual([]);
  });

  it("resolves enabled configuration and suppresses unresolved pages", () => {
    const enabled: PageNavigatorConfig = { enabled: true, mode: "automatic", showHome: false };
    expect(buildPageNavigatorViewModel({ pages, page: { ...pages[0], pageNavigator: enabled }, routeParams: {}, buildPath }).map((item) => item.label)).toEqual(["Page"]);
    expect(buildPageNavigatorViewModel({ pages, page: { id: "missing", name: "Missing", sections: [], pageNavigator: enabled }, routeParams: {}, buildPath })).toEqual([]);
  });
});

