import { describe, expect, it } from "vitest";
import type { ResolvedPageNavigatorItem } from "./pageNavigatorResolver";
import { collapsePageNavigatorItems } from "./pageNavigatorPresentation";

const item = (id: string, current = false): ResolvedPageNavigatorItem => ({
  id,
  label: id,
  href: current ? undefined : `/${id}`,
  current,
  external: false,
  openInNewTab: false,
});

describe("page navigator presentation", () => {
  it("collapses middle items while retaining home, parent, and current", () => {
    const result = collapsePageNavigatorItems(
      [item("home"), item("catalog"), item("category"), item("parent"), item("current", true)],
      true,
    );
    expect(result.map((entry) => entry.kind === "ellipsis" ? "ellipsis" : entry.item.id)).toEqual([
      "home", "ellipsis", "parent", "current",
    ]);
    expect(result[1]).toMatchObject({
      kind: "ellipsis",
      items: [{ id: "catalog" }, { id: "category" }],
    });
  });

  it("leaves short and desktop trails unchanged", () => {
    const short = [item("home"), item("parent"), item("current", true)];
    expect(collapsePageNavigatorItems(short, true)).toHaveLength(3);
    expect(collapsePageNavigatorItems([...short, item("extra")], false)).toHaveLength(4);
  });
});

