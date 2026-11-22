import { describe, expect, it } from "vitest";
import type { ComponentDocument, DisclosureNode, SlotNode, TabsNode } from "../model";
import { addTabItem, isTabs, removeTabItem } from "./tabs";

function makeIdFactory(prefix = "tab"): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}

function makeTab(id: string, label: string, defaultOpen = false): DisclosureNode {
  return {
    id,
    type: "disclosure",
    defaultOpen,
    transition: "none",
    children: [
      { id: `${id}-trigger`, type: "slot", name: "trigger", children: [{ id: `${id}-label`, type: "text", text: label }] },
      { id: `${id}-content`, type: "slot", name: "content", children: [{ id: `${id}-body`, type: "text", text: `${label} content` }] },
    ],
  };
}

function makeTabsDoc(tabs: DisclosureNode[] = [makeTab("t1", "Tab 1", true), makeTab("t2", "Tab 2", false)]): ComponentDocument {
  const tabsNode: TabsNode = { id: "tabs-1", type: "tabs", children: tabs };
  return {
    version: 2,
    id: "doc-1",
    name: "Tabs Test",
    root: { id: "root", type: "section", children: [tabsNode] },
  };
}

describe("operations/tabs", () => {
  describe("isTabs", () => {
    it("identifies tabs nodes and rejects other values", () => {
      expect(isTabs({ id: "tabs-1", type: "tabs", children: [] })).toBe(true);
      expect(isTabs({ id: "s1", type: "section", children: [] })).toBe(false);
      expect(isTabs(null)).toBe(false);
      expect(isTabs("tabs")).toBe(false);
    });
  });

  describe("addTabItem", () => {
    it("duplicates the first tab with fresh IDs, defaultOpen=false, and next numbered label", () => {
      const result = addTabItem(makeTabsDoc(), "tabs-1", makeIdFactory("gen"));
      expect(result.success).toBe(true);
      if (!result.success) return;
      const tabs = result.document.root.children[0] as TabsNode;
      expect(tabs.children).toHaveLength(3);
      const added = tabs.children[2] as DisclosureNode;
      expect(added.defaultOpen).toBe(false);
      expect(added.id).not.toBe("t1");
      const trigger = added.children[0] as SlotNode;
      expect(trigger.children[0]).toMatchObject({ type: "text", text: "Tab 3" });
      expect(result.createdNodeId).toBe(added.id);
    });

    it("fails when target is not a Tabs node or has no starter disclosure", () => {
      const notTabs = addTabItem(makeTabsDoc(), "root");
      expect(notTabs.success).toBe(false);
      if (!notTabs.success) expect(notTabs.code).toBe("operation.tabs_required");

      const emptyTabs = addTabItem(makeTabsDoc([]), "tabs-1");
      expect(emptyTabs.success).toBe(false);
      if (!emptyTabs.success) expect(emptyTabs.code).toBe("operation.tabs_item_required");
    });
  });

  describe("removeTabItem", () => {
    it("removes a tab when at least 3 tabs exist and rejects removing below 2 tabs", () => {
      const threeTabs = makeTabsDoc([
        makeTab("t1", "Tab 1", true),
        makeTab("t2", "Tab 2"),
        makeTab("t3", "Tab 3"),
      ]);
      const removed = removeTabItem(threeTabs, "t2");
      expect(removed.success).toBe(true);
      if (!removed.success) return;
      const tabs = removed.document.root.children[0] as TabsNode;
      expect(tabs.children.map((t) => t.id)).toEqual(["t1", "t3"]);

      const blocked = removeTabItem(removed.document, "t3");
      expect(blocked.success).toBe(false);
      if (!blocked.success) expect(blocked.code).toBe("operation.tabs_minimum");
    });

    it("fails when target is not a disclosure or not a direct child of Tabs", () => {
      const notTab = removeTabItem(makeTabsDoc(), "tabs-1");
      expect(notTab.success).toBe(false);
      if (!notTab.success) expect(notTab.code).toBe("operation.tab_required");

      const standaloneDisclosure: ComponentDocument = {
        version: 2,
        id: "doc-2",
        name: "Standalone",
        root: { id: "root", type: "section", children: [makeTab("d1", "Solo")] },
      };
      const wrongParent = removeTabItem(standaloneDisclosure, "d1");
      expect(wrongParent.success).toBe(false);
      if (!wrongParent.success) expect(wrongParent.code).toBe("operation.tabs_parent_required");
    });
  });
});
