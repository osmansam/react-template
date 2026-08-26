import { describe, expect, it } from "vitest";
import type { EffectiveBranding } from "../types/branding";
import { loginBranding, navigationLogo } from "./brandingSelection";

const branding: EffectiveBranding = {
  displayName: "Acme",
  logoUrl: "logo.png",
  compactLogoUrl: "compact.png",
  faviconUrl: "favicon.png",
  logoAlt: "Acme",
  primaryColor: "#2563EB",
  loginBrandingEnabled: true,
  version: 1,
};

describe("branding surface selection", () => {
  it("uses compact navigation identity only when collapsed", () => {
    expect(navigationLogo(branding, true)).toBe("logo.png");
    expect(navigationLogo(branding, false)).toBe("compact.png");
    expect(navigationLogo({ ...branding, compactLogoUrl: "" }, false)).toBe(
      "logo.png",
    );
  });

  it("hides project identity when login branding is disabled", () => {
    expect(loginBranding(branding)).toEqual(branding);
    expect(
      loginBranding({ ...branding, loginBrandingEnabled: false }),
    ).toBeNull();
  });
});
