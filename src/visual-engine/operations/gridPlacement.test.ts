import { describe, expect, it } from "vitest";
import type { ComponentDocument, GridNode, StackNode } from "../model";
import {
  canUsePositioningGrid,
  moveGridChild,
  promoteGridToPositioned,
  resizeGridChild,
  resolvePlacementMap,
  setGridChildPlacement,
} from "./gridPlacement";

function makeGridDoc(height?: "auto" | "medium"): ComponentDocument {
  const grid: GridNode = {
    id: "g1",
    type: "grid",
    columns: 12,
    ...(height ? { style: { sizing: { height } } } : {}),
    children: [
      { id: "c1", type: "text", text: "One", layout: { span: { mobile: 12, tablet: 6, desktop: 4 } } },
      { id: "c2", type: "text", text: "Two", layout: { span: { mobile: 12, tablet: 6, desktop: 4 } } },
    ],
  };
  return {
    version: 2,
    id: "doc-1",
    name: "Grid Placement Doc",
    root: { id: "root", type: "section", children: [grid] },
  };
}

describe("operations/gridPlacement", () => {
  describe("canUsePositioningGrid", () => {
    it("allows explicit non-auto height or inheriting non-auto height from parent", () => {
      const autoStack: StackNode = {
        id: "s1",
        type: "stack",
        direction: "column",
        alignment: "stretch",
        distribution: "start",
        wrap: false,
        gap: "none",
        style: { sizing: { height: "auto" } },
        children: [],
      };
      const fixedStack: StackNode = { ...autoStack, id: "s2", style: { sizing: { height: "tall" } } };
      expect(canUsePositioningGrid(autoStack)).toBe(false);
      expect(canUsePositioningGrid(fixedStack)).toBe(true);
      expect(canUsePositioningGrid(autoStack, fixedStack)).toBe(true);
      expect(canUsePositioningGrid(autoStack, autoStack)).toBe(false);
    });
  });

  describe("promoteGridToPositioned & resolvePlacementMap", () => {
    it("requires a Grid container with a non-auto height", () => {
      const notGrid = promoteGridToPositioned(makeGridDoc("medium"), "root");
      expect(notGrid.success).toBe(false);
      if (!notGrid.success) expect(notGrid.code).toBe("grid.parent_required");

      const noHeight = promoteGridToPositioned(makeGridDoc("auto"), "g1");
      expect(noHeight.success).toBe(false);
      if (!noHeight.success) expect(noHeight.code).toBe("grid.height_required");
    });

    it("packs children across mobile, tablet, and desktop breakpoints", () => {
      const promoted = promoteGridToPositioned(makeGridDoc("medium"), "g1");
      expect(promoted.success).toBe(true);
      if (!promoted.success) return;
      const grid = promoted.document.root.children[0] as GridNode;
      expect(resolvePlacementMap(grid, "mobile")).toEqual({
        c1: { column: 1, row: 1, columnSpan: 12, rowSpan: 1 },
        c2: { column: 1, row: 2, columnSpan: 12, rowSpan: 1 },
      });
      expect(resolvePlacementMap(grid, "desktop")).toEqual({
        c1: { column: 1, row: 1, columnSpan: 4, rowSpan: 1 },
        c2: { column: 5, row: 1, columnSpan: 4, rowSpan: 1 },
      });
    });

    it("returns undefined from resolvePlacementMap when any child lacks placement", () => {
      const grid = makeGridDoc("medium").root.children[0] as GridNode;
      expect(resolvePlacementMap(grid, "desktop")).toBeUndefined();
    });
  });

  describe("moveGridChild, resizeGridChild, and setGridChildPlacement", () => {
    it("moves, resizes, and patches placements while enforcing bounds and collision rules", () => {
      const promoted = promoteGridToPositioned(makeGridDoc("medium"), "g1");
      expect(promoted.success).toBe(true);
      if (!promoted.success) return;

      // Move c2 right on desktop (from col 5 to col 6)
      const moved = moveGridChild(promoted.document, "c2", "desktop", "right");
      expect(moved.success).toBe(true);
      if (!moved.success) return;
      const gridAfterMove = moved.document.root.children[0] as GridNode;
      expect(gridAfterMove.children[1]?.layout?.placement?.desktop).toEqual({
        column: 6,
        row: 1,
        columnSpan: 4,
        rowSpan: 1,
      });

      // Resize c1 from span 4 to span 5 (fits into col 1..5 since c2 is at col 6)
      const resized = resizeGridChild(moved.document, "c1", "desktop", { columnSpan: 5, rowSpan: 2 });
      expect(resized.success).toBe(true);
      if (!resized.success) return;
      const gridAfterResize = resized.document.root.children[0] as GridNode;
      expect(gridAfterResize.children[0]?.layout?.placement?.desktop).toEqual({
        column: 1,
        row: 1,
        columnSpan: 5,
        rowSpan: 2,
      });

      // Patching c2 to overlap c1 fails with grid.area_occupied
      const overlap = setGridChildPlacement(resized.document, "c2", "desktop", { column: 5, row: 1 });
      expect(overlap.success).toBe(false);
      if (!overlap.success) expect(overlap.code).toBe("grid.area_occupied");

      // Patching c2 out of bounds fails with grid.boundary
      const oob = setGridChildPlacement(resized.document, "c2", "desktop", { column: 10, columnSpan: 4 });
      expect(oob.success).toBe(false);
      if (!oob.success) expect(oob.code).toBe("grid.boundary");

      // Valid direct placement patch succeeds
      const patched = setGridChildPlacement(resized.document, "c2", "desktop", { column: 7, row: 3 });
      expect(patched.success).toBe(true);
      if (patched.success) {
        const g = patched.document.root.children[0] as GridNode;
        expect(g.children[1]?.layout?.placement?.desktop).toEqual({ column: 7, row: 3, columnSpan: 4, rowSpan: 1 });
      }
    });

    it("rejects operations on non-grid children or flow grids", () => {
      const flowDoc = makeGridDoc("medium");
      const notGridChild = moveGridChild(flowDoc, "g1", "desktop", "right");
      expect(notGridChild.success).toBe(false);
      if (!notGridChild.success) expect(notGridChild.code).toBe("grid.parent_required");

      const notPositioned = moveGridChild(flowDoc, "c1", "desktop", "right");
      expect(notPositioned.success).toBe(false);
      if (!notPositioned.success) expect(notPositioned.code).toBe("grid.positioning_required");
    });
  });
});
