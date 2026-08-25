import { Link } from "react-router-dom";
import { useFilteredRoutes } from "../../hooks/useFilteredRoutes";
import { Logo } from "../Logo";
import { PageSelector } from "./PageSelector";
import { LanguageSelector } from "./LanguageSelector";
import { useBranding } from "../../context/useBranding";
import { BrandedImage } from "../BrandedImage";

interface HeaderProps {
  logoSrc?: string;
  logoAlt?: string;
  appName?: string;
  homeRoute?: string;
  showMobileMenu?: boolean;
  className?: string;
}

export function Header({
  logoSrc,
  logoAlt,
  appName,
  homeRoute = "/test",
  showMobileMenu = true,
  className = "",
}: HeaderProps) {
  const routes = useFilteredRoutes();
  const branding = useBranding();
  const effectiveLogo = logoSrc ?? branding.logoUrl;
  const effectiveAlt = logoAlt ?? branding.logoAlt;
  const effectiveName = appName ?? branding.displayName;

  const handleScrollToTop = () => {
    if (location.pathname === homeRoute) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={`sticky top-0 z-40 ${className}`}>
      <nav className="w-full bg-white border-b border-neutral-200 backdrop-blur-md bg-white/80">
        <div className="h-14 flex justify-between items-center px-4 lg:px-6">
          <div className="flex flex-row gap-3 items-center">
            <Link
              to={homeRoute}
              onClick={handleScrollToTop}
              className="flex items-center"
            >
              <BrandedImage
                src={effectiveLogo}
                alt={effectiveAlt}
                className="h-8 w-8"
                fallback={<Logo size={32} />}
              />
            </Link>
            <Link
              to={homeRoute}
              className="hidden sm:block group"
              onClick={handleScrollToTop}
            >
              <span className="text-sm font-semibold text-neutral-900 tracking-tight group-hover:text-neutral-700 transition-colors">
                {effectiveName}
              </span>
            </Link>
          </div>
          <div className="w-auto h-full flex items-center justify-end gap-x-3">
            <LanguageSelector />
            {showMobileMenu && (
              <div className="lg:hidden">
                <PageSelector routes={routes} />
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
