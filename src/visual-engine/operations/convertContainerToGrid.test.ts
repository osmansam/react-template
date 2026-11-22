import { describe, expect, it } from "vitest";
import type { ComponentDocument, FlexNode, GridNode, StackNode } from "../model";
import { convertContainerToGrid } from "./convertContainerToGrid";

function makeStackDoc(children: StackNode["children"], containerHeight?: "auto" | "tall", rootHeight?: "tall"): ComponentDocument {
  const stack: StackNode = {
    id: "st-1",
    type: "stack",
    direction: "column",
    alignment: "center",
    distribution: "between",
    wrap: false,
    gap: "md",
    ...(containerHeight ? { style: { sizing: { height: containerHeight } } } : {}),
    children,
  };
  return {
    version: 2,
    id: "doc-1",
    name: "Convert Container Doc",
    root: {
      id: "root",
      type: "section",
      ...(rootHeight ? { style: { sizing: { height: rootHeight } } } : {}),
      children: [stack],
    },
  };
}

describe("operations/convertContainerToGrid", () => {
  it("converts a single-child Stack with explicit height to a Grid using centered placement and strips stack fields", () => {
    const doc = makeStackDoc([{ id: "t1", type: "text", text: "Hero" }], "tall");
    const result = convertContainerToGrid(doc, "st-1");
    expect(result.success).toBe(true);
    if (!result.success) return;
    const grid = result.document.root.children[0] as GridNode;
    expect(grid.type).toBe("grid");
    expect(grid.columns).toBe(12);
    expect(grid.style?.sizing?.height).toBe("tall");
    expect("direction" in grid).toBe(false);
    expect("gap" in grid).toBe(false);
    expect(grid.children[0]?.layout?.placement).toEqual({
      mobile: { column: 1, row: 3, columnSpan: 12, rowSpan: 8 },
      tablet: { column: 2, row: 4, columnSpan: 10, rowSpan: 6 },
      desktop: { column: 3, row: 4, columnSpan: 8, rowSpan: 6 },
    });
  });

  it("converts a multi-child Flex container inheriting parent height, sets height='full', and packs children", () => {
    const flex: FlexNode = {
      id: "fl-1",
      type: "flex",
      direction: "row",
      alignment: "stretch",
      distribution: "start",
      wrap: true,
      gap: "sm",
      children: [
        { id: "c1", type: "text", text: "One" },
        { id: "c2", type: "text", text: "Two" },
      ],
    };
    const doc: ComponentDocument = {
      version: 2,
      id: "doc-2",
      name: "Flex Convert",
      root: { id: "root", type: "section", style: { sizing: { height: "tall" } }, children: [flex] },
    };
    const result = convertContainerToGrid(doc, "fl-1");
    expect(result.success).toBe(true);
    if (!result.success) return;
    const grid = result.document.root.children[0] as GridNode;
    expect(grid.type).toBe("grid");
    expect(grid.style?.sizing?.height).toBe("full");
    expect(grid.children[0]?.layout?.placement?.mobile).toEqual({ column: 1, row: 1, columnSpan: 12, rowSpan: 1 });
    expect(grid.children[1]?.layout?.placement?.mobile).toEqual({ column: 1, row: 2, columnSpan: 12, rowSpan: 1 });
  });

  it("rejects non-stack/flex targets and containers without a height constraint", () => {
    const doc = makeStackDoc([{ id: "t1", type: "text", text: "A" }]);
    const notContainer = convertContainerToGrid(doc, "root");
    expect(notContainer.success).toBe(false);
    if (!notContainer.success) expect(notContainer.code).toBe("grid.container_required");

    const noHeight = convertContainerToGrid(doc, "st-1");
    expect(noHeight.success).toBe(false);
    if (!noHeight.success) expect(noHeight.code).toBe("grid.height_required");
  });
});
