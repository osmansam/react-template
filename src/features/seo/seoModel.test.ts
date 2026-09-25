import { describe, expect, it } from "vitest";
import { applySeoDraft, createSeoDraft, unwrapRecords } from "./seoModel";

const page = {
  _id: "mongo-1",
  id: "about-id",
  slug: "about",
  localizedSlugs: { tr: "hakkimizda" },
  status: "published" as const,
  seo: {
    titleKey: "page.about.seo.title",
    descriptionKey: "page.about.seo.description",
    keywordsKey: "page.about.seo.keywords",
    noIndex: false,
  },
  localization: {
    en: {
      "page.about.seo.title": "About us",
      "page.about.seo.description": "English description",
    },
    tr: {
      "page.about.seo.title": "Hakkımızda",
      "page.about.seo.keywords": "şirket, ekip",
    },
  },
  version: 3,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("SEO workspace model", () => {
  it("unwraps AutoTable list response shapes", () => {
    expect(unwrapRecords({ data: { items: [page] } })).toEqual([page]);
    expect(unwrapRecords({ data: [page] })).toEqual([page]);
    expect(unwrapRecords([page])).toEqual([page]);
  });

  it("uses source-locale fallback while keeping the localized slug", () => {
    expect(createSeoDraft(page, "tr", "en")).toMatchObject({
      slug: "hakkimizda",
      title: "Hakkımızda",
      description: "English description",
      keywords: "şirket, ekip",
      noIndex: false,
    });
  });

  it("builds a generic AutoTable patch without changing stable page identity", () => {
    const patch = applySeoDraft(page, "tr", {
      ...createSeoDraft(page, "tr", "en"),
      slug: "biz-kimiz",
      title: "Biz kimiz?",
      description: "Ekibimizi tanıyın.",
      keywords: "ekip, şirket",
      socialImage: "https://cdn.example.com/about.jpg",
      noIndex: true,
      excludeFromSitemap: true,
    }, "2026-09-24T12:00:00.000Z");

    expect(patch).not.toHaveProperty("id");
    expect(patch.localizedSlugs).toEqual({ tr: "biz-kimiz" });
    expect(patch.seo).toMatchObject({ image: "https://cdn.example.com/about.jpg", noIndex: true, excludeFromSitemap: true });
    expect(patch.localization.tr["page.about.seo.title"]).toBe("Biz kimiz?");
    expect(patch.version).toBe(4);
  });
});
