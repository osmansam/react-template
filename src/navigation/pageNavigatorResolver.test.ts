import { describe, expect, it } from "vitest";
import type { PageModel, PageNavigatorConfig } from "../types/page";
import { resolvePageNavigator } from "./pageNavigatorResolver";

const pages: PageModel[] = [
  { id: "home", name: "Home", slug: "home", isMainPage: true, sections: [] },
  { id: "orders", name: "Orders", slug: "orders/:orderId", parentPageId: "home", sections: [] },
  { id: "detail", name: "Detail", slug: "orders/:orderId/detail", parentPageId: "orders", sections: [] },
];
const config: PageNavigatorConfig = { enabled: true, mode: "automatic", showHome: true };

describe("runtime page navigator resolver", () => {
  it("resolves canonical internal links and preserves declared parameters", () => {
    const items = resolvePageNavigator({
      pages,
      currentPageId: "detail",
      config,
      routeParams: { orderId: "42", tab: "audit" },
      buildPath: (path) => `/t/acme/p/store${path}`,
    });
    expect(items.map(({ label, href, current }) => ({ label, href, current }))).toEqual([
      { label: "Home", href: "/t/acme/p/store/home", current: false },
      { label: "Orders", href: "/t/acme/p/store/orders/42", current: false },
      { label: "Detail", href: undefined, current: true },
    ]);
  });

  it("omits destinations with missing route parameters", () => {
    const custom: PageNavigatorConfig = {
      enabled: true,
      mode: "custom",
      showHome: false,
      additionalItems: [{ id: "orders", label: "Orders", destination: { type: "page", pageId: "orders" } }],
    };
    expect(resolvePageNavigator({ pages, currentPageId: "detail", config: custom, routeParams: {}, buildPath: (path) => path }).map((item) => item.label)).toEqual(["Detail"]);
  });

  it("omits unsafe and deleted manual destinations", () => {
    const custom: PageNavigatorConfig = {
      enabled: true,
      mode: "custom",
      showHome: false,
      additionalItems: [
        { id: "bad", label: "Bad", destination: { type: "external", url: "javascript:alert(1)" } },
        { id: "gone", label: "Gone", destination: { type: "page", pageId: "gone" } },
        { id: "docs", label: "Docs", destination: { type: "external", url: "https://docs.example.com" }, openInNewTab: true },
      ],
    };
    expect(resolvePageNavigator({ pages, currentPageId: "detail", config: custom, routeParams: {}, buildPath: (path) => path })).toEqual([
      { id: "manual:docs", label: "Docs", href: "https://docs.example.com", current: false, external: true, openInNewTab: true },
      { id: "page:detail", label: "Detail", current: true, external: false, openInNewTab: false },
    ]);
  });
});

