import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ComponentDocument } from "../visual-engine/model";
import { VisualRenderer } from "../visual-engine/renderer";
import { instantiateDocument, instantiateNode, safeInstanceKey } from "../visual-engine/renderer/instances";
import { collectionSourceKey, recordIdentities } from "../visual-engine/renderer/repeaters";

const source = { kind: "autotable" as const, schemaName: "products", limit: 20 };
const repeater = (id: string) => ({ id, type: "repeater", source, itemAlias: "product", children: [{ id: `${id}-item`, type: "slot", name: "item", children: [{ id: `${id}-name`, type: "heading", level: 3, text: "Fallback", bindings: { text: { source: "item", path: ["name"] } } }] }] });
const doc = (...children: unknown[]) => ({ version: 2, id: "doc", name: "Doc", root: { id: "root", type: "section", children: [{ id: "static", type: "text", text: "Static sibling" }, ...children] } }) as unknown as ComponentDocument;
const html = (document: ComponentDocument, props: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(VisualRenderer, { document, mode: "preview", ...props }));

describe("repeater data states", () => {
  it("keeps responsive flow-grid starts and advances records without overlapping", () => {
    const list = { ...repeater("list"), layout: { span: { mobile: 12, tablet: 6, desktop: 4 }, start: { mobile: null, tablet: { column: 1, row: 2 }, desktop: { column: 3, row: 2 } } } };
    const grid = { id: "grid", type: "grid", columns: 12, children: [list] };
    const out = html(doc(grid), { collectionStates: { list: { status: "success", message: "Showing 3 of 50 records · first page, up to 20." } }, resolvedCollections: { [collectionSourceKey(source)]: [{ _id: "a" }, { _id: "b" }, { _id: "c" }] } });
    expect(out).toContain("ve-flow-grid-child");
    expect(out).toContain("--ve-flow-grid-column-desktop:3 / span 4;--ve-flow-grid-row-desktop:2");
    expect(out).toContain("--ve-flow-grid-column-desktop:7 / span 4;--ve-flow-grid-row-desktop:2");
    expect(out).toContain("--ve-flow-grid-column-desktop:3 / span 4;--ve-flow-grid-row-desktop:3");
    expect(out).toContain("Showing 3 of 50 records");
  });
  it("renders a polite status for loading and empty and keeps static siblings", () => {
    for (const status of ["loading", "empty"] as const) {
      const out = html(doc(repeater("list")), { collectionStates: { list: { status, message: `State ${status}` } } });
      expect(out).toContain(`role="status"`); expect(out).toContain(`data-repeater-status="${status}"`); expect(out).toContain(`State ${status}`); expect(out).toContain("Static sibling");
      expect(out).not.toContain("data-repeater-instance");
    }
  });
  it("renders an alert with a retry button that runs once per click, not per record", () => {
    const retry = vi.fn();
    const out = html(doc(repeater("list")), { collectionStates: { list: { status: "error", message: "Down", retryLabel: "Retry now", onRetry: retry, reason: "network" } }, resolvedCollections: { [collectionSourceKey(source)]: [{ _id: "1", name: "Leaked" }] } });
    expect(out).toContain('role="alert"'); expect(out).toContain("Retry now"); expect(out).toContain('data-collection-reason="network"');
    expect(out.match(/<button/g)).toHaveLength(1); expect(out).not.toContain("Leaked");
    expect(retry).not.toHaveBeenCalled();
  });
  it("hides an error alert's retry button when the host gives no retry", () => {
    expect(html(doc(repeater("list")), { collectionStates: { list: { status: "error", message: "Not set up" } } })).not.toContain("<button");
  });
  it("renders records only for the exact source key once a host reports status", () => {
    const records = [{ _id: "1", name: "One" }];
    const bySchema = html(doc(repeater("list")), { collectionStates: { list: { status: "success" } }, resolvedCollections: { products: records } });
    expect(bySchema).not.toContain("One"); expect(bySchema).not.toContain("data-repeater-instance");
    const exact = html(doc(repeater("list")), { collectionStates: { list: { status: "success" } }, resolvedCollections: { [collectionSourceKey(source)]: records } });
    expect(exact).toContain("One");
  });
  it("keeps the schema-name fallback for sample previews that report no status", () => {
    expect(html(doc(repeater("list")), { resolvedCollections: { products: [{ _id: "1", name: "Sample" }] } })).toContain("Sample");
  });
  it("renders nothing for a repeater with no records and no status", () => {
    const out = html(doc(repeater("list")));
    expect(out).toContain("Static sibling"); expect(out).not.toContain("data-repeater-instance"); expect(out).not.toContain("role=\"status\"");
  });
  it("bounds a list to its limit before rendering", () => {
    const small = { ...repeater("list"), source: { ...source, limit: 2 } };
    const records = Array.from({ length: 5 }, (_, index) => ({ _id: String(index), name: `Item ${index}` }));
    const out = html(doc(small), { collectionStates: { list: { status: "success" } }, resolvedCollections: { [collectionSourceKey(small.source)]: records } });
    expect(out.match(/data-repeater-instance/g)).toHaveLength(2);
  });
});

describe("record identities", () => {
  it("prefers _id, then id, then position", () => {
    expect(recordIdentities([{ _id: "a" }, { id: 7 }, { name: "x" }, { _id: "", id: "z" }, { _id: { nested: true } }])).toEqual(["k-a", "k-7", "i-2", "k-z", "i-4"]);
  });
  it("disambiguates duplicates without colliding with real keys", () => {
    const ids = recordIdentities([{ _id: "a" }, { _id: "a" }, { _id: "a~2" }, { _id: "a" }]);
    expect(new Set(ids).size).toBe(4); expect(ids.slice(0, 2)).toEqual(["k-a", "k-a~2"]);
  });
  it("encodes unsafe characters reversibly enough to stay distinct", () => {
    expect(safeInstanceKey("a b")).not.toBe(safeInstanceKey("a_20_b"));
    expect(safeInstanceKey("a b")).not.toBe(safeInstanceKey("a_b")); expect(safeInstanceKey("a.b")).not.toBe(safeInstanceKey("a-b"));
    expect(safeInstanceKey("507f1f77bcf86cd799439011")).toBe("507f1f77bcf86cd799439011");
  });
  it("keeps keys stable when records refresh in a different order", () => {
    const first = recordIdentities([{ _id: "a" }, { _id: "b" }]);
    const second = recordIdentities([{ _id: "b" }, { _id: "a" }]);
    expect(second).toEqual([first[1], first[0]]);
  });
  it("uses distinct DOM ids per record in rendered output", () => {
    const records = [{ _id: "a", name: "A" }, { _id: "b", name: "B" }];
    const withHeading = doc(repeater("list"));
    const out = html(withHeading, { collectionStates: { list: { status: "success" } }, resolvedCollections: { [collectionSourceKey(source)]: records } });
    expect(out).toContain('data-repeater-instance="list:k-a"'); expect(out).toContain('data-repeater-instance="list:k-b"');
  });
});

describe("instance copies", () => {
  it("never mutate the saved node and remap anchors and menu targets inside the copy only", () => {
    const original = { id: "box", type: "section", children: [
      { id: "to", type: "text", text: "target" },
      { id: "in", type: "link", label: "in", href: "#to", openInNewTab: false },
      { id: "out", type: "link", label: "out", href: "#elsewhere", openInNewTab: false },
      { id: "ext", type: "link", label: "ext", href: "https://example.com/#to", openInNewTab: false },
    ] } as unknown as Parameters<typeof instantiateNode>[0];
    const before = structuredClone(original);
    const copy = instantiateNode(original, "k") as unknown as { id: string; children: { id: string; href?: string }[] };
    expect(original).toEqual(before);
    expect(copy.id).toBe("box--k"); expect(copy.children.map((child) => child.id)).toEqual(["to--k", "in--k", "out--k", "ext--k"]);
    expect(copy.children[1].href).toBe("#to--k"); expect(copy.children[2].href).toBe("#elsewhere"); expect(copy.children[3].href).toBe("https://example.com/#to");
  });
  it("namespace a whole document per placement and leave the source intact", () => {
    const source = doc(repeater("list"));
    const before = structuredClone(source);
    const copy = instantiateDocument(source, "place 1");
    expect(copy.id).toBe("doc--place_20_1"); expect(copy.root.id).toBe("root--place_20_1"); expect(source).toEqual(before);
  });
  it("remaps slider anchor links in the isolated instance", () => {
    const node = { id: "card", type: "card", element: "article", slideLink: { href: "#target" }, children: [{ id: "target", type: "text", text: "Target" }] } as const;
    const copy = instantiateNode(node as unknown as Parameters<typeof instantiateNode>[0], "item");
    expect(copy.slideLink?.href).toBe("#target--item");
  });
});

