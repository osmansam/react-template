import { describe, expect, it } from "vitest";
import type { EffectiveBranding } from "../types/branding";
import { applyBrandingToDocument, type BrandingDocument } from "./brandingDocument";

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
});
