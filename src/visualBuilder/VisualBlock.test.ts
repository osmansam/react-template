import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider, IsRestoringProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { planCollection } from "./data/collectionPlan";
import { collectionQueryKey } from "./data/collectionQuery";
import VisualBlock from "./VisualBlock";
import { sampleDocument, visualComponent } from "./testFixtures";
import { DEFAULT_SITE_THEME } from "../visual-engine/theme";
import { configuredDesignPaletteStyle } from "../visual-engine/operations/designStyle";
import type { AutoTableCollectionSource } from "../visual-engine/model";

const SSRRouter = ({ children }: { children?: React.ReactNode }) => createElement(IsRestoringProvider, { value: true }, createElement(MemoryRouter, { initialEntries: ["/t/acme/p/shop/catalog"] }, children));

describe("project visual block rendering", () => {
  it.each(["dark", "system"] as const)("always renders light and hides authored theme switches when the saved mode is %s", mode => {
    const value = { document: { ...sampleDocument, root: { ...sampleDocument.root, designPreset: "swiss-minimal" as const, children: [...sampleDocument.root.children,
      { id: "switch", type: "theme-switcher" as const, presentation: "segmented" as const, accessibleLabel: "Appearance", labels: { light: "Light", dark: "Dark", system: "System" } },
      { id: "select-switch", type: "theme-switcher" as const, presentation: "select" as const, accessibleLabel: "Theme selection", labels: { light: "Light", dark: "Dark", system: "System" } },
    ] } }, theme: { ...structuredClone(DEFAULT_SITE_THEME), defaultMode: mode } };
    const before = structuredClone(value);
    const html = renderToStaticMarkup(createElement(VisualBlock, { component: { ...visualComponent, props: { visualBuilder: value } } }));
    expect(html).toMatch(/<div[^>]+data-default-mode="light"[^>]+data-theme="light"/);
    expect(html).toContain(`--theme-background:${configuredDesignPaletteStyle("swiss-minimal", "light")["--theme-background"]}`);
    expect(html).not.toContain('aria-label="Appearance"');
    expect(html).not.toContain('aria-label="Theme selection"');
    expect(value).toEqual(before);
  });
  it("renders a saved visual heading and native image in a scoped theme", () => {
    const component = { ...visualComponent, props: { visualBuilder: { document: { ...sampleDocument, root: { ...sampleDocument.root, children: [...sampleDocument.root.children, { id: "image", type: "image", src: "/visual-builder/placeholder.svg", alt: "Product photo" }] } } } } };
    const html = renderToStaticMarkup(createElement(VisualBlock, { component }));
    expect(html).toContain("Products"); expect(html).toContain('alt="Product photo"');
    expect(html).toContain('src="/visual-builder/placeholder.svg"');
    expect(html).toContain('fetchpriority="high"'); expect(html).not.toContain("/_next/image"); expect(html).toContain("data-theme-scope=");
  });
  it("contains invalid documents locally instead of crashing a host page", () => {
    const html = renderToStaticMarkup(createElement(VisualBlock, { component: { ...visualComponent, props: { visualBuilder: { document: {} } } } }));
    expect(html).toContain('role="alert"'); expect(html).toContain("This section is currently unavailable");
  });
  it("migrates a legacy document before rendering", () => {
    const html = renderToStaticMarkup(createElement(VisualBlock, { component: { ...visualComponent, props: { visualBuilder: { document: { ...sampleDocument, version: 1 } } } } }));
    expect(html).toContain("Products"); expect(html).not.toContain('role="alert"');
  });
});

describe("project visual block data connection", () => {
  const source: AutoTableCollectionSource = { kind: "autotable", schemaName: "products", limit: 20 };
  const bound = (id: string, path: string) => ({ id, type: "heading" as const, level: 3 as const, text: "Fallback name", bindings: { text: { source: "item" as const, path: [path] } } });
  const repeater = (id: string, repeatSource = source, children: unknown[] = [bound(`${id}-name`, "name")]) => ({ id, type: "repeater", source: repeatSource, itemAlias: "product", children: [{ id: `${id}-item`, type: "slot", name: "item", children: [{ id: `${id}-card`, type: "card", element: "article", children }] }] });
  const documentWith = (...children: unknown[]) => ({ ...sampleDocument, root: { ...sampleDocument.root, children: [{ id: "title", type: "heading", level: 2, text: "Catalog" }, ...children] } });
  const render = (document: unknown, client = new QueryClient(), id = "visual") => { client.setQueryData(["visual-session", "acme", "shop", "", false], { authenticated: false }); return renderToStaticMarkup(createElement(QueryClientProvider, { client },
    createElement(SSRRouter, {}, createElement(VisualBlock, { component: { ...visualComponent, id, props: { visualBuilder: { document } } } }))));
  };
  const scope = { tenant: "acme", project: "shop", identity: "anonymous" };
  const prefill = (client: QueryClient, items: Record<string, unknown>[], repeatSource = source) => {
    client.setQueryData(["visual-session", "acme", "shop", "", false], { authenticated: false });
    const plan = planCollection(repeatSource, { name: "string" });
    if (!plan.ok) throw new Error(plan.reason);
    client.setQueryData(collectionQueryKey(scope, plan.descriptor), { items, total: items.length, page: 1, pageSize: 20 });
  };
  const products = Array.from({ length: 5 }, (_, index) => ({ _id: `p${index}`, name: `Product ${index + 1}` }));

  it("shows this repeater's loading state without example records or a page-wide placeholder", () => {
    const html = render(documentWith(repeater("catalog", source, [{ id: "sample", type: "text", text: "SAMPLE RECORD" }])));
    expect(html).toContain('data-repeater-status="loading"'); expect(html).toContain("Catalog"); expect(html).not.toContain("SAMPLE RECORD");
  });
  it("renders one card per fetched record from one saved card, with exact field values", () => {
    const client = new QueryClient(); prefill(client, products);
    const html = render(documentWith(repeater("catalog")), client);
    expect(html.match(/data-repeater-instance=/g)).toHaveLength(5);
    for (let index = 1; index <= 5; index += 1) expect(html).toContain(`Product ${index}`);
    expect(html).not.toContain("Fallback name"); expect(html).not.toContain("data-repeater-status");
  });
  it("falls back to the authored value for missing or null fields and keeps zero and false", () => {
    const client = new QueryClient(); prefill(client, [{ _id: "a", name: null }, { _id: "b" }, { _id: "c", name: 0 }, { _id: "d", name: false }]);
    const html = render(documentWith(repeater("catalog")), client);
    expect(html.match(/Fallback name/g)).toHaveLength(2); expect(html).toContain(">0<"); expect(html).toContain(">false<");
  });
  it("never interprets record text as HTML", () => {
    const client = new QueryClient(); prefill(client, [{ _id: "a", name: "<img src=x onerror=alert(1)>" }]);
    const html = render(documentWith(repeater("catalog")), client);
    expect(html).not.toContain("<img src=x"); expect(html).toContain("&lt;img src=x");
  });
  it("shows the empty state locally and keeps static siblings", () => {
    const client = new QueryClient(); prefill(client, []);
    const html = render(documentWith(repeater("catalog")), client);
    expect(html).toContain('data-repeater-status="empty"'); expect(html).toContain("Catalog");
  });
  it("keeps other repeaters visible while one is loading, and does not share records across filters", () => {
    const client = new QueryClient(); prefill(client, products);
    const html = render(documentWith(repeater("all"), repeater("sale", { ...source, filters: [{ field: "name", operator: "eq", value: "Sale" }] })), client);
    expect(html.match(/data-repeater-instance="all--visual:/g)).toHaveLength(5);
    expect(html).toContain('data-repeater-status="loading"'); expect(html).not.toContain("data-repeater-instance=\"sale--visual:");
  });
  it("diagnoses a repeater nested in another repeater and does not fetch for it", () => {
    const client = new QueryClient(); prefill(client, products);
    const nested = repeater("outer", source, [repeater("inner", { ...source, limit: 3 })]);
    const html = render(documentWith(nested), client);
    expect(html).toContain('data-repeater-status="error"'); expect(html).toContain('data-collection-reason="Repeaters nested inside another repeater are not supported."');
    expect(client.getQueryCache().getAll().filter((query) => query.queryKey[0] === "visual-collection")).toHaveLength(1);
  });
  it("does not render another identity's cached records", () => {
    const client = new QueryClient();
    const plan = planCollection(source); if (!plan.ok) throw new Error(plan.reason);
    client.setQueryData(collectionQueryKey({ ...scope, identity: "someone-else" }, plan.descriptor), { items: products, total: 5, page: 1, pageSize: 20 });
    const html = render(documentWith(repeater("catalog")), client);
    expect(html).not.toContain("Product 1"); expect(html).toContain('data-repeater-status="loading"');
  });
  it("keeps DOM ids and internal links unique across repeated items and across placements", () => {
    const comparison = { id: "cmp", type: "image-comparison", beforeSrc: "/visual-builder/placeholder.svg", afterSrc: "/visual-builder/placeholder.svg", beforeAlt: "Before", afterAlt: "After", beforeLabel: "Before", afterLabel: "After", accessibleLabel: "Compare", position: 50, showLabels: true, aspectRatio: "wide", objectFit: "cover" };
    const anchor = { id: "jump", type: "link", label: "Jump", href: "#cmp", openInNewTab: false };
    const client = new QueryClient(); prefill(client, products);
    const document = documentWith(repeater("catalog", source, [bound("catalog-name", "name"), comparison, anchor]));
    const before = structuredClone(document);
    const block = (id: string) => createElement(VisualBlock, { component: { ...visualComponent, id, props: { visualBuilder: { document } } } });
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(SSRRouter, {}, block("first"), block("second"))));
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.filter((id) => id.startsWith("cmp--"))).toHaveLength(10);
    expect(new Set(ids).size).toBe(ids.length);
    const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs).toHaveLength(10);
    for (const target of hrefs) expect(ids).toContain(target);
    expect(document).toEqual(before);
  });
});

it("marks only opted-in page placements for cell fill and leaves the saved design unchanged", () => {
 const component = { ...visualComponent, props: { ...visualComponent.props, visualCellSizing: "fill" } };
 const before = structuredClone(component);
 const html = renderToStaticMarkup(createElement(VisualBlock, { component }));
 expect(html).toContain('data-visual-cell-sizing="fill"');
 expect(html).toContain('width:100%;height:100%;max-width:none');
 expect(renderToStaticMarkup(createElement(VisualBlock, { component: visualComponent }))).not.toContain('data-visual-cell-sizing="fill"');
 expect(component).toEqual(before);
});

it("marks only the main frame and its layout slot for placement fill, leaving nested frames authored", () => {
 const document = { ...sampleDocument, root: { ...sampleDocument.root, children: [{ id: "main-frame", type: "card" as const, element: "article" as const, children: [{ id: "nested-frame", type: "card" as const, element: "article" as const, style: { sizing: { height: "full" as const } }, children: [] }] }] } };
 const html = renderToStaticMarkup(createElement(VisualBlock, { component: { ...visualComponent, props: { visualCellSizing: "fill", visualBuilder: { document } } } }));
 expect(html.match(/data-ve-fill-container="true"/g)).toHaveLength(1);
 expect(html.match(/data-ve-fill-slot="true"/g)).toHaveLength(1);
});
