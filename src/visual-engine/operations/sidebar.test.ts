import { describe, expect, it } from "vitest";
import type { ComponentDocument, DisclosureNode, SidebarNode } from "../model";
import { sidebarPanelLabel } from "../model/sidebar";
import { changeSidebarItem } from "./sidebar";

function makeIdFactory(prefix = "id"): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}

function makePanel(id: string, label: string, defaultOpen = false): DisclosureNode {
  return {
    id,
    type: "disclosure",
    defaultOpen,
    transition: "none",
    children: [
      { id: `${id}-trigger`, type: "slot", name: "trigger", children: [{ id: `${id}-label`, type: "text", text: label }] },
      { id: `${id}-content`, type: "slot", name: "content", children: [{ id: `${id}-body`, type: "text", text: `${label} body` }] },
    ],
  };
}

function makeSidebarDoc(panels: DisclosureNode[] = [makePanel("p1", "Overview", true), makePanel("p2", "Settings", false)]): ComponentDocument {
  const sidebar: SidebarNode = {
    id: "sb-1",
    type: "sidebar",
    accessibleLabel: "Docs navigation",
    navigationWidth: 240,
    children: panels,
  };
  return {
    version: 2,
    id: "doc-1",
    name: "Sidebar Test",
    root: { id: "root", type: "section", children: [sidebar] },
  };
}

function getPanels(doc: ComponentDocument): DisclosureNode[] {
  return (doc.root.children[0] as SidebarNode).children as DisclosureNode[];
}

describe("operations/sidebar", () => {
  it("adds a new panel with sequential default label", () => {
    const doc = makeSidebarDoc();
    const result = changeSidebarItem(doc, "sb-1", { type: "add" }, makeIdFactory("new"));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const panels = getPanels(result.document);
    expect(panels).toHaveLength(3);
    expect(sidebarPanelLabel(panels[2]!)).toBe("Item 3");
    expect(result.selectedNodeId).toBe("sb-1");
  });

  it("renames an existing panel label and inserts a text node if trigger has no text label", () => {
    const doc = makeSidebarDoc();
    const renamed = changeSidebarItem(doc, "sb-1", { type: "rename", itemId: "p2", label: "Preferences" });
    expect(renamed.success).toBe(true);
    if (renamed.success) {
      expect(sidebarPanelLabel(getPanels(renamed.document)[1]!)).toBe("Preferences");
    }

    const blank = changeSidebarItem(doc, "sb-1", { type: "rename", itemId: "p1", label: "   " });
    expect(blank.success).toBe(false);
    if (!blank.success) expect(blank.code).toBe("operation.sidebar_label_required");

    const iconOnlyPanel: DisclosureNode = {
      id: "p-icon",
      type: "disclosure",
      defaultOpen: true,
      transition: "none",
      children: [
        { id: "p-icon-trigger", type: "slot", name: "trigger", children: [{ id: "ic-1", type: "icon", iconId: "sparkles", size: 20, decorative: false, accessibleLabel: "Magic" }] },
        { id: "p-icon-content", type: "slot", name: "content", children: [] },
      ],
    };
    const addedLabel = changeSidebarItem(makeSidebarDoc([iconOnlyPanel]), "sb-1", { type: "rename", itemId: "p-icon", label: "Magic Label" }, makeIdFactory("lbl"));
    expect(addedLabel.success).toBe(true);
    if (addedLabel.success) {
      expect(sidebarPanelLabel(getPanels(addedLabel.document)[0]!)).toBe("Magic Label");
    }
  });

  it("sets the default open panel exclusively", () => {
    const result = changeSidebarItem(makeSidebarDoc(), "sb-1", { type: "default", itemId: "p2" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const panels = getPanels(result.document);
    expect(panels[0]!.defaultOpen).toBe(false);
    expect(panels[1]!.defaultOpen).toBe(true);
  });

  it("duplicates a panel right after the source with regenerated IDs, defaultOpen=false, and 'copy' suffix", () => {
    const result = changeSidebarItem(makeSidebarDoc(), "sb-1", { type: "duplicate", itemId: "p1" }, makeIdFactory("dup"));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const panels = getPanels(result.document);
    expect(panels).toHaveLength(3);
    expect(panels[1]!.id).not.toBe("p1");
    expect(panels[1]!.defaultOpen).toBe(false);
    expect(sidebarPanelLabel(panels[1]!)).toBe("Overview copy");
  });

  it("removes a panel, promotes the first remaining panel if defaultOpen was removed, and enforces minimum 1 item", () => {
    const removed = changeSidebarItem(makeSidebarDoc(), "sb-1", { type: "remove", itemId: "p1" });
    expect(removed.success).toBe(true);
    if (!removed.success) return;
    const panels = getPanels(removed.document);
    expect(panels).toHaveLength(1);
    expect(panels[0]!.id).toBe("p2");
    expect(panels[0]!.defaultOpen).toBe(true);

    const tooFew = changeSidebarItem(removed.document, "sb-1", { type: "remove", itemId: "p2" });
    expect(tooFew.success).toBe(false);
    if (!tooFew.success) expect(tooFew.code).toBe("operation.sidebar_minimum");
  });

  it("moves panels up and down and rejects out-of-bounds moves", () => {
    const down = changeSidebarItem(makeSidebarDoc(), "sb-1", { type: "move", itemId: "p1", direction: "down" });
    expect(down.success).toBe(true);
    if (down.success) {
      expect(getPanels(down.document).map((p) => p.id)).toEqual(["p2", "p1"]);
    }

    const upBlocked = changeSidebarItem(makeSidebarDoc(), "sb-1", { type: "move", itemId: "p1", direction: "up" });
    expect(upBlocked.success).toBe(false);
    if (!upBlocked.success) expect(upBlocked.code).toBe("operation.sidebar_move_invalid");

    const downBlocked = changeSidebarItem(makeSidebarDoc(), "sb-1", { type: "move", itemId: "p2", direction: "down" });
    expect(downBlocked.success).toBe(false);
    if (!downBlocked.success) expect(downBlocked.code).toBe("operation.sidebar_move_invalid");
  });

  it("rejects non-sidebar targets and missing item IDs", () => {
    const doc = makeSidebarDoc();
    const notSidebar = changeSidebarItem(doc, "root", { type: "add" });
    expect(notSidebar.success).toBe(false);
    if (!notSidebar.success) expect(notSidebar.code).toBe("operation.sidebar_required");

    const missingItem = changeSidebarItem(doc, "sb-1", { type: "remove", itemId: "missing" });
    expect(missingItem.success).toBe(false);
    if (!missingItem.success) expect(missingItem.code).toBe("operation.sidebar_item_required");
  });
});
