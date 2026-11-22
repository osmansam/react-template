import { describe, expect, it } from "vitest";
import type {
  AlertNode,
  BarChartNode,
  ButtonNode,
  CodeNode,
  ComponentNode,
  DividerNode,
  HeadingNode,
  ListNode,
  ProgressNode,
  QuoteNode,
  StatNode,
  TableNode,
  ThemeSwitcherNode,
  TimelineNode,
} from "../model";
import {
  INLINE_TEXT_KEYS,
  inlineTargetId,
  inlineTargetPatch,
  inlineTargetValue,
  inlineTextField,
  inlineTextValue,
  isInlineTargetEditable,
  targetMatches,
} from "./inlineTextModel";

const headingNode: HeadingNode = { id: "h1", type: "heading", text: "Hello", level: 1 };
const codeNode: CodeNode = { id: "c1", type: "code", code: "const x = 1;", language: "ts", showLanguage: true, showCopy: true, wrap: false };
const buttonNode: ButtonNode = { id: "b1", type: "button", label: "Click" };
const alertNode: AlertNode = { id: "a1", type: "alert", title: "Notice", body: "Body text", variant: "info" };
const progressNoLabel: ProgressNode = { id: "p1", type: "progress", value: 50, showValue: true };
const dividerNode: DividerNode = { id: "d1", type: "divider" };
const quoteNode: QuoteNode = { id: "q1", type: "quote", quote: "Wise words", author: "Ada", role: "Engineer" };
const statNode: StatNode = { id: "s1", type: "stat", prefix: "$", value: "99", suffix: "/mo", label: "Price" };
const themeSwitcherNode: ThemeSwitcherNode = {
  id: "ts1",
  type: "theme-switcher",
  presentation: "segmented",
  labels: { light: "Light", dark: "Dark", system: "System" },
  accessibleLabel: "Theme",
};
const listNode: ListNode = { id: "l1", type: "list", items: ["One", "Two"], marker: "bullet" };
const tableNode: TableNode = {
  id: "t1",
  type: "table",
  headers: ["Name", "Role"],
  rows: [["Alice", "Admin"], ["Bob", "User"]],
  caption: "Team",
};
const timelineNode: TimelineNode = {
  id: "tl1",
  type: "timeline",
  entries: [{ title: "Launch", description: "Initial release" }],
};
const barChartNode: BarChartNode = {
  id: "bc1",
  type: "bar-chart",
  bars: [{ label: "Q1", value: 10 }, { label: "Q2", value: 20 }],
  showValues: true,
};

describe("renderer/inlineTextModel", () => {
  describe("inlineTextField & inlineTextValue", () => {
    it("maps supported node types to their direct text field and reads their value", () => {
      expect(INLINE_TEXT_KEYS.heading).toBe("text");
      expect(inlineTextField(headingNode)).toBe("text");
      expect(inlineTextValue(headingNode)).toBe("Hello");
      expect(inlineTextField(codeNode)).toBe("code");
      expect(inlineTextValue(codeNode)).toBe("const x = 1;");
      expect(inlineTextField(buttonNode)).toBe("label");
      expect(inlineTextValue(buttonNode)).toBe("Click");
      expect(inlineTextField(alertNode)).toBe("body");
      expect(inlineTextValue(alertNode)).toBe("Body text");
    });

    it("returns null for unsupported node types or missing optional text fields", () => {
      expect(inlineTextField(dividerNode)).toBeNull();
      expect(inlineTextValue(dividerNode)).toBeNull();
      expect(inlineTextField(progressNoLabel)).toBe("label");
      expect(inlineTextValue(progressNoLabel)).toBeNull();
    });
  });

  describe("isInlineTargetEditable", () => {
    it("validates simple fields and nested object fields", () => {
      expect(isInlineTargetEditable(quoteNode, { base: "quote" })).toBe(true);
      expect(isInlineTargetEditable(quoteNode, { base: "author" })).toBe(true);
      expect(isInlineTargetEditable(quoteNode, { base: "unknown" })).toBe(false);
      expect(isInlineTargetEditable(statNode, { base: "prefix" })).toBe(true);
      expect(isInlineTargetEditable(alertNode, { base: "title" })).toBe(true);
      expect(isInlineTargetEditable(themeSwitcherNode, { base: "labels", sub: "light" })).toBe(true);
      expect(isInlineTargetEditable(themeSwitcherNode, { base: "labels", sub: "custom" })).toBe(false);
      expect(isInlineTargetEditable(themeSwitcherNode, { base: "labels", sub: 0 })).toBe(false);
    });

    it("validates array items, matrix cells, and entry subfields", () => {
      expect(isInlineTargetEditable(listNode, { base: "items", index: 0 })).toBe(true);
      expect(isInlineTargetEditable(listNode, { base: "other", index: 0 })).toBe(false);
      expect(isInlineTargetEditable(tableNode, { base: "headers", index: 1 })).toBe(true);
      expect(isInlineTargetEditable(tableNode, { base: "rows", index: 0, sub: 1 })).toBe(true);
      expect(isInlineTargetEditable(tableNode, { base: "headers", index: 0, sub: 0 })).toBe(false);
      expect(isInlineTargetEditable(timelineNode, { base: "entries", index: 0, sub: "title" })).toBe(true);
      expect(isInlineTargetEditable(timelineNode, { base: "entries", index: 0, sub: "description" })).toBe(true);
      expect(isInlineTargetEditable(timelineNode, { base: "entries", index: 0, sub: "date" })).toBe(false);
      expect(isInlineTargetEditable(barChartNode, { base: "bars", index: 0, sub: "label" })).toBe(true);
      expect(isInlineTargetEditable(barChartNode, { base: "bars", index: 0, sub: "value" })).toBe(false);
    });
  });

  describe("inlineTargetId & targetMatches", () => {
    it("formats deterministic IDs and compares targets accurately", () => {
      expect(inlineTargetId("n1", { base: "caption" })).toBe("n1|caption|");
      expect(inlineTargetId("n1", { base: "rows", index: 2, sub: 3 })).toBe("n1|rows2|3");
      expect(targetMatches(null, { base: "caption" })).toBe(false);
      expect(targetMatches(undefined, { base: "caption" })).toBe(false);
      expect(targetMatches({ base: "rows", index: 1, sub: 0 }, { base: "rows", index: 1, sub: 0 })).toBe(true);
      expect(targetMatches({ base: "rows", index: 1, sub: 0 }, { base: "rows", index: 1, sub: 1 })).toBe(false);
    });
  });

  describe("inlineTargetValue", () => {
    it("reads simple, nested, array, matrix, and entry-subfield strings", () => {
      expect(inlineTargetValue(quoteNode, { base: "author" })).toBe("Ada");
      expect(inlineTargetValue(themeSwitcherNode, { base: "labels", sub: "dark" })).toBe("Dark");
      expect(inlineTargetValue(listNode, { base: "items", index: 1 })).toBe("Two");
      expect(inlineTargetValue(tableNode, { base: "rows", index: 1, sub: 0 })).toBe("Bob");
      expect(inlineTargetValue(timelineNode, { base: "entries", index: 0, sub: "description" })).toBe("Initial release");
      expect(inlineTargetValue(barChartNode, { base: "bars", index: 1, sub: "label" })).toBe("Q2");
    });

    it("returns null for out-of-bounds indices, missing fields, or non-string values", () => {
      expect(inlineTargetValue(listNode, { base: "items", index: -1 })).toBeNull();
      expect(inlineTargetValue(listNode, { base: "items", index: 5 })).toBeNull();
      expect(inlineTargetValue(listNode, { base: "items", sub: "foo" })).toBeNull();
      expect(inlineTargetValue(tableNode, { base: "rows", index: 0, sub: 9 })).toBeNull();
      expect(inlineTargetValue(barChartNode, { base: "bars", index: 0, sub: "value" })).toBeNull();
      expect(inlineTargetValue(dividerNode, { base: "text" })).toBeNull();
    });
  });

  describe("inlineTargetPatch", () => {
    it("builds shallow immutable patches for all target shapes", () => {
      expect(inlineTargetPatch(quoteNode, "Grace", { base: "author" })).toEqual({ author: "Grace" });

      const nestedPatch = inlineTargetPatch(themeSwitcherNode, "Day", { base: "labels", sub: "light" });
      expect(nestedPatch).toEqual({ labels: { light: "Day", dark: "Dark", system: "System" } });
      expect(themeSwitcherNode.labels.light).toBe("Light");

      const arrayPatch = inlineTargetPatch(listNode, "Second", { base: "items", index: 1 });
      expect(arrayPatch).toEqual({ items: ["One", "Second"] });
      expect(listNode.items[1]).toBe("Two");

      const matrixPatch = inlineTargetPatch(tableNode, "Owner", { base: "rows", index: 0, sub: 1 });
      expect(matrixPatch).toEqual({ rows: [["Alice", "Owner"], ["Bob", "User"]] });
      expect(tableNode.rows[0]![1]).toBe("Admin");

      const entryPatch = inlineTargetPatch(timelineNode, "v1.0", { base: "entries", index: 0, sub: "title" });
      expect(entryPatch).toEqual({ entries: [{ title: "v1.0", description: "Initial release" }] });
      expect(timelineNode.entries[0]!.title).toBe("Launch");

      expect(inlineTargetPatch(dividerNode as ComponentNode, "x", { base: "items", index: 0 })).toEqual({});
    });
  });
});
