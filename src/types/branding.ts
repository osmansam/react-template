export interface EffectiveBranding {
  displayName: string;
  logoUrl: string;
  compactLogoUrl: string;
  faviconUrl: string;
  logoAlt: string;
  primaryColor: string;
  loginBrandingEnabled: boolean;
  version: number;
}

export const DEFAULT_BRANDING: EffectiveBranding = {
  displayName: "AutoTable",
  logoUrl: "",
  compactLogoUrl: "",
  faviconUrl: "/favicon.ico",
  logoAlt: "AutoTable",
  primaryColor: "#2563EB",
  loginBrandingEnabled: true,
  version: 0,
};
