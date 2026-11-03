import type { PageModel } from "../types/page";
export function isVisualBuilderRoute(pathname: string) {
  return /^\/t\/[^/]+\/p\/[^/]+\/_builder\/?$/.test(pathname);
}
export function validateEditorTarget(pages: PageModel[], pageId: string) {
  if (pages.some(page => page.slug?.replace(/^\/+|\/+$/g, "") === "_builder")) throw new Error("The _builder path is reserved for visual editing. Rename the page using that slug in Tenant Panel.");
  const page = pages.find(page => (page.id || page._id) === pageId);
  if (!page) throw new Error("The selected page is missing or no longer available. Choose another page.");
  if (page.isGroupOnly) throw new Error("Group-only pages cannot contain visual content. Choose a content page.");
  return page;
}
export function panelURL(value: string | undefined): string | undefined {
  try { const url = new URL(value ?? ""); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
