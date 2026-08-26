import type { EffectiveBranding } from "../types/branding";

export function navigationLogo(
  branding: EffectiveBranding,
  expanded: boolean,
) {
  return expanded
    ? branding.logoUrl
    : branding.compactLogoUrl || branding.logoUrl;
}

export function loginBranding(branding: EffectiveBranding) {
  return branding.loginBrandingEnabled ? branding : null;
}
