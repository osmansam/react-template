import { describe, expect, it } from "vitest";
import type { ComponentDocument, GridNode, TextNode } from "../model";
import { addNode } from "./addNode";

function makeDoc(): ComponentDocument {
  return {
    version: 2,
    id: "doc-1",
    name: "Add Node Doc",
    root: {
      id: "root",
      type: "section",
      children: [
        { id: "t1", type: "text", text: "First" },
        { id: "g1", type: "grid", columns: 12, children: [] },
      ],
    },
  };
}

describe("operations/addNode", () => {
  it("appends a node by default and inserts at an explicit index", () => {
    const doc = makeDoc();
    const appended = addNode(doc, "root", { id: "t2", type: "text", text: "Second" });
    expect(appended.success).toBe(true);
    if (!appended.success) return;
    expect(appended.document.root.children.map((c) => c.id)).toEqual(["t1", "g1", "t2"]);
    expect(appended.selectedNodeId).toBe("t2");
    expect(appended.createdNodeId).toBe("t2");

    const inserted = addNode(appended.document, "root", { id: "t0", type: "text", text: "Zero" }, 0);
    expect(inserted.success).toBe(true);
    if (!inserted.success) return;
    expect(inserted.document.root.children.map((c) => c.id)).toEqual(["t0", "t1", "g1", "t2"]);
  });

  it("assigns default 12-column responsive span when adding a child without layout into a Grid", () => {
    const result = addNode(makeDoc(), "g1", { id: "gt1", type: "text", text: "Grid item" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const grid = result.document.root.children[1] as GridNode;
    const child = grid.children[0] as TextNode;
    expect(child.layout).toEqual({ span: { mobile: 12, tablet: 12, desktop: 12 } });
  });

  it("rejects missing parent, non-structural parent, and out-of-bounds or non-integer index", () => {
    const doc = makeDoc();
    const missing = addNode(doc, "nope", { id: "x", type: "text", text: "X" });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.code).toBe("operation.parent_not_found");

    const nonStructural = addNode(doc, "t1", { id: "x", type: "text", text: "X" });
    expect(nonStructural.success).toBe(false);
    if (!nonStructural.success) expect(nonStructural.code).toBe("operation.parent_rejects_child");

    for (const badIndex of [-1, 3, 0.5]) {
      const res = addNode(doc, "root", { id: "x", type: "text", text: "X" }, badIndex);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe("operation.index_invalid");
    }
  });

  it("rejects duplicate node IDs against existing document or within the added subtree", () => {
    const doc = makeDoc();
    const dupExisting = addNode(doc, "root", { id: "t1", type: "text", text: "Dup" });
    expect(dupExisting.success).toBe(false);
    if (!dupExisting.success) expect(dupExisting.code).toBe("operation.id_duplicate");

    const dupInternal = addNode(doc, "root", {
      id: "card-1",
      type: "card",
      element: "article",
      children: [
        { id: "inner", type: "text", text: "A" },
        { id: "inner", type: "text", text: "B" },
      ],
    });
    expect(dupInternal.success).toBe(false);
    if (!dupInternal.success) expect(dupInternal.code).toBe("operation.id_duplicate");
  });

  it("rejects disallowed child types such as form inputs outside a Form", () => {
    const result = addNode(makeDoc(), "root", {
      id: "inp-1",
      type: "input",
      fieldName: "email",
      label: "Email",
      inputType: "email",
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("operation.parent_rejects_child");
  });
});
