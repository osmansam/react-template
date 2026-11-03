import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import VisualBlock from "./VisualBlock";
import { sampleDocument, visualComponent } from "./testFixtures";

describe("project visual block rendering", () => {
  it("renders a saved visual heading and native image in a scoped theme", () => {
    const component = { ...visualComponent, props: { visualBuilder: { document: { ...sampleDocument, root: { ...sampleDocument.root, children: [...sampleDocument.root.children, { id: "image", type: "image", src: "/visual-builder/placeholder.svg", alt: "Product photo" }] } } } } };
    const html = renderToStaticMarkup(createElement(VisualBlock, { component }));
    expect(html).toContain("Products"); expect(html).toContain('alt="Product photo"');
    expect(html).toContain('src="/visual-builder/placeholder.svg"');
    expect(html).toContain('fetchpriority="high"'); expect(html).not.toContain("/_next/image"); expect(html).toContain("data-theme-scope=");
  });
  it("contains invalid documents locally instead of crashing a host page", () => {
    const html = renderToStaticMarkup(createElement(VisualBlock, { component: { ...visualComponent, props: { visualBuilder: { document: {} } } } }));
    expect(html).toContain('role="alert"'); expect(html).toContain("Invalid visual document");
  });
  it("migrates a legacy document before rendering", () => {
    const html = renderToStaticMarkup(createElement(VisualBlock, { component: { ...visualComponent, props: { visualBuilder: { document: { ...sampleDocument, version: 1 } } } } }));
    expect(html).toContain("Products"); expect(html).not.toContain('role="alert"');
  });
  it("shows unconnected repeaters without rendering example records", () => {
    const document = { ...sampleDocument, root: { ...sampleDocument.root, children: [{ id: "repeater", type: "repeater", source: { kind: "autotable", schemaName: "products", limit: 20 }, itemAlias: "product", children: [{ id: "item", type: "slot", name: "item", children: [{ id: "sample", type: "text", text: "SAMPLE RECORD" }] }] }] } };
    const html = renderToStaticMarkup(createElement(VisualBlock, { component: { ...visualComponent, props: { visualBuilder: { document } } } }));
    expect(html).toContain("Collection data is not connected"); expect(html).not.toContain("SAMPLE RECORD");
  });
});
