import { describe, expect, it } from "vitest";
import {
  resolveSlotLayout,
  validateResolvedSlotLayout,
  type MediaLayoutSpec,
  type SlotLayout,
} from "./mediaLayout";

const baseSpec: MediaLayoutSpec = {
  mode: "slots",
  preset: "mosaic",
  aspectRatio: "landscape",
  overflow: "hidden",
  breakpoints: {
    mobile: {
      columns: 2,
      rows: 2,
      slots: [
        { id: "hero", columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 1, aspectRatio: "wide" },
        { id: "sub", columnStart: 1, rowStart: 2, columnSpan: 2, rowSpan: 1 },
      ],
    },
    tablet: {
      columns: 4,
      slots: [
        { id: "hero", columnSpan: 2, rowSpan: 2 },
        { id: "sub", columnStart: 3, rowStart: 1, columnSpan: 2 },
        { id: "extra", columnStart: 3, rowStart: 2, columnSpan: 2, rowSpan: 1, aspectRatio: "square" },
        { id: "incomplete", columnStart: 1, rowStart: 1 },
      ],
    },
    desktop: {
      rows: 3,
      slots: [
        { id: "extra", rowSpan: 2 },
      ],
    },
  },
};

describe("mediaLayout", () => {
  describe("resolveSlotLayout", () => {
    it("returns a cloned mobile layout without mutating the spec", () => {
      const resolved = resolveSlotLayout(baseSpec, "mobile");
      expect(resolved).toEqual(baseSpec.breakpoints.mobile);
      resolved.slots[0]!.columnSpan = 99;
      expect(baseSpec.breakpoints.mobile.slots[0]!.columnSpan).toBe(2);
    });

    it("applies tablet overrides, adds complete new slots, and ignores incomplete new slots", () => {
      const resolved = resolveSlotLayout(baseSpec, "tablet");
      expect(resolved.columns).toBe(4);
      expect(resolved.rows).toBe(2);
      expect(resolved.slots).toEqual([
        { id: "hero", columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 2, aspectRatio: "wide" },
        { id: "sub", columnStart: 3, rowStart: 1, columnSpan: 2, rowSpan: 1 },
        { id: "extra", columnStart: 3, rowStart: 2, columnSpan: 2, rowSpan: 1, aspectRatio: "square" },
      ]);
    });

    it("cascades mobile -> tablet -> desktop overrides", () => {
      const resolved = resolveSlotLayout(baseSpec, "desktop");
      expect(resolved.columns).toBe(4);
      expect(resolved.rows).toBe(3);
      expect(resolved.slots.find((slot) => slot.id === "extra")).toEqual({
        id: "extra",
        columnStart: 3,
        rowStart: 2,
        columnSpan: 2,
        rowSpan: 2,
        aspectRatio: "square",
      });
    });

    it("falls back cleanly when tablet and desktop overrides are omitted", () => {
      const minimal: MediaLayoutSpec = {
        mode: "slots",
        aspectRatio: "square",
        overflow: "hidden",
        breakpoints: {
          mobile: {
            columns: 1,
            rows: 1,
            slots: [{ id: "only", columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 }],
          },
        },
      };
      expect(resolveSlotLayout(minimal, "tablet")).toEqual(minimal.breakpoints.mobile);
      expect(resolveSlotLayout(minimal, "desktop")).toEqual(minimal.breakpoints.mobile);
    });
  });

  describe("validateResolvedSlotLayout", () => {
    it("returns no issues for valid non-overlapping adjacent slots", () => {
      const layout: SlotLayout = {
        columns: 4,
        rows: 2,
        slots: [
          { id: "a", columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 2 },
          { id: "b", columnStart: 3, rowStart: 1, columnSpan: 2, rowSpan: 1 },
          { id: "c", columnStart: 3, rowStart: 2, columnSpan: 2, rowSpan: 1 },
        ],
      };
      expect(validateResolvedSlotLayout(layout)).toEqual([]);
    });

    it("reports invalid grid dimensions and empty slots", () => {
      expect(validateResolvedSlotLayout({ columns: 0, rows: 2, slots: [] })).toEqual([
        "slot.grid_invalid",
        "slot.empty",
      ]);
      expect(validateResolvedSlotLayout({
        columns: 2,
        rows: 1.5,
        slots: [{ id: "a", columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 }],
      })).toEqual(["slot.grid_invalid"]);
    });

    it("reports duplicate slot IDs", () => {
      const issues = validateResolvedSlotLayout({
        columns: 2,
        rows: 1,
        slots: [
          { id: "dup", columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          { id: "dup", columnStart: 2, rowStart: 1, columnSpan: 1, rowSpan: 1 },
        ],
      });
      expect(issues).toEqual(["slot.id_duplicate"]);
    });

    it("reports invalid slot geometry, out-of-bounds slots, and overlapping cells (deduplicated)", () => {
      const issues = validateResolvedSlotLayout({
        columns: 2,
        rows: 2,
        slots: [
          { id: "a", columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 2 },
          { id: "b", columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 2 },
          { id: "c", columnStart: 2, rowStart: 2, columnSpan: 2, rowSpan: 1 },
          { id: "d", columnStart: 0, rowStart: 1, columnSpan: 1, rowSpan: 1 },
        ],
      });
      expect(issues).toContain("slot.overlap");
      expect(issues).toContain("slot.out_of_bounds");
      expect(issues).toContain("slot.geometry_invalid");
      expect(issues.filter((code) => code === "slot.overlap")).toHaveLength(1);
    });
  });
});
