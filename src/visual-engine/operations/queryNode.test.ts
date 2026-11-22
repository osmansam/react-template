import { describe, expect, it } from "vitest";
import type { SectionNode, TextNode } from "../model";
import {
  collectNodeIds,
  findAncestors,
  findNode,
  findParent,
  isProtectedSlot,
  isStructuralNode,
  mapNode,
} from "./queryNode";

const tree: SectionNode = {
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
        { id: "text-1", type: "text", text: "Hello" },
        {
          id: "disc-1",
          type: "disclosure",
          defaultOpen: false,
          transition: "none",
          children: [
            { id: "slot-trigger", type: "slot", name: "trigger", children: [{ id: "trigger-text", type: "text", text: "Open" }] },
            { id: "slot-content", type: "slot", name: "content", children: [] },
          ],
        },
      ],
    },
  ],
};

describe("operations/queryNode", () => {
  it("distinguishes structural nodes from leaf nodes", () => {
    expect(isStructuralNode(tree)).toBe(true);
    expect(isStructuralNode({ id: "t1", type: "text", text: "Leaf" })).toBe(false);
  });

  it("finds nodes, parents, and ancestor chains across nested levels", () => {
    expect(findNode(tree, "root")?.id).toBe("root");
    expect(findNode(tree, "trigger-text")?.type).toBe("text");
    expect(findNode(tree, "missing")).toBeUndefined();

    expect(findParent(tree, "root")).toBeUndefined();
    expect(findParent(tree, "text-1")?.id).toBe("stack-1");
    expect(findParent(tree, "trigger-text")?.id).toBe("slot-trigger");
    expect(findParent(tree, "missing")).toBeUndefined();

    expect(findAncestors(tree, "root")).toEqual([]);
    expect(findAncestors(tree, "trigger-text").map((n) => n.id)).toEqual(["root", "stack-1", "disc-1", "slot-trigger"]);
    expect(findAncestors(tree, "missing")).toEqual([]);
  });

  it("maps a target node immutably and preserves reference identity when unchanged", () => {
    const unchanged = mapNode(tree, "missing", (node) => node);
    expect(unchanged).toBe(tree);

    const updated = mapNode(tree, "text-1", (node) => ({ ...(node as TextNode), text: "Updated" })) as SectionNode;
    expect(updated).not.toBe(tree);
    expect((findNode(updated, "text-1") as TextNode).text).toBe("Updated");
    expect((findNode(tree, "text-1") as TextNode).text).toBe("Hello");
    // Unrelated subtree keeps its reference
    expect(findNode(updated, "disc-1")).toBe(findNode(tree, "disc-1"));
  });

  it("collects all node IDs and detects protected slots", () => {
    expect([...collectNodeIds(tree)]).toEqual([
      "root",
      "stack-1",
      "text-1",
      "disc-1",
      "slot-trigger",
      "trigger-text",
      "slot-content",
    ]);
    expect(isProtectedSlot({ root: tree }, "slot-trigger")).toBe(true);
    expect(isProtectedSlot({ root: tree }, "stack-1")).toBe(false);
    expect(isProtectedSlot({ root: tree }, "missing")).toBe(false);
  });
});
