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
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
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
    {}
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
        <button className="text-sm text-white">
          <Bars3Icon className="h-5 w-5" />
        </button>
      </MenuHandler>
      <MenuList
        className="overflow-scroll no-scrollbar h-[95%] max-h-max"
        placeholder=""
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
        onResize={() => {}}
        onResizeCapture={() => {}}
      >
        {routes.map((route) => {
          const filteredRouteChildren = route?.children?.filter(
            (child) => child.isOnSidebar !== false
          );

          if (filteredRouteChildren && filteredRouteChildren?.length > 1) {
            return (
              <div key={route.name}>
                <MenuItem
                  className="group flex items-center justify-between cursor-pointer hover:bg-gray-100"
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
                  <span>{t(route.name)}</span>
                  {openGroups[route.name] ? (
                    <FiChevronDown className="text-lg" />
                  ) : (
                    <FiChevronRight className="text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  )}
                </MenuItem>

                {openGroups[route.name] &&
                  filteredRouteChildren
                    .filter((child) => child.isOnSidebar !== false)
                    .map((child) => (
                      <MenuItem
                        key={child.name}
                        className={`pl-6 ${
                          child.path === currentRoute
                            ? "bg-gray-100 text-black"
                            : ""
                        }
                        ${
                          child.link &&
                          "text-blue-700 w-fit cursor-pointer hover:text-blue-500 transition-transform"
                        }    
                        `}
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
              <MenuItem
                key={filteredRouteChildren[0].name}
                className={`${
                  filteredRouteChildren[0].path === currentRoute
                    ? "bg-gray-100 text-black"
                    : ""
                } ${
                  filteredRouteChildren[0].link &&
                  "text-blue-700 w-fit cursor-pointer hover:text-blue-500 transition-transform"
                }`}
                onClick={() =>
                  handleNavigation(
                    filteredRouteChildren[0].path,
                    filteredRouteChildren[0].link
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
            );
          } else {
            if (route.isOnSidebar === false) return null;
            return (
              <MenuItem
                key={route.name}
                className={`${
                  route.path === currentRoute ? "bg-gray-100 text-black" : ""
                } ${
                  route.link &&
                  "text-blue-700 w-fit cursor-pointer hover:text-blue-500 transition-transform"
                }`}
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
            );
          }
        })}

        {showLogout && (
          <MenuItem
            className="flex flex-row gap-2 items-center"
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
        )}
      </MenuList>
    </Menu>
  );
}
