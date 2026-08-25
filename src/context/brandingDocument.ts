import type { EffectiveBranding } from "../types/branding";

export interface BrandingFavicon {
  href: string;
  remove: () => void;
}

export interface BrandingDocument {
  title: string;
  getPrimaryColor: () => string;
  setPrimaryColor: (value: string) => void;
  removePrimaryColor: () => void;
  getProjectFavicon: () => BrandingFavicon | undefined;
  createProjectFavicon: () => BrandingFavicon;
}

export function browserBrandingDocument(document: Document): BrandingDocument {
  return {
    get title() {
      return document.title;
    },
    set title(value: string) {
      document.title = value;
    },
    getPrimaryColor: () =>
      document.documentElement.style.getPropertyValue("--brand-primary"),
    setPrimaryColor: (value) =>
      document.documentElement.style.setProperty("--brand-primary", value),
    removePrimaryColor: () =>
      document.documentElement.style.removeProperty("--brand-primary"),
    getProjectFavicon: () =>
      document.querySelector<HTMLLinkElement>("link[data-project-favicon]") ||
      document.querySelector<HTMLLinkElement>("link[rel~='icon']") ||
      undefined,
    createProjectFavicon: () => {
      const link = document.createElement("link");
      link.rel = "icon";
      link.dataset.projectFavicon = "true";
      document.head.appendChild(link);
      return link;
    },
  };
}

export function applyBrandingToDocument(
  branding: EffectiveBranding,
  target: BrandingDocument,
) {
  const previousTitle = target.title;
  const previousColor = target.getPrimaryColor();
  const existingFavicon = target.getProjectFavicon();
  const previousFavicon = existingFavicon?.href;
  const favicon = existingFavicon || target.createProjectFavicon();

  target.title = branding.displayName;
  target.setPrimaryColor(branding.primaryColor);
  favicon.href = branding.faviconUrl;

  return () => {
    target.title = previousTitle;
    if (previousColor) target.setPrimaryColor(previousColor);
    else target.removePrimaryColor();
    if (existingFavicon && previousFavicon !== undefined) {
      existingFavicon.href = previousFavicon;
    } else {
      favicon.remove();
    }
  };
}
