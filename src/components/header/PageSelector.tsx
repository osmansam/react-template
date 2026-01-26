import { Bars3Icon } from "@heroicons/react/24/outline";
import {
  Menu,
  MenuHandler,
  MenuItem,
  MenuList,
} from "@material-tailwind/react";
import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown } from "react-icons/fi";
import { IoIosLogOut } from "react-icons/io";
import { useLocation, useNavigate } from "react-router-dom";

export interface MenuRoute {
  name: string;
  path?: string;
  link?: string;
  isOnSidebar?: boolean;
  children?: MenuRoute[];
}

interface PageSelectorProps {
  routes?: MenuRoute[];
  onLogout?: () => void;
  loginRoute?: string;
  showLogout?: boolean;
  onNavigate?: () => void;
}

/**
 * PageSelector - Mobile menu component with collapsible groups
 *
 * @param routes - Array of menu routes with optional nested children
 * @param onLogout - Custom logout handler (optional)
 * @param loginRoute - Route to navigate after logout (default: "/login")
 * @param showLogout - Show/hide logout button (default: true)
 * @param onNavigate - Callback triggered on navigation (optional)
 */

export function PageSelector({
  routes = [],
  onLogout,
  loginRoute = "/login",
  showLogout = true,
  onNavigate,
}: PageSelectorProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const currentRoute = location.pathname;
  const [openGroups, setOpenGroups] = useState<{ [group: string]: boolean }>(
    {},
  );

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  function handleLogout() {
    if (onLogout) {
      onLogout();
    } else {
      // Extract tenant/project from current URL before clearing
      const pathParts = window.location.pathname.split("/");
      const tIndex = pathParts.indexOf("t");
      const pIndex = pathParts.indexOf("p");
      const tenant = tIndex !== -1 ? pathParts[tIndex + 1] : "";
      const project = pIndex !== -1 ? pathParts[pIndex + 1] : "";

      // Default logout behavior
      localStorage.clear();
      localStorage.setItem("loggedOut", "true");
      setTimeout(() => localStorage.removeItem("loggedOut"), 500);
      Cookies.remove("jwt");
      queryClient.clear();

      // Redirect to login with tenant/project context preserved
      const redirectPath =
        tenant && project ? `/t/${tenant}/p/${project}/login` : loginRoute;
      navigate(redirectPath);
    }
  }

  function handleNavigation(path?: string, link?: string) {
    if (link) {
      window.location.href = link;
      return;
    }
    if (path) {
      if (onNavigate) {
        onNavigate();
      }
      navigate(path);
      window.scrollTo(0, 0);
    }
  }

  return (
    <Menu>
      <MenuHandler>
        <button
          className="p-2 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all duration-200 active:scale-95"
          aria-label="Menu"
        >
          <Bars3Icon className="h-6 w-6" strokeWidth={2} />
        </button>
      </MenuHandler>
      <MenuList
        className="overflow-y-auto max-h-[85vh] p-2 min-w-[240px] shadow-xl border border-neutral-200/50 rounded-2xl backdrop-blur-xl bg-white/95"
        placeholder=""
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
        onResize={() => {}}
        onResizeCapture={() => {}}
      >
        {routes.map((route, index) => {
          const filteredRouteChildren = route?.children?.filter(
            (child) => child.isOnSidebar !== false,
          );

          if (filteredRouteChildren && filteredRouteChildren?.length > 1) {
            return (
              <div key={route.name}>
                {index > 0 && <div className="h-px bg-neutral-200/50 my-2" />}
                <MenuItem
                  className="group flex items-center justify-between cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-neutral-100 active:scale-[0.98]"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(route.name);
                  }}
                  placeholder=""
                  onResize={() => {}}
                  onResizeCapture={() => {}}
                  onPointerEnterCapture={() => {}}
                  onPointerLeaveCapture={() => {}}
                >
                  <span className="text-sm font-medium text-neutral-900">
                    {t(route.name)}
                  </span>
                  <div
                    className={`transition-transform duration-200 ${openGroups[route.name] ? "rotate-0" : "-rotate-90"}`}
                  >
                    <FiChevronDown className="text-base text-neutral-500" />
                  </div>
                </MenuItem>

                {openGroups[route.name] &&
                  filteredRouteChildren
                    .filter((child) => child.isOnSidebar !== false)
                    .map((child) => (
                      <MenuItem
                        key={child.name}
                        className={`ml-3 pl-3 pr-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                          child.path === currentRoute
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-neutral-700 hover:bg-neutral-100"
                        } active:scale-[0.98]`}
                        onClick={() => handleNavigation(child.path, child.link)}
                        placeholder=""
                        onResize={() => {}}
                        onResizeCapture={() => {}}
                        onPointerEnterCapture={() => {}}
                        onPointerLeaveCapture={() => {}}
                      >
                        {t(child.name)}
                      </MenuItem>
                    ))}
              </div>
            );
          } else if (
            filteredRouteChildren &&
            filteredRouteChildren?.length === 1
          ) {
            if (filteredRouteChildren[0].isOnSidebar === false) return null;
            return (
              <div key={filteredRouteChildren[0].name}>
                {index > 0 && <div className="h-px bg-neutral-200/50 my-2" />}
                <MenuItem
                  className={`px-3 py-2.5 rounded-lg transition-all duration-200 text-sm active:scale-[0.98] ${
                    filteredRouteChildren[0].path === currentRoute
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                  onClick={() =>
                    handleNavigation(
                      filteredRouteChildren[0].path,
                      filteredRouteChildren[0].link,
                    )
                  }
                  placeholder=""
                  onResize={() => {}}
                  onResizeCapture={() => {}}
                  onPointerEnterCapture={() => {}}
                  onPointerLeaveCapture={() => {}}
                >
                  {t(filteredRouteChildren[0].name)}
                </MenuItem>
              </div>
            );
          } else {
            if (route.isOnSidebar === false) return null;
            return (
              <div key={route.name}>
                {index > 0 && <div className="h-px bg-neutral-200/50 my-2" />}
                <MenuItem
                  className={`px-3 py-2.5 rounded-lg transition-all duration-200 text-sm active:scale-[0.98] ${
                    route.path === currentRoute
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-neutral-700 hover:bg-neutral-100"
                  } ${route.link && "text-blue-600 hover:text-blue-700"}`}
                  onClick={() => {
                    if (currentRoute === route.path) return;
                    handleNavigation(route.path, route.link);
                  }}
                  placeholder=""
                  onResize={() => {}}
                  onResizeCapture={() => {}}
                  onPointerEnterCapture={() => {}}
                  onPointerLeaveCapture={() => {}}
                >
                  {t(route.name)}
                </MenuItem>
              </div>
            );
          }
        })}

        {showLogout && (
          <>
            <div className="h-px bg-neutral-200/50 my-2" />
            <MenuItem
              className="flex flex-row gap-2 items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm text-red-600 hover:bg-red-50 active:scale-[0.98]"
              onClick={handleLogout}
              placeholder=""
              onResize={() => {}}
              onResizeCapture={() => {}}
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
            >
              <IoIosLogOut className="text-lg" />
              {t("Logout")}
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  );
}
