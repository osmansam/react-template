import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
} from "react-icons/fi";
import { IoIosLogOut } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import AutocompleteInput from "../components/panelComponents/FormElements/AutocompleteInput";
import { useGeneralContext } from "../context/General.context";
import {
  SidebarRouteItem,
  useSidebarNavigation,
} from "../hooks/useSidebarNavigation";
import { useTenantProject } from "../hooks/useTenantProject";
import { getIconByName, getMenuIcon } from "../utils/menuIcons";
import { getTabSlug } from "../utils/slug";
import SidebarTooltip from "./SidebarTooltip";

const getRouteIcon = (item: SidebarRouteItem) =>
  item.icon && /^[A-Z][a-z]+[A-Z]/.test(item.icon)
    ? getIconByName(item.icon)
    : getMenuIcon(item.icon || item.name);

export const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isHoverExpanded,
    setIsHoverExpanded,
    resetGeneralContext,
  } = useGeneralContext();
  const { buildPath } = useTenantProject();
  const previousRouteRef = useRef<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExpanded = isSidebarOpen || isHoverExpanded;

  const {
    routes,
    currentRoute,
    openGroups,
    setOpenGroups,
    toggleGroup,
    getActiveTab,
    getAllowedTabs,
    getFilteredChildren,
    handleRouteNavigation,
    menuOptions,
    handleMenuSelect,
    searchValue,
    setSearchValue,
    handleLogoutClick,
  } = useSidebarNavigation();

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = () => {
    if (isSidebarOpen) return;

    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverExpanded(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    clearHoverTimeout();
    setIsHoverExpanded(false);
  };

  const renderTabs = (item: SidebarRouteItem, paddingClass = "pl-10") => {
    if (!isExpanded || !item.path) return null;

    const allowedTabs = getAllowedTabs(item);
    if (allowedTabs.length <= 1) return null;

    const itemPath = item.path;
    if (!itemPath) return null;

    const activeTab = getActiveTab();

    return (
      <div className="mt-1 space-y-1">
        {allowedTabs.map((tab) => {
          const tabSlug = getTabSlug(tab.label);
          const isActive = itemPath === currentRoute && activeTab === tabSlug;

          return (
            <button
              key={`${item.path}-${tab.label}`}
              onClick={() => {
                resetGeneralContext();
                navigate(`${buildPath(itemPath)}?tab=${tabSlug}`);
                window.scrollTo(0, 0);
              }}
              className={`
                w-full flex justify-start text-left ${paddingClass} pr-3 py-2 rounded-md
                text-sm transition-colors active:scale-[0.99]
                ${
                  isActive
                    ? "bg-neutral-100 text-neutral-900 font-medium"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }
              `}
            >
              {t(tab.label)}
            </button>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (!isExpanded) {
      setOpenGroups({});
    }
  }, [isExpanded, setOpenGroups]);

  useEffect(() => {
    if (
      !isExpanded ||
      !routes.length ||
      previousRouteRef.current === currentRoute
    ) {
      return;
    }

    previousRouteRef.current = currentRoute;

    setOpenGroups((prev) => {
      const nextOpenGroups = { ...prev };

      const markActiveGroups = (route: SidebarRouteItem, parentName = "") => {
        const children = route.children ?? [];
        const activeChild = children.find((child) => child.path === currentRoute);

        if (activeChild) {
          nextOpenGroups[route.name] = true;

          if (getAllowedTabs(activeChild).length > 1) {
            nextOpenGroups[`${route.name}-${activeChild.name}`] = true;
          }
        }

        if (route.path === currentRoute && getAllowedTabs(route).length > 1) {
          nextOpenGroups[parentName ? `${parentName}-${route.name}` : route.name] =
            true;
        }

        children.forEach((child) => markActiveGroups(child, route.name));
      };

      routes.forEach((route) => markActiveGroups(route));
      return nextOpenGroups;
    });
  }, [currentRoute, getAllowedTabs, isExpanded, routes, setOpenGroups]);

  useEffect(() => {
    const resetHoverExpansion = () => {
      clearHoverTimeout();
      setIsHoverExpanded(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetHoverExpansion();
      }
    };

    window.addEventListener("blur", resetHoverExpansion);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", resetHoverExpansion);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resetHoverExpansion();
    };
  }, [clearHoverTimeout, setIsHoverExpanded]);

  if (routes.length === 0) {
    return null;
  }

  return (
    <>
      <aside
        className={`
          hidden lg:block fixed top-0 left-0 h-screen border-r border-neutral-200 bg-white
          transition-[width] duration-200 ease-out z-50 will-change-[width]
          ${isExpanded ? "w-64" : "w-16"}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`h-14 flex items-center border-b border-neutral-200 transition-[padding] duration-200 ${
            isExpanded ? "justify-end px-4" : "justify-center"
          }`}
        >
          <button
            onClick={() => {
              if (isHoverExpanded && !isSidebarOpen) {
                setIsHoverExpanded(false);
                return;
              }

              if (isSidebarOpen) {
                setOpenGroups({});
              }
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-600 hover:bg-neutral-100 active:scale-95 transition-colors duration-150"
            aria-label="Toggle Sidebar"
          >
            {isExpanded ? (
              <FiChevronLeft className="text-lg" />
            ) : (
              <FiChevronRight className="text-lg" />
            )}
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-3.5rem)] py-2 px-2 bg-white overflow-y-auto custom-scrollbar">
          <div className="mb-3">
            {isExpanded ? (
              <AutocompleteInput
                placeholder={t("Search menu...") || "Search menu..."}
                value={searchValue}
                options={menuOptions}
                onChange={(optionValue) => {
                  const selectedOption = menuOptions.find(
                    (option) => option.value === optionValue,
                  );

                  if (selectedOption) {
                    handleMenuSelect(selectedOption);
                  } else {
                    setSearchValue(optionValue);
                  }
                }}
                onClear={() => setSearchValue("")}
                disabled={false}
                isOnClearActive={true}
                className="px-3 py-2 border border-neutral-300 rounded-md text-sm"
                minCharacters={1}
                clearOnFocus={true}
              />
            ) : (
              <div className="flex h-10 items-center justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500">
                  <FiSearch className="text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1">
            {routes.map((route) => {
              const filteredRouteChildren = getFilteredChildren(route);

              if (filteredRouteChildren && filteredRouteChildren.length > 1) {
                const IconComponent = getRouteIcon(route);
                const isGroupOpen = openGroups[route.name];

                return (
                  <div key={route.name}>
                    <SidebarTooltip content={t(route.name)}>
                      <button
                        onClick={() => {
                          if (!isExpanded) {
                            setIsHoverExpanded(true);
                            setTimeout(() => toggleGroup(route.name), 100);
                          } else {
                            toggleGroup(route.name);
                          }
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-100 active:scale-[0.99] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center text-neutral-600 flex-shrink-0">
                            <IconComponent className="text-lg" />
                          </div>
                          {isExpanded && (
                            <span className="text-sm">{t(route.name)}</span>
                          )}
                        </div>
                        {isExpanded &&
                          (isGroupOpen ? (
                            <FiChevronDown className="text-xs text-neutral-500" />
                          ) : (
                            <FiChevronRight className="text-xs text-neutral-500" />
                          ))}
                      </button>
                    </SidebarTooltip>

                    {isExpanded &&
                      isGroupOpen &&
                      filteredRouteChildren.map((child) => {
                        const childHasTabs = getAllowedTabs(child).length > 1;
                        const childKey = `${route.name}-${child.name}`;
                        const isChildOpen = openGroups[childKey];

                        return (
                          <div key={child.name}>
                            <div className="flex items-center">
                              <button
                                className={`
                                  flex-1 flex items-center pl-8 pr-3 py-2 rounded-md text-sm transition-colors active:scale-[0.99]
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
                                onClick={() => handleRouteNavigation(child)}
                              >
                                {t(child.name)}
                              </button>

                              {isExpanded && childHasTabs && (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleGroup(childKey);
                                  }}
                                  className="ml-1 rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
                                  aria-label={`Toggle ${child.name} tabs`}
                                >
                                  {isChildOpen ? (
                                    <FiChevronDown className="text-xs" />
                                  ) : (
                                    <FiChevronRight className="text-xs" />
                                  )}
                                </button>
                              )}
                            </div>

                            {isChildOpen && renderTabs(child, "pl-12")}
                          </div>
                        );
                      })}
                  </div>
                );
              }

              if (filteredRouteChildren && filteredRouteChildren.length === 1) {
                const child = filteredRouteChildren[0];
                if (!child.isOnSidebar) return null;

                const IconComponent = getRouteIcon(child);
                const childHasTabs = getAllowedTabs(child).length > 1;
                const childKey = `${route.name}-${child.name}`;
                const isChildOpen = openGroups[childKey];

                return (
                  <div key={child.name}>
                    <SidebarTooltip content={t(child.name)}>
                      <div className="flex items-center">
                        <button
                          className={`
                            flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors active:scale-[0.99]
                            ${
                              child.path === currentRoute
                                ? "bg-neutral-100 text-neutral-900 font-medium"
                                : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                            }
                          `}
                          onClick={() => handleRouteNavigation(child)}
                        >
                          <div
                            className={`flex items-center justify-center flex-shrink-0 ${
                              child.path === currentRoute
                                ? "text-neutral-900"
                                : "text-neutral-600"
                            }`}
                          >
                            <IconComponent className="text-lg" />
                          </div>
                          {isExpanded && <span>{t(child.name)}</span>}
                        </button>

                        {isExpanded && childHasTabs && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleGroup(childKey);
                            }}
                            className="ml-1 rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
                            aria-label={`Toggle ${child.name} tabs`}
                          >
                            {isChildOpen ? (
                              <FiChevronDown className="text-xs" />
                            ) : (
                              <FiChevronRight className="text-xs" />
                            )}
                          </button>
                        )}
                      </div>
                    </SidebarTooltip>

                    {isChildOpen && renderTabs(child)}
                  </div>
                );
              }

              if (!route.isOnSidebar) return null;

              const IconComponent = getRouteIcon(route);
              const routeHasTabs = getAllowedTabs(route).length > 1;
              const isRouteOpen = openGroups[route.name];

              return (
                <div key={route.name}>
                  <SidebarTooltip content={t(route.name)}>
                    <div className="flex items-center">
                      <button
                        className={`
                          flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors active:scale-[0.99]
                          ${
                            route.path === currentRoute
                              ? "bg-neutral-100 text-neutral-900 font-medium"
                              : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                          }
                        `}
                        onClick={() => handleRouteNavigation(route)}
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
                        {isExpanded && <span>{t(route.name)}</span>}
                      </button>

                      {isExpanded && routeHasTabs && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleGroup(route.name);
                          }}
                          className="ml-1 rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
                          aria-label={`Toggle ${route.name} tabs`}
                        >
                          {isRouteOpen ? (
                            <FiChevronDown className="text-xs" />
                          ) : (
                            <FiChevronRight className="text-xs" />
                          )}
                        </button>
                      )}
                    </div>
                  </SidebarTooltip>

                  {isRouteOpen && renderTabs(route)}
                </div>
              );
            })}
          </div>

          <div className="border-t border-neutral-200 pt-2 mt-2">
            <SidebarTooltip content={t("Logout")}>
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-error-600 hover:bg-error-50 hover:text-error-700 active:scale-[0.99] transition-colors"
              >
                <div className="flex items-center justify-center flex-shrink-0">
                  <IoIosLogOut className="text-lg" />
                </div>
                {isExpanded && <span>{t("Logout")}</span>}
              </button>
            </SidebarTooltip>
          </div>
        </div>
      </aside>
    </>
  );
};
