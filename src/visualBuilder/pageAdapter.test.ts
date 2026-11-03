import { describe, expect, it } from "vitest";
import { extractPage, extractPages, listVisualBlocks, mergeVisualBlock, pageWritePayload, readVisualBlock } from "./pageAdapter";
import { sampleDocument, samplePage, visualComponent } from "./testFixtures";

describe("visual page persistence", () => {
  it("locates a visual block inside page tabs, grid cells and component tabs", () => {
    expect(listVisualBlocks(samplePage()).map(block => block.id)).toEqual(["visual"]);
  });
  it("merges into the latest full page without discarding unrelated changes", () => {
    const latest = samplePage(); latest.name = "Updated elsewhere"; latest.sections[0].component!.props = { keep: "New value" };
    const updated = mergeVisualBlock(latest, { componentId: "visual", baseline: visualComponent, isNew: false }, { document: { ...sampleDocument, name: "Edited layout" } });
    expect(updated.name).toBe("Updated elsewhere");
    expect(updated.variables?.[0].initialValue).toBe("keep");
    expect(updated.isAuthenticated).toBe(true);
    expect(updated.authorizeRole).toEqual(["admin"]);
    expect(updated.sections[0].component?.props).toEqual({ keep: "New value" });
    expect(readVisualBlock(listVisualBlocks(updated)[0]).document.name).toBe("Edited layout");
    expect(listVisualBlocks(latest)[0].props?.visualBuilder.document.name).toBe("Inventory");
    expect(pageWritePayload(updated)).not.toHaveProperty("id");
    expect(pageWritePayload({ ...updated, _id: "legacy" })).not.toHaveProperty("_id");
  });
  it("appends a new section after existing content", () => {
    const page = samplePage(); page.sections[0].order = 9;
    const updated = mergeVisualBlock(page, { componentId: "new-visual", isNew: true }, { document: sampleDocument });
    expect(updated.sections).toHaveLength(3);
    expect(updated.sections[2]).toMatchObject({ type: "component", order: 10, component: { id: "new-visual", type: "custom" } });
    expect(page.sections).toHaveLength(2);
  });
  it("rejects changed, deleted or ambiguous targets instead of overwriting them", () => {
    const changed = samplePage(); listVisualBlocks(changed)[0].props!.visualBuilder.document.name = "Another editor";
    expect(() => mergeVisualBlock(changed, { componentId: "visual", baseline: visualComponent, isNew: false }, { document: sampleDocument })).toThrow(/changed/i);
    expect(() => mergeVisualBlock(samplePage(), { componentId: "missing", baseline: visualComponent, isNew: false }, { document: sampleDocument })).toThrow(/removed|missing/i);
    const duplicate = samplePage(); duplicate.sections.push({ component: structuredClone(visualComponent) });
    expect(() => mergeVisualBlock(duplicate, { componentId: "visual", baseline: visualComponent, isNew: false }, { document: sampleDocument })).toThrow(/duplicate|ambiguous/i);
    expect(() => mergeVisualBlock(samplePage(), { componentId: "visual", isNew: true }, { document: sampleDocument })).toThrow(/exists/i);
  });
  it("rejects group-only pages and malformed documents", () => {
    expect(() => mergeVisualBlock({ ...samplePage(), isGroupOnly: true }, { componentId: "new", isNew: true }, { document: sampleDocument })).toThrow(/group/i);
    expect(() => readVisualBlock({ ...visualComponent, props: { visualBuilder: { document: {} } } })).toThrow(/invalid/i);
  });
  it("reads actual backend arrays and nested envelopes without accepting malformed pages", () => {
    expect(extractPages([samplePage()])).toHaveLength(1);
    expect(extractPages({ data: { data: [samplePage()] } })).toHaveLength(1);
    expect(extractPage({ data: { data: samplePage() } }).id).toBe("page-1");
    expect(() => extractPages({ data: [{ nope: true }] })).toThrow(/page/i);
  });
});
