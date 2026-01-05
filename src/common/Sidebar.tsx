import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { IoIosLogOut } from "react-icons/io";
import { useLocation, useNavigate } from "react-router-dom";
import { useGeneralContext } from "../context/General.context";
import { useFilteredRoutes } from "../hooks/useFilteredRoutes";
import { useTenantProject } from "../hooks/useTenantProject";
import { getIconByName, getMenuIcon } from "../utils/menuIcons";
import SidebarTooltip from "./SidebarTooltip";

export const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isSidebarOpen, setIsSidebarOpen, resetGeneralContext } =
    useGeneralContext();
  const { buildPath } = useTenantProject();
  // const { setUser } = useUserContext();
  // const user = useGetUser();
  const currentRoute = location.pathname;
  const [openGroups, setOpenGroups] = useState<{ [group: string]: boolean }>(
    {}
  );

  const routes = useFilteredRoutes();

  // Commented out since permission filtering is disabled
  // const pages = useGetPanelControlPages();

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (
    // !user ||
    routes.length === 0
  ) {
    return null;
  }

  const logout = () => {
    localStorage.clear();
    localStorage.setItem("loggedOut", "true");
    setTimeout(() => localStorage.removeItem("loggedOut"), 500);
    Cookies.remove("jwt");
    // setUser(undefined);
    queryClient.clear();
    navigate("/login");
  };

  return (
    <>
      <aside
        className={`
          hidden lg:block fixed top-0 left-0 h-screen border-r border-neutral-200 bg-white
          transition-all duration-300 ease-in-out z-50
          ${isSidebarOpen ? "w-64" : "w-16"}
        `}
      >
        <div
          className={`h-14 flex items-center border-b border-neutral-200 transition-all duration-200 ${
            isSidebarOpen ? "justify-end px-4" : "justify-center"
          }`}
        >
          <button
            onClick={() => {
              if (isSidebarOpen) {
                setOpenGroups({});
              }
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md 
              text-neutral-600 hover:bg-neutral-100 active:scale-95 transition-all duration-200"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? (
              <FiChevronLeft className="text-lg" />
            ) : (
              <FiChevronRight className="text-lg" />
            )}
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-3.5rem)] py-2 px-2 bg-white overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-1">
            {routes.map((route) => {
              // Commented out permission role filtering - showing all routes
              const filteredRouteChildren = route?.children;
              /* 
              const filteredRouteChildren = route?.children?.filter(
                (child) =>
                  child?.exceptionalRoles?.includes((user?.role as Role)._id) ||
                  pages?.some(
                    (page) =>
                      page.name === child.name &&
                      page.permissionRoles?.includes((user?.role as Role)._id)
                  )
              );
              */

              if (filteredRouteChildren && filteredRouteChildren?.length > 1) {
                // If route.icon exists and looks like an icon name (starts with 2+ capital letters like "MdCard", "FaHeart"), use getIconByName
                // Otherwise, use getMenuIcon with the route name
                const IconComponent =
                  route.icon && /^[A-Z][a-z]+[A-Z]/.test(route.icon)
                    ? getIconByName(route.icon)
                    : getMenuIcon(route.icon || route.name);
                return (
                  <div key={route.name}>
                    <SidebarTooltip content={t(route.name)}>
                      <button
                        onClick={() => {
                          if (!isSidebarOpen) {
                            setIsSidebarOpen(true);
                            setTimeout(() => {
                              toggleGroup(route.name);
                            }, 100);
                          } else {
                            toggleGroup(route.name);
                          }
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-md
                        text-sm font-medium text-neutral-700 hover:bg-neutral-100 active:scale-[0.99] transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center text-neutral-600 flex-shrink-0">
                            <IconComponent className="text-lg" />
                          </div>
                          {isSidebarOpen && (
                            <span className="text-sm">{t(route.name)}</span>
                          )}
                        </div>
                        {isSidebarOpen &&
                          (openGroups[route.name] ? (
                            <FiChevronDown className="text-xs text-neutral-500" />
                          ) : (
                            <FiChevronRight className="text-xs text-neutral-500" />
                          ))}
                      </button>
                    </SidebarTooltip>

                    {isSidebarOpen &&
                      openGroups[route.name] &&
                      filteredRouteChildren
                        .filter((child) => child.isOnSidebar)
                        .map((child) => (
                          <button
                            key={child.name}
                            className={`
                            w-full flex items-center pl-8 pr-3 py-2 rounded-md
                            text-sm transition-all active:scale-[0.99]
                            ${
                              child.path === currentRoute
                                ? "bg-neutral-100 text-neutral-900 font-medium"
                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                            }
                            ${
                              child.link
                                ? "text-neutral-700 hover:text-neutral-900"
                                : ""
                            }
                          `}
                            onClick={() => {
                              if (child.link) {
                                window.location.href = child.link;
                                return;
                              }
                              if (child.path) {
                                resetGeneralContext();
                                const fullPath = buildPath(child.path);
                                console.log('Navigating to:', fullPath, 'from child.path:', child.path);
                                navigate(fullPath);
                                window.scrollTo(0, 0);
                                setIsSidebarOpen(false);
                              }
                            }}
                          >
                            {t(child.name)}
                          </button>
                        ))}
                  </div>
                );
              }

              if (
                filteredRouteChildren &&
                filteredRouteChildren?.length === 1
              ) {
                if (!filteredRouteChildren[0].isOnSidebar) return null;
                const child = filteredRouteChildren[0];
                // If child.icon exists and looks like an icon name, use getIconByName
                const IconComponent =
                  child.icon && /^[A-Z][a-z]+[A-Z]/.test(child.icon)
                    ? getIconByName(child.icon)
                    : getMenuIcon(child.icon || child.name);
                return (
                  <SidebarTooltip
                    key={filteredRouteChildren[0].name}
                    content={t(filteredRouteChildren[0].name)}
                  >
                    <button
                      className={`
                      w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
                      text-sm transition-all active:scale-[0.99]
                      ${
                        filteredRouteChildren[0].path === currentRoute
                          ? "bg-neutral-100 text-neutral-900 font-medium"
                          : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                      }
                      ${
                        filteredRouteChildren[0].link
                          ? "text-neutral-700 hover:text-neutral-900"
                          : ""
                      }
                    `}
                      onClick={() => {
                        if (filteredRouteChildren[0].link) {
                          window.location.href = filteredRouteChildren[0].link;
                          return;
                        }
                        if (filteredRouteChildren[0].path) {
                          resetGeneralContext();
                          const fullPath = buildPath(filteredRouteChildren[0].path);
                          console.log('Navigating to:', fullPath, 'from path:', filteredRouteChildren[0].path);
                          navigate(fullPath);
                          window.scrollTo(0, 0);
                        }
                      }}
                    >
                      <div
                        className={`flex items-center justify-center flex-shrink-0 ${
                          filteredRouteChildren[0].path === currentRoute
                            ? "text-neutral-900"
                            : "text-neutral-600"
                        }`}
                      >
                        <IconComponent className="text-lg" />
                      </div>
                      {isSidebarOpen && (
                        <span>{t(filteredRouteChildren[0].name)}</span>
                      )}
                    </button>
                  </SidebarTooltip>
                );
              }

              if (!route.isOnSidebar) return null;
              // If route.icon exists and looks like an icon name, use getIconByName
              const IconComponent =
                route.icon && /^[A-Z][a-z]+[A-Z]/.test(route.icon)
                  ? getIconByName(route.icon)
                  : getMenuIcon(route.icon || route.name);
              return (
                <SidebarTooltip key={route.name} content={t(route.name)}>
                  <button
                    className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
                    text-sm transition-all active:scale-[0.99]
                    ${
                      route.path === currentRoute
                        ? "bg-neutral-100 text-neutral-900 font-medium"
                        : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                    }
                    ${
                      route.link
                        ? "text-neutral-700 hover:text-neutral-900"
                        : ""
                    }
                  `}
                    onClick={() => {
                      if (route.link) {
                        window.location.href = route.link;
                        return;
                      }
                      if (route.path) {
                        resetGeneralContext();
                        const fullPath = buildPath(route.path);
                        console.log('Navigating to:', fullPath, 'from route.path:', route.path);
                        navigate(fullPath);
                        window.scrollTo(0, 0);
                      }
                    }}
                  >
                    <div
                      className={`flex items-center justify-center flex-shrink-0 ${
                        route.path === currentRoute
                          ? "text-neutral-900"
                          : "text-neutral-600"
                      }`}
                    >
                      <IconComponent className="text-lg" />
                    </div>
                    {isSidebarOpen && <span>{t(route.name)}</span>}
                  </button>
                </SidebarTooltip>
              );
            })}
          </div>

          <div className="border-t border-neutral-200 pt-2 mt-2">
            <SidebarTooltip content={t("Logout")}>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
                text-sm font-medium text-error-600 hover:bg-error-50 hover:text-error-700 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-center flex-shrink-0">
                  <IoIosLogOut className="text-lg" />
                </div>
                {isSidebarOpen && <span>{t("Logout")}</span>}
              </button>
            </SidebarTooltip>
          </div>
        </div>
      </aside>
    </>
  );
};
