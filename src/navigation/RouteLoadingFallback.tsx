import { BrandedImage } from "../components/BrandedImage";
import { useBranding } from "../context/useBranding";

export function RouteLoadingFallback() {
  const branding = useBranding();
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
        <BrandedImage src={branding.compactLogoUrl} alt="" className="h-10 w-10" fallbackSize={40} />
        <span>Loading page...</span>
        <span aria-hidden="true" className="text-xs text-gray-400">
          {branding.displayName}
        </span>
      </div>
    </div>
  );
}
