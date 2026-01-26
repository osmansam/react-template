import { Link } from "react-router-dom";
import { useFilteredRoutes } from "../../hooks/useFilteredRoutes";
import { Logo } from "../Logo";
import { PageSelector } from "./PageSelector";

interface HeaderProps {
  logoSrc?: string;
  logoAlt?: string;
  appName?: string;
  homeRoute?: string;
  showMobileMenu?: boolean;
  className?: string;
}

export function Header({
  logoSrc = "",
  logoAlt = "logo",
  appName = "AutoAPI",
  homeRoute = "/test",
  showMobileMenu = true,
  className = "",
}: HeaderProps) {
  const routes = useFilteredRoutes();

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
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={logoAlt}
                  className="w-8 h-8 rounded-lg"
                />
              ) : (
                <Logo size={32} />
              )}
            </Link>
            <Link
              to={homeRoute}
              className="hidden sm:block group"
              onClick={handleScrollToTop}
            >
              <span className="text-sm font-semibold text-neutral-900 tracking-tight group-hover:text-neutral-700 transition-colors">
                {appName}
              </span>
            </Link>
          </div>
          <div className="w-auto h-full flex items-center justify-end gap-x-3">
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
