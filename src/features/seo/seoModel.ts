export interface SeoSettings {
  titleKey: string;
  descriptionKey: string;
  keywordsKey?: string;
  image?: string;
  noIndex?: boolean;
  excludeFromSitemap?: boolean;
}

export interface SeoPageRecord {
  _id?: string;
  id: string;
  slug: string;
  localizedSlugs?: Record<string, string>;
  status: "draft" | "published" | "archived";
  seo: SeoSettings;
  localization: Record<string, Record<string, string>>;
  version: number;
  updatedAt: string;
}

export interface SeoDraft {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  socialImage: string;
  noIndex: boolean;
  excludeFromSitemap: boolean;
}

export function unwrapRecords<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const data = (value as { data?: unknown }).data;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  if (Array.isArray((value as { items?: unknown }).items)) return (value as { items: T[] }).items;
  return [];
}

const localized = (page: SeoPageRecord, locale: string, sourceLocale: string, key?: string) => {
  if (!key) return "";
  return page.localization[locale]?.[key] ?? page.localization[sourceLocale]?.[key] ?? "";
};

export function createSeoDraft(page: SeoPageRecord, locale: string, sourceLocale: string, defaultLocale = sourceLocale): SeoDraft {
  return {
    slug: locale === defaultLocale ? page.slug : page.localizedSlugs?.[locale] || page.slug,
    title: localized(page, locale, sourceLocale, page.seo.titleKey),
    description: localized(page, locale, sourceLocale, page.seo.descriptionKey),
    keywords: localized(page, locale, sourceLocale, page.seo.keywordsKey),
    socialImage: page.seo.image || "",
    noIndex: Boolean(page.seo.noIndex),
    excludeFromSitemap: Boolean(page.seo.excludeFromSitemap),
  };
}

export function applySeoDraft(page: SeoPageRecord, locale: string, draft: SeoDraft, now = new Date().toISOString(), defaultLocale = "en") {
  const keywordsKey = page.seo.keywordsKey || `${page.seo.titleKey.replace(/\.title$/, "")}.keywords`;
  const localeValues = {
    ...(page.localization[locale] || {}),
    [page.seo.titleKey]: draft.title.trim(),
    [page.seo.descriptionKey]: draft.description.trim(),
    [keywordsKey]: draft.keywords.trim(),
  };
  const localizedSlugs = { ...(page.localizedSlugs || {}) };
  if (locale !== defaultLocale) localizedSlugs[locale] = draft.slug.trim();

  return {
    ...(locale === defaultLocale ? { slug: draft.slug.trim() } : {}),
    localizedSlugs,
    seo: {
      ...page.seo,
      keywordsKey,
      image: draft.socialImage.trim() || undefined,
      noIndex: draft.noIndex,
      excludeFromSitemap: draft.excludeFromSitemap,
    },
    localization: { ...page.localization, [locale]: localeValues },
    version: page.version + 1,
    updatedAt: now,
  };
}
