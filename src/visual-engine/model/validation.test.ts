import { describe, expect, it } from "vitest";
import { parseComponentDocument, parseStyleSpec } from "./validation";

function baseDocument(children: unknown[] = [], overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2,
    id: "doc-1",
    name: "  Landing Section  ",
    root: {
      id: "root",
      type: "section",
      children,
    },
    ...overrides,
  };
}

describe("model/validation", () => {
  describe("parseComponentDocument — document envelope", () => {
    it("parses a valid v2 document, trims its name, and preserves optional kind & source", () => {
      const result = parseComponentDocument(baseDocument(
        [{ id: "h1", type: "heading", text: "Welcome", level: 2 }],
        { kind: "section", source: { templateId: "hero-v1" } },
      ));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.name).toBe("Landing Section");
      expect(result.value.kind).toBe("section");
      expect(result.value.source).toEqual({ templateId: "hero-v1" });
    });

    it("rejects non-object documents and invalid top-level fields", () => {
      expect(parseComponentDocument(null).success).toBe(false);
      expect(parseComponentDocument([]).success).toBe(false);

      const bad = parseComponentDocument({
        version: 3,
        id: "",
        name: "   ",
        kind: "modal",
        root: { id: "t1", type: "text", text: "Not a section" },
        source: { templateId: "", extra: true },
      });
      expect(bad.success).toBe(false);
      if (bad.success) return;
      const codes = bad.issues.map((i) => i.code);
      expect(codes).toContain("version.unsupported");
      expect(codes).toContain("document.id_required");
      expect(codes).toContain("document.name_required");
      expect(codes).toContain("document.kind_invalid");
      expect(codes).toContain("root.section_required");
      expect(codes).toContain("source.key_unknown");
      expect(codes).toContain("source.template_id_required");
    });
  });

  describe("parseComponentDocument — node types & constraints", () => {
    it("validates button submit/action/href conflicts and unsafe URLs", () => {
      const result = parseComponentDocument(baseDocument([
        {
          id: "btn-1",
          type: "button",
          label: "Go",
          submit: true,
          href: "https://example.com",
          openInNewTab: true,
          action: { name: "navigate", config: { to: "/" } },
        },
        {
          id: "link-1",
          type: "link",
          label: "Bad",
          href: "javascript:alert(1)",
          openInNewTab: false,
        },
      ]));
      expect(result.success).toBe(false);
      if (result.success) return;
      const codes = result.issues.map((i) => i.code);
      expect(codes).toContain("button.action_submit_invalid");
      expect(codes).toContain("button.submit_href_invalid");
      expect(codes).toContain("button.submit_new_tab_invalid");
      expect(codes).toContain("button.submit_form_required");
      expect(codes).toContain("url.scheme_unsupported");
    });

    it("validates form field placement, duplicate field names, and select options", () => {
      const validForm = parseComponentDocument(baseDocument([
        {
          id: "form-1",
          type: "form",
          action: "https://example.com/submit",
          method: "post",
          successMessage: "Thanks!",
          children: [
            { id: "in-1", type: "input", fieldName: "email", label: "Email", inputType: "email", required: true },
            {
              id: "sel-1",
              type: "select",
              fieldName: "plan",
              label: "Plan",
              required: true,
              options: [
                { value: "free", label: "Free" },
                { value: "pro", label: "Pro" },
              ],
            },
            { id: "sub-1", type: "button", label: "Send", submit: true },
          ],
        },
      ]));
      expect(validForm.success).toBe(true);

      const badForm = parseComponentDocument(baseDocument([
        { id: "orphan-in", type: "input", fieldName: "123bad", label: "Bad", inputType: "text", required: false },
        {
          id: "form-2",
          type: "form",
          action: "/api/submit",
          method: "post",
          successMessage: "Ok",
          children: [
            { id: "f1", type: "input", fieldName: "dup", label: "A", inputType: "text", required: false },
            { id: "f2", type: "input", fieldName: "dup", label: "B", inputType: "text", required: false },
            {
              id: "sel-dup",
              type: "select",
              fieldName: "choice",
              label: "Choice",
              required: false,
              options: [
                { value: "x", label: "X1" },
                { value: "x", label: "X2" },
              ],
            },
          ],
        },
      ]));
      expect(badForm.success).toBe(false);
      if (badForm.success) return;
      const codes = badForm.issues.map((i) => i.code);
      expect(codes).toContain("field.name_invalid");
      expect(codes).toContain("field.form_required");
      expect(codes).toContain("field.name_duplicate");
      expect(codes).toContain("select.option_value_duplicate");
    });

    it("validates table row width, rating half-steps, icon accessibility, and unknown extended keys", () => {
      const result = parseComponentDocument(baseDocument([
        { id: "tbl-1", type: "table", headers: ["A", "B"], rows: [["OnlyOne"]] },
        { id: "rat-1", type: "rating", value: 3.3, max: 5, showValue: true, accessibleLabel: "Rating" },
        { id: "ic-1", type: "icon", iconId: "sparkles", size: 24, decorative: false },
        { id: "q-1", type: "quote", quote: "Hi", author: "Me", bogusKey: 123 },
      ]));
      expect(result.success).toBe(false);
      if (result.success) return;
      const codes = result.issues.map((i) => i.code);
      expect(codes).toContain("table.rows_width");
      expect(codes).toContain("rating.value_invalid");
      expect(codes).toContain("icon.accessible_label_required");
      expect(codes).toContain("node.key_unknown");
    });

    it("validates tree invariants: duplicate IDs, disclosure interactive triggers, tabs minimum, and navbar menu-toggle target", () => {
      const badTree = parseComponentDocument(baseDocument([
        { id: "dup", type: "text", text: "One" },
        { id: "dup", type: "text", text: "Two" },
        {
          id: "tabs-1",
          type: "tabs",
          children: [
            {
              id: "d1",
              type: "disclosure",
              defaultOpen: true,
              transition: "none",
              children: [
                { id: "s1", type: "slot", name: "trigger", children: [{ id: "b1", type: "button", label: "No" }] },
                { id: "s2", type: "slot", name: "content", children: [] },
              ],
            },
          ],
        },
      ]));
      expect(badTree.success).toBe(false);
      if (!badTree.success) {
        const codes = badTree.issues.map((i) => i.code);
        expect(codes).toContain("node.id_duplicate");
        expect(codes).toContain("tabs.items_required");
        expect(codes).toContain("disclosure.trigger_interactive_invalid");
      }

      const navbarBadTarget = parseComponentDocument(
        baseDocument([{ id: "mt-1", type: "menu-toggle", label: "Menu", targetId: "missing-panel" }], { kind: "navbar" }),
      );
      expect(navbarBadTarget.success).toBe(false);
      if (!navbarBadTarget.success) {
        expect(navbarBadTarget.issues.some((i) => i.code === "menu_toggle.target_invalid")).toBe(true);
      }
    });

    it("validates responsive visibility/spacing and grid layout span, placement, and start", () => {
      const valid = parseComponentDocument(baseDocument([
        {
          id: "g1",
          type: "grid",
          columns: 12,
          children: [
            {
              id: "child-1",
              type: "text",
              text: "Grid child",
              responsive: {
                visibility: { mobile: true, tablet: true, desktop: false },
                spacing: { desktop: { spacing: { padding: "lg" }, custom: { paddingTop: "24px" } } },
              },
              layout: {
                span: { mobile: 12, tablet: 6, desktop: 4 },
                start: { mobile: null, tablet: { column: 1, row: 1 }, desktop: { column: 9, row: 2 } },
              },
            },
          ],
        },
      ]));
      expect(valid.success).toBe(true);

      const invalid = parseComponentDocument(baseDocument([
        {
          id: "non-grid-layout",
          type: "text",
          text: "Wrong parent",
          layout: { span: { mobile: 12, tablet: 12, desktop: 12 } },
        },
        {
          id: "g2",
          type: "grid",
          columns: 12,
          children: [
            {
              id: "bad-child",
              type: "text",
              text: "OOB",
              layout: {
                span: { mobile: 12, tablet: 6, desktop: 6 },
                start: { mobile: null, tablet: { column: 8, row: 1 }, desktop: null },
              },
            },
          ],
        },
      ]));
      expect(invalid.success).toBe(false);
      if (invalid.success) return;
      const codes = invalid.issues.map((i) => i.code);
      expect(codes).toContain("layout.grid_parent_required");
      expect(codes).toContain("layout.start_column_invalid");
    });

    it("validates bindings including rejecting unsafe prototype path segments and missing fallbacks", () => {
      const result = parseComponentDocument(baseDocument([
        {
          id: "rep-1",
          type: "repeater",
          itemAlias: "item",
          source: { kind: "autotable", schemaName: "posts", limit: 10 },
          children: [
            {
              id: "slot-item",
              type: "slot",
              name: "item",
              children: [
                {
                  id: "t-bad-path",
                  type: "text",
                  text: "Fallback",
                  bindings: { text: { source: "item", path: ["__proto__", "polluted"] } },
                },
                {
                  id: "btn-no-fallback",
                  type: "button",
                  label: "Click",
                  bindings: { href: { source: "item", path: ["url"] } },
                },
              ],
            },
          ],
        },
      ]));
      expect(result.success).toBe(false);
      if (result.success) return;
      const codes = result.issues.map((i) => i.code);
      expect(codes).toContain("binding.path_invalid");
      expect(codes).toContain("binding.fallback_required");
    });
  });

  describe("parseStyleSpec", () => {
    it("accepts valid style tokens, custom lengths, media filters, and transforms", () => {
      const result = parseStyleSpec({
        spacing: { padding: "md", gap: "sm" },
        color: { text: "primary", background: "surface" },
        typography: { size: "lg", weight: "bold", align: "center" },
        border: { radius: "md", width: "thin", color: "border", shadow: "sm" },
        sizing: { width: "full", height: "auto" },
        custom: { paddingTop: " 16px ", maxWidth: "40rem" },
        media: { opacity: 0.8, filters: { blur: 4, brightness: 110 } },
        transform: { rotate: -45 },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.custom?.paddingTop).toBe("16px");
      expect(result.value.transform?.rotate).toBe(-45);
    });

    it("rejects unknown keys, invalid tokens, unsafe lengths, out-of-range filters, and invalid rotation", () => {
      const result = parseStyleSpec({
        unknownGroup: true,
        spacing: { padding: "giant" },
        custom: { width: "calc(100% - 10px)" },
        media: { opacity: 1.5, filters: { blur: 99 } },
        transform: { rotate: 270 },
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      const codes = result.issues.map((i) => i.code);
      expect(codes).toContain("style.key_unknown");
      expect(codes).toContain("style.token_invalid");
      expect(codes).toContain("style.custom_length_invalid");
      expect(codes).toContain("style.opacity_invalid");
      expect(codes).toContain("style.filter_range_invalid");
      expect(codes).toContain("style.rotation_invalid");
    });
  });
});
