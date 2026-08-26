import type { PageModel } from "../types/page";
import { resolvePageNavigator, type ResolvedPageNavigatorItem } from "./pageNavigatorResolver";

export interface PageNavigatorViewModelArgs {
  pages: PageModel[];
  page?: PageModel;
  routeParams: Record<string, string | undefined>;
  buildPath: (path: string) => string;
}

export function buildPageNavigatorViewModel({
  pages,
  page,
  routeParams,
  buildPath,
}: PageNavigatorViewModelArgs): ResolvedPageNavigatorItem[] {
  const currentPageId = page?.id || page?._id || "";
  if (!page?.pageNavigator || !currentPageId) return [];
  return resolvePageNavigator({
    pages,
    currentPageId,
    config: page.pageNavigator,
    routeParams,
    buildPath,
  });
}

