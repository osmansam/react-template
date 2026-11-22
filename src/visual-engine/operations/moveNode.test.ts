import { describe, expect, it } from "vitest";
import type { ComponentDocument, GridNode, StackNode } from "../model";
import { moveNode } from "./moveNode";

function makeDoc(): ComponentDocument {
  return {
    version: 2,
    id: "doc-1",
    name: "Move Node Doc",
    root: {
      id: "root",
      type: "section",
      children: [
        {
          id: "stack-1",
          type: "stack",
          direction: "column",
          alignment: "stretch",
          distribution: "start",
          wrap: false,
          gap: "md",
          children: [
            { id: "a", type: "text", text: "A" },
            { id: "b", type: "text", text: "B" },
            { id: "c", type: "text", text: "C" },
          ],
        },
        {
          id: "grid-flow",
          type: "grid",
          columns: 12,
          children: [
            { id: "gf-1", type: "text", text: "GF1", layout: { span: { mobile: 12, tablet: 6, desktop: 6 } } },
          ],
        },
        {
          id: "grid-pos",
          type: "grid",
          columns: 12,
          style: { sizing: { height: "medium" } },
          children: [
            {
              id: "gp-1",
              type: "text",
              text: "GP1",
              layout: {
                placement: {
                  mobile: { column: 1, row: 1, columnSpan: 12, rowSpan: 1 },
                  tablet: { column: 1, row: 1, columnSpan: 6, rowSpan: 1 },
                  desktop: { column: 1, row: 1, columnSpan: 6, rowSpan: 1 },
                },
              },
            },
          ],
        },
        {
          id: "disc-1",
          type: "disclosure",
          defaultOpen: false,
          transition: "none",
          children: [
            { id: "slot-trigger", type: "slot", name: "trigger", children: [{ id: "trig", type: "text", text: "T" }] },
            { id: "slot-content", type: "slot", name: "content", children: [] },
          ],
        },
      ],
    },
  };
}

describe("operations/moveNode", () => {
  it("reorders siblings within the same parent correctly", () => {
    const result = moveNode(makeDoc(), "a", "stack-1", 3);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const stack = result.document.root.children[0] as StackNode;
    expect(stack.children.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(result.selectedNodeId).toBe("a");
  });

  it("assigns flow span when moving into a flow grid and strips layout when moving out", () => {
    const intoFlow = moveNode(makeDoc(), "a", "grid-flow", 1);
    expect(intoFlow.success).toBe(true);
    if (!intoFlow.success) return;
    const grid = intoFlow.document.root.children[1] as GridNode;
    expect(grid.children[1]?.layout).toEqual({ span: { mobile: 12, tablet: 12, desktop: 12 } });

    const outOfFlow = moveNode(intoFlow.document, "gf-1", "stack-1", 0);
    expect(outOfFlow.success).toBe(true);
    if (!outOfFlow.success) return;
    const stack = outOfFlow.document.root.children[0] as StackNode;
    expect(stack.children[0]?.id).toBe("gf-1");
    expect(stack.children[0]?.layout).toBeUndefined();
  });

  it("finds non-overlapping placement when moving into a positioning grid", () => {
    const result = moveNode(makeDoc(), "gf-1", "grid-pos", 1);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const grid = result.document.root.children[2] as GridNode;
    const moved = grid.children[1]!;
    expect(moved.layout?.placement).toEqual({
      mobile: { column: 1, row: 2, columnSpan: 12, rowSpan: 1 },
      tablet: { column: 7, row: 1, columnSpan: 6, rowSpan: 1 },
      desktop: { column: 7, row: 1, columnSpan: 6, rowSpan: 1 },
    });
  });

  it("rejects moving root, protected slots, missing nodes/parents, cycles, and invalid indices", () => {
    const doc = makeDoc();

    const rootMove = moveNode(doc, "root", "stack-1", 0);
    expect(rootMove.success).toBe(false);
    if (!rootMove.success) expect(rootMove.code).toBe("operation.root_protected");

    const slotMove = moveNode(doc, "slot-trigger", "stack-1", 0);
    expect(slotMove.success).toBe(false);
    if (!slotMove.success) expect(slotMove.code).toBe("operation.slot_protected");

    const missingNode = moveNode(doc, "missing", "stack-1", 0);
    expect(missingNode.success).toBe(false);
    if (!missingNode.success) expect(missingNode.code).toBe("operation.node_not_found");

    const missingParent = moveNode(doc, "a", "missing", 0);
    expect(missingParent.success).toBe(false);
    if (!missingParent.success) expect(missingParent.code).toBe("operation.parent_not_found");

    const cycle = moveNode(doc, "stack-1", "stack-1", 0);
    expect(cycle.success).toBe(false);
    if (!cycle.success) expect(cycle.code).toBe("operation.cycle");

    const leafDest = moveNode(doc, "a", "b", 0);
    expect(leafDest.success).toBe(false);
    if (!leafDest.success) expect(leafDest.code).toBe("operation.parent_rejects_child");

    const badIdx = moveNode(doc, "a", "stack-1", 99);
    expect(badIdx.success).toBe(false);
    if (!badIdx.success) expect(badIdx.code).toBe("operation.index_invalid");
  });
});
