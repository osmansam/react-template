import { describe, expect, it } from "vitest";
import type { GridNode, GridPlacementByBreakpoint } from "../model";
import {
  flowGridStartStyle,
  gridChildPlacementStyle,
  inferFlowGridSpan,
  isPositioningGrid,
} from "./gridPlacementStyles";

const samplePlacement: GridPlacementByBreakpoint = {
  mobile: { column: 1, row: 1, columnSpan: 12, rowSpan: 2 },
  tablet: { column: 2, row: 3, columnSpan: 6, rowSpan: 2 },
  desktop: { column: 4, row: 2, columnSpan: 4, rowSpan: 3 },
};

describe("renderer/gridPlacementStyles", () => {
  describe("isPositioningGrid", () => {
    it("returns false for an empty grid or a flow grid", () => {
      const empty: GridNode = { id: "g1", type: "grid", columns: 12, children: [] };
      const flow: GridNode = {
        id: "g2",
        type: "grid",
        columns: 12,
        children: [{ id: "t1", type: "text", text: "A", layout: { span: { mobile: 12, tablet: 6, desktop: 4 } } }],
      };
      expect(isPositioningGrid(empty)).toBe(false);
      expect(isPositioningGrid(flow)).toBe(false);
    });

    it("returns true only when every child has an explicit placement", () => {
      const positioned: GridNode = {
        id: "g3",
        type: "grid",
        columns: 12,
        children: [
          { id: "t1", type: "text", text: "A", layout: { placement: samplePlacement } },
          { id: "t2", type: "text", text: "B", layout: { placement: samplePlacement } },
        ],
      };
      const mixed: GridNode = {
        id: "g4",
        type: "grid",
        columns: 12,
        children: [
          { id: "t1", type: "text", text: "A", layout: { placement: samplePlacement } },
          { id: "t2", type: "text", text: "B" },
        ],
      };
      expect(isPositioningGrid(positioned)).toBe(true);
      expect(isPositioningGrid(mixed)).toBe(false);
    });
  });

  describe("inferFlowGridSpan", () => {
    it("defaults to 12 when no children specify a span", () => {
      const grid: GridNode = {
        id: "g1",
        type: "grid",
        columns: 12,
        children: [{ id: "t1", type: "text", text: "A" }],
      };
      expect(inferFlowGridSpan(grid, "desktop")).toBe(12);
    });

    it("picks the most common span for the given breakpoint and clamps out-of-range values", () => {
      const grid: GridNode = {
        id: "g1",
        type: "grid",
        columns: 12,
        children: [
          { id: "t1", type: "text", text: "A", layout: { span: { mobile: 12, tablet: 6, desktop: 4 } } },
          { id: "t2", type: "text", text: "B", layout: { span: { mobile: 12, tablet: 6, desktop: 6 } } },
          { id: "t3", type: "text", text: "C", layout: { span: { mobile: 12, tablet: 4, desktop: 4 } } },
          { id: "t4", type: "text", text: "D", layout: { span: { mobile: 20, tablet: 0, desktop: 12 } } },
        ],
      };
      expect(inferFlowGridSpan(grid, "desktop")).toBe(4);
      expect(inferFlowGridSpan(grid, "tablet")).toBe(6);
      expect(inferFlowGridSpan(grid, "mobile")).toBe(12);
    });
  });

  describe("gridChildPlacementStyle", () => {
    it("returns direct gridColumn and gridRow when a breakpoint is specified", () => {
      expect(gridChildPlacementStyle(samplePlacement, "desktop")).toEqual({
        gridColumn: "4 / span 4",
        gridRow: "2 / span 3",
      });
      expect(gridChildPlacementStyle(samplePlacement, "mobile")).toEqual({
        gridColumn: "1 / span 12",
        gridRow: "1 / span 2",
      });
    });

    it("returns CSS custom properties for all breakpoints when breakpoint is omitted", () => {
      expect(gridChildPlacementStyle(samplePlacement)).toEqual({
        "--ve-grid-column-mobile": "1 / span 12",
        "--ve-grid-row-mobile": "1 / span 2",
        "--ve-grid-column-tablet": "2 / span 6",
        "--ve-grid-row-tablet": "3 / span 2",
        "--ve-grid-column-desktop": "4 / span 4",
        "--ve-grid-row-desktop": "2 / span 3",
      });
    });
  });

  describe("flowGridStartStyle", () => {
    it("resolves direct placement for a single breakpoint including null auto flow and column clamping", () => {
      const start = {
        mobile: null,
        tablet: { column: 10, row: 2 },
        desktop: { column: 3, row: 1 },
      };
      const span = { mobile: 12, tablet: 6, desktop: 4 };
      expect(flowGridStartStyle(start, span, "mobile")).toEqual({ gridColumn: "auto", gridRow: "auto" });
      // column 10 with span 6 clamps to 13 - 6 = 7
      expect(flowGridStartStyle(start, span, "tablet")).toEqual({ gridColumn: "7 / span 6", gridRow: "2" });
      expect(flowGridStartStyle(start, span, "desktop")).toEqual({ gridColumn: "3 / span 4", gridRow: "1" });
    });

    it("emits CSS custom properties for all breakpoints and defaults span to 1 when undefined", () => {
      const start = {
        mobile: { column: 1, row: 1 },
        tablet: null,
        desktop: { column: 12, row: 4 },
      };
      expect(flowGridStartStyle(start, undefined)).toEqual({
        "--ve-flow-grid-column-mobile": "1 / span 1",
        "--ve-flow-grid-row-mobile": "1",
        "--ve-flow-grid-column-tablet": "auto",
        "--ve-flow-grid-row-tablet": "auto",
        "--ve-flow-grid-column-desktop": "12 / span 1",
        "--ve-flow-grid-row-desktop": "4",
      });
    });
  });
});
