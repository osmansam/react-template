import type {
  PageModel,
  PageNavigatorConfig,
  PageNavigatorOverride,
} from "../types/page";

export interface ResolvedPageNavigatorItem {
  id: string;
  label: string;
  href?: string;
  current: boolean;
  external: boolean;
  openInNewTab: boolean;
}

export interface ResolveRuntimePageNavigatorArgs {
  pages: PageModel[];
  currentPageId: string;
  config: PageNavigatorConfig;
  routeParams: Record<string, string | undefined>;
  buildPath: (path: string) => string;
}

const getPageID = (page: PageModel) => page.id || page._id || "";

function safeExternalURL(value: string): string | undefined {
  try {
    const trimmed = value.trim();
    const parsed = new URL(trimmed);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.host ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

function pagePath(
  page: PageModel,
  routeParams: Record<string, string | undefined>,
  buildPath: (path: string) => string,
): string | undefined {
  let slug = (page.slug || page.name.toLowerCase().replace(/\s+/g, "-")).replace(/^\/+/, "");
  const required = [...slug.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
  for (const key of required) {
    const value = routeParams[key];
    if (!value) return undefined;
    slug = slug.replace(`:${key}`, encodeURIComponent(value));
  }
  return buildPath(`/${slug}`);
}

const findOverride = (config: PageNavigatorConfig, id: string): PageNavigatorOverride | undefined =>
  config.overrides?.find((item) => item.pageId === id);

export function resolvePageNavigator({
  pages,
  currentPageId,
  config,
  routeParams,
  buildPath,
}: ResolveRuntimePageNavigatorArgs): ResolvedPageNavigatorItem[] {
  if (!config.enabled) return [];
  const byID = new Map(pages.map((page) => [getPageID(page), page]));
  const current = byID.get(currentPageId);
  if (!current) return [];
  const result: ResolvedPageNavigatorItem[] = [];
  const included = new Set<string>();

  const addPage = (page: PageModel, forcedLabel?: string) => {
    const id = getPageID(page);
    if (!id || id === currentPageId || included.has(id)) return;
    const override = findOverride(config, id);
    if (override?.hidden) return;
    const href = page.isGroupOnly ? undefined : pagePath(page, routeParams, buildPath);
    if (!href && !page.isGroupOnly) return;
    included.add(id);
    result.push({
      id: `page:${id}`,
      label: forcedLabel?.trim() || override?.label?.trim() || page.name,
      href,
      current: false,
      external: false,
      openInNewTab: false,
    });
  };

  const home = pages.find((page) => page.isMainPage);
  if (config.showHome && home) addPage(home, config.homeLabel);

  if (config.mode === "automatic") {
    const ancestors: PageModel[] = [];
    const seen = new Set<string>([currentPageId]);
    let parentID = current.parentPageId || "";
    while (parentID && !seen.has(parentID)) {
      seen.add(parentID);
      const parent = byID.get(parentID);
      if (!parent) break;
      ancestors.push(parent);
      parentID = parent.parentPageId || "";
    }
    ancestors.reverse().forEach((page) => addPage(page));
  }

  for (const item of config.additionalItems || []) {
    const label = item.label.trim();
    if (!label) continue;
    if (item.destination.type === "page") {
      const page = byID.get(item.destination.pageId);
      if (!page || included.has(item.destination.pageId) || item.destination.pageId === currentPageId) continue;
      const href = pagePath(page, routeParams, buildPath);
      if (!href) continue;
      included.add(item.destination.pageId);
      result.push({
        id: `manual:${item.id}`,
        label,
        href,
        current: false,
        external: false,
        openInNewTab: false,
      });
    } else {
      const href = safeExternalURL(item.destination.url);
      if (!href) continue;
      result.push({
        id: `manual:${item.id}`,
        label,
        href,
        current: false,
        external: true,
        openInNewTab: Boolean(item.openInNewTab),
      });
    }
  }

  const currentOverride = findOverride(config, currentPageId);
  result.push({
    id: `page:${currentPageId}`,
    label: currentOverride?.label?.trim() || current.name,
    current: true,
    external: false,
    openInNewTab: false,
  });
  return result;
}

