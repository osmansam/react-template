import { useQuery } from "@tanstack/react-query";
import {
  useEffect,
  type PropsWithChildren,
} from "react";
import { useTenantProject } from "../hooks/useTenantProject";
import { DEFAULT_BRANDING } from "../types/branding";
import { getRuntimeBranding } from "../utils/api/branding";
import {
  applyBrandingToDocument,
  browserBrandingDocument,
} from "./brandingDocument";
import { BrandingContext } from "./useBranding";

export function BrandingProvider({ children }: PropsWithChildren) {
  const { tenant, project } = useTenantProject();
  const query = useQuery({
    queryKey: ["runtime-branding", tenant, project],
    queryFn: getRuntimeBranding,
    enabled: Boolean(tenant && project),
    placeholderData: undefined,
  });
  const branding = query.data || DEFAULT_BRANDING;

  useEffect(() => {
    if (typeof document === "undefined") return;
    return applyBrandingToDocument(branding, browserBrandingDocument(document));
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
