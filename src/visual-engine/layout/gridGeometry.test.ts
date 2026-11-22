import { describe, expect, it } from "vitest";
import { GRID_COLUMNS } from "../model";
import { movePlacement, packPlacements, rectanglesOverlap, resizePlacement } from "./gridGeometry";

const p = (column: number, row: number, columnSpan = 1, rowSpan = 1) => ({ column, row, columnSpan, rowSpan });

describe("gridGeometry", () => {
  it("detects overlap but not adjacency", () => {
    expect(rectanglesOverlap(p(1, 1, 2, 2), p(2, 2))).toBe(true);
    expect(rectanglesOverlap(p(1, 1, 2, 2), p(3, 1))).toBe(false);
    expect(rectanglesOverlap(p(1, 1, 2, 2), p(1, 3))).toBe(false);
  });

  it("moves into free space without mutating input", () => {
    const placements = { a: p(1, 1) };
    const result = movePlacement({ placements, selectedId: "a", direction: "right" });
    expect(result).toEqual({ ok: true, placements: { a: p(2, 1) } });
    expect(placements.a).toEqual(p(1, 1));
  });

  it("rejects moves outside the grid and missing items", () => {
    const placements = { a: p(1, 1) };
    expect(movePlacement({ placements, selectedId: "a", direction: "left" })).toMatchObject({ ok: false, code: "grid.boundary" });
    expect(movePlacement({ placements, selectedId: "a", direction: "up" })).toMatchObject({ ok: false, code: "grid.boundary" });
    expect(movePlacement({ placements, selectedId: "x", direction: "down" })).toMatchObject({ ok: false, code: "grid.item_not_found" });
  });

  it("swaps equally sized neighbours and rejects other collisions", () => {
    const swap = movePlacement({ placements: { a: p(1, 1), b: p(2, 1) }, selectedId: "a", direction: "right" });
    expect(swap).toEqual({ ok: true, placements: { a: p(2, 1), b: p(1, 1) } });
    const blocked = movePlacement({ placements: { a: p(1, 1), b: p(2, 1, 2) }, selectedId: "a", direction: "right" });
    expect(blocked).toMatchObject({ ok: false, code: "grid.area_occupied" });
  });

  it("resizes within bounds and free space only", () => {
    const placements = { a: p(1, 1), b: p(3, 1) };
    expect(resizePlacement({ placements, selectedId: "a", columnSpan: 2, rowSpan: 1 })).toMatchObject({ ok: true });
    expect(resizePlacement({ placements, selectedId: "a", columnSpan: 3, rowSpan: 1 })).toMatchObject({ ok: false, code: "grid.area_occupied" });
    expect(resizePlacement({ placements, selectedId: "a", columnSpan: GRID_COLUMNS + 1, rowSpan: 1 })).toMatchObject({ ok: false, code: "grid.boundary" });
    expect(resizePlacement({ placements, selectedId: "x", columnSpan: 1, rowSpan: 1 })).toMatchObject({ ok: false, code: "grid.item_not_found" });
  });

  it("packs items without overlap and wraps rows", () => {
    const result = packPlacements([
      { id: "a", columnSpan: GRID_COLUMNS, rowSpan: 1 },
      { id: "b", columnSpan: 1, rowSpan: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.placements.a).toEqual(p(1, 1, GRID_COLUMNS));
      expect(result.placements.b).toEqual(p(1, 2));
    }
  });

  it("fails to pack items that cannot fit", () => {
    const items = Array.from({ length: 10000 }, (_, i) => ({ id: String(i), columnSpan: GRID_COLUMNS, rowSpan: 1 }));
    expect(packPlacements(items)).toMatchObject({ ok: false, code: "grid.area_occupied" });
  });
});
