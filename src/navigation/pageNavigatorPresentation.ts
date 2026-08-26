import type { ResolvedPageNavigatorItem } from "./pageNavigatorResolver";

export type PresentedPageNavigatorItem =
  | { kind: "item"; item: ResolvedPageNavigatorItem }
  | { kind: "ellipsis"; id: "ellipsis"; items: ResolvedPageNavigatorItem[] };

export function collapsePageNavigatorItems(
  items: ResolvedPageNavigatorItem[],
  compact: boolean,
): PresentedPageNavigatorItem[] {
  if (!compact || items.length <= 4) {
    return items.map((item) => ({ kind: "item", item }));
  }
  return [
    { kind: "item", item: items[0] },
    { kind: "ellipsis", id: "ellipsis", items: items.slice(1, -2) },
    ...items.slice(-2).map((item) => ({ kind: "item" as const, item })),
  ];
}

