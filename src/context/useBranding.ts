import { createContext, useContext } from "react";
import { DEFAULT_BRANDING, type EffectiveBranding } from "../types/branding";

export const BrandingContext = createContext<EffectiveBranding>(DEFAULT_BRANDING);

export function useBranding() {
  return useContext(BrandingContext);
}
