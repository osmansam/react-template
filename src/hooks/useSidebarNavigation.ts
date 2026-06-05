import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGeneralContext } from "../context/General.context";
import { useUserContext } from "../context/User.context";
import { useFilteredRoutes } from "./useFilteredRoutes";
import { useTenantProject } from "./useTenantProject";
import { getTabSlug } from "../utils/slug";

export type SidebarTabItem = {
  label: string;
  icon?: string;
};

export type SidebarRouteItem = {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  exceptionalRoles?: number[];
  link?: string;
  icon?: string;
  element?: () => JSX.Element;
  children?: SidebarRouteItem[];
  tabs?: SidebarTabItem[];
};

type SidebarMenuOption = AutocompleteOption & {
  path?: string;
  link?: string;
  tabSlug?: string;
};

type AutocompleteOption = {
  label: string;
  value: string;
  description?: string;
};

const getAppPath = (pathname: string) => {
  const tenantProjectMatch = pathname.match(/^\/t\/[^/]+\/p\/[^/]+(\/.*)?$/);
  return tenantProjectMatch ? tenantProjectMatch[1] || "/" : pathname;
};

const collectRouteOptions = (
  route: SidebarRouteItem,
  parents: string[] = []
): SidebarMenuOption[] => {
  const options: SidebarMenuOption[] = [];
  const parentLabel = parents.join(" / ");
  const description = parentLabel || undefined;
  const visibleChildren = route.children?.filter((child) => child.isOnSidebar);
  const isGroupedRoute = Boolean(visibleChildren?.length);

  if (route.isOnSidebar && !isGroupedRoute && (route.path || route.link)) {
    options.push({
      label: route.name,
      value: route.link || route.path || route.name,
      description,
      path: route.path,
      link: route.link,
    });

    route.tabs?.forEach((tab) => {
      const tabSlug = getTabSlug(tab.label);
      const tabDescriptionParts = [...parents, route.name].filter(
        (part, index, parts) => index === 0 || part !== parts[index - 1]
      );

      options.push({
        label: tab.label,
        value: `${route.path}?tab=${tabSlug}`,
        description: tabDescriptionParts.join(" / "),
        path: route.path,
        tabSlug,
      });
    });
  }

  route.children?.forEach((child) => {
    options.push(...collectRouteOptions(child, [...parents, route.name]));
  });

  return options;
};

export const useSidebarNavigation = (onNavigateComplete?: () => void) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const routes = useFilteredRoutes() as SidebarRouteItem[];
  const { buildPath } = useTenantProject();
  const { resetGeneralContext } = useGeneralContext();
  const { setUser, user } = useUserContext();
  const [openGroups, setOpenGroups] = useState<{ [group: string]: boolean }>(
    {}
  );
  const [searchValue, setSearchValue] = useState("");

  const currentRoute = getAppPath(location.pathname);

  const toggleGroup = useCallback((groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  }, []);

  const getAllowedTabs = useCallback(
    (item: SidebarRouteItem) => (item.tabs || []).filter((tab) => tab.label),
    []
  );

  const getActiveTab = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("tab") || "";
  }, [location.search]);

  const getFilteredChildren = useCallback(
    (item: SidebarRouteItem) =>
      item.children?.filter((child) => child.isOnSidebar),
    []
  );

  const handleRouteNavigation = useCallback(
    (item: SidebarRouteItem) => {
      if (item.link) {
        window.location.href = item.link;
        return;
      }

      if (!item.path) return;

      resetGeneralContext();
      navigate(buildPath(item.path));
      window.scrollTo(0, 0);
      onNavigateComplete?.();
    },
    [buildPath, navigate, onNavigateComplete, resetGeneralContext]
  );

  const menuOptions = useMemo(
    () => routes.flatMap((route) => collectRouteOptions(route)),
    [routes]
  );

  const handleMenuSelect = useCallback(
    (option: SidebarMenuOption) => {
      setSearchValue(option.label);

      if (option.link) {
        window.location.href = option.link;
        return;
      }

      if (!option.path) return;

      resetGeneralContext();
      const tabQuery = option.tabSlug ? `?tab=${option.tabSlug}` : "";
      navigate(`${buildPath(option.path)}${tabQuery}`);
      window.scrollTo(0, 0);
      onNavigateComplete?.();
    },
    [buildPath, navigate, onNavigateComplete, resetGeneralContext]
  );

  const handleLogoutClick = useCallback(() => {
    localStorage.clear();
    localStorage.setItem("loggedOut", "true");
    setTimeout(() => localStorage.removeItem("loggedOut"), 500);
    Cookies.remove("jwt");
    setUser(undefined);
    queryClient.clear();
    navigate(buildPath("/login"));
  }, [buildPath, navigate, queryClient, setUser]);

  return {
    user,
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
  };
};
