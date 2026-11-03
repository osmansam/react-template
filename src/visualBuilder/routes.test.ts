import { describe, expect, it } from "vitest";
import { isVisualBuilderRoute, panelURL, validateEditorTarget } from "./routes";
import { shouldLoadDynamicPages } from "../navigation/dynamicPagesLoading";
import { canDiscardDraft, saveResultIsClean } from "./draftLifecycle";
import { sampleDocument, samplePage } from "./testFixtures";

describe("visual editor entry and drafts", () => {
  it("reserves only the scoped editor route and bypasses runtime page bootstrap", () => {
    expect(isVisualBuilderRoute("/t/acme/p/shop/_builder")).toBe(true);
    expect(isVisualBuilderRoute("/t/acme/p/shop/_builder/")).toBe(true);
    expect(isVisualBuilderRoute("/t/acme/p/shop/_builder-other")).toBe(false);
    expect(shouldLoadDynamicPages("/t/acme/p/shop/_builder", true)).toBe(false);
    expect(shouldLoadDynamicPages("/t/acme/p/shop/inventory", true)).toBe(true);
  });
  it("reports route collisions, missing query targets and group-only pages", () => {
    expect(() => validateEditorTarget([{ ...samplePage(), slug: "_builder" }], "page-1")).toThrow(/reserved/i);
    expect(() => validateEditorTarget([samplePage()], "deleted")).toThrow(/no longer|missing/i);
    expect(() => validateEditorTarget([{ ...samplePage(), isGroupOnly: true }], "page-1")).toThrow(/group/i);
  });
  it("keeps dirty drafts on cancelled navigation and prevents switching during saves", () => {
    expect(canDiscardDraft({ dirty: true, saving: false }, () => false)).toBe(false);
    expect(canDiscardDraft({ dirty: true, saving: false }, () => true)).toBe(true);
    expect(canDiscardDraft({ dirty: false, saving: true }, () => true)).toBe(false);
    expect(canDiscardDraft({ dirty: false, saving: false }, () => false)).toBe(true);
  });
  it("keeps edits made while an earlier version was being saved dirty", () => {
    expect(saveResultIsClean(sampleDocument, structuredClone(sampleDocument))).toBe(true);
    expect(saveResultIsClean({ ...sampleDocument, name: "New draft" }, sampleDocument)).toBe(false);
    expect(saveResultIsClean({ palettes: { light: "changed" } }, { palettes: { light: "saved" } })).toBe(false);
  });
  it("allows only HTTP panel links", () => {
    expect(panelURL("javascript:alert(1)")).toBeUndefined();
    expect(panelURL("https://panel.example.com")).toBe("https://panel.example.com/");
  });
});
