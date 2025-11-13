import { Link } from "react-router-dom";
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
  appName = "Panel",
  homeRoute = "/test",
  showMobileMenu = true,
  className = "",
}: HeaderProps) {
  const handleScrollToTop = () => {
    if (location.pathname === homeRoute) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={`sticky top-0 z-40 ${className}`}>
      <nav className="w-full bg-gray-800 shadow">
        <div className="h-16 flex justify-between pl-2 lg:pl-4 pr-2 lg:pr-6 mr-2 lg:mr-20">
          <div className="flex flex-row gap-2 items-center">
            <Link to={homeRoute} onClick={handleScrollToTop}>
              <img
                src={logoSrc}
                alt={logoAlt}
                className="w-10 h-10 rounded-full"
              />
            </Link>
            <Link to={homeRoute} className="hidden sm:block">
              <span className="text-base text-white font-bold tracking-normal leading-tight">
                {appName}
              </span>
            </Link>
          </div>
          <div className="w-auto h-full flex items-center justify-end gap-x-2 sm:gap-x-4">
            {showMobileMenu && (
              <div className="lg:hidden">
                <PageSelector />
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
