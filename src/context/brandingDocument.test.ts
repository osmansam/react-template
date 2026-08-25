import { describe, expect, it } from "vitest";
import type { EffectiveBranding } from "../types/branding";
import {
  applyBrandingToDocument,
  browserBrandingDocument,
  type BrandingDocument,
} from "./brandingDocument";

function fakeBrandingDocument(): BrandingDocument {
  const properties = new Map<string, string>();
  const links: Array<{ href: string; remove: () => void }> = [];
  return {
    title: "AutoTable",
    getPrimaryColor: () => properties.get("--brand-primary") || "",
    setPrimaryColor: (value) => properties.set("--brand-primary", value),
    removePrimaryColor: () => properties.delete("--brand-primary"),
    getProjectFavicon: () => links[0],
    createProjectFavicon: () => {
      const link = {
        href: "",
        remove: () => {
          const index = links.indexOf(link);
          if (index >= 0) links.splice(index, 1);
        },
      };
      links.push(link);
      return link;
    },
  };
}

const branding: EffectiveBranding = {
  displayName: "Acme Inventory",
  logoUrl: "logo.png",
  compactLogoUrl: "compact.png",
  faviconUrl: "favicon.png",
  logoAlt: "Acme",
  primaryColor: "#2563EB",
  loginBrandingEnabled: true,
  version: 1,
};

describe("project branding document effects", () => {
  it("updates and restores title, favicon, and primary color", () => {
    const target = fakeBrandingDocument();
    const cleanup = applyBrandingToDocument(branding, target);

    expect(target.title).toBe("Acme Inventory");
    expect(target.getPrimaryColor()).toBe("#2563EB");
    expect(target.getProjectFavicon()?.href).toBe("favicon.png");

    cleanup();
    expect(target.title).toBe("AutoTable");
    expect(target.getPrimaryColor()).toBe("");
    expect(target.getProjectFavicon()).toBeUndefined();
  });

  it("reuses one project favicon instead of accumulating links", () => {
    const target = fakeBrandingDocument();
    applyBrandingToDocument(branding, target);
    applyBrandingToDocument(
      { ...branding, displayName: "Beta", faviconUrl: "beta.png" },
      target,
    );

    expect(target.title).toBe("Beta");
    expect(target.getProjectFavicon()?.href).toBe("beta.png");
  });

  it("uses the existing static application favicon instead of adding a competing link", () => {
    const staticFavicon = { href: "default.svg" };
    const appended: unknown[] = [];
    const documentStub = {
      title: "AutoAPI",
      documentElement: { style: { getPropertyValue: () => "", setProperty: () => {}, removeProperty: () => {} } },
      querySelector: (selector: string) =>
        selector === "link[rel~='icon']" ? staticFavicon : null,
      createElement: () => ({ rel: "", dataset: {}, href: "", remove: () => {} }),
      head: { appendChild: (link: unknown) => appended.push(link) },
    } as unknown as Document;

    applyBrandingToDocument(branding, browserBrandingDocument(documentStub));

    expect(staticFavicon.href).toBe("favicon.png");
    expect(appended).toHaveLength(0);
  });
});
