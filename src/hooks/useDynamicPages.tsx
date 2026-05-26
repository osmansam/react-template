import { useCallback, useMemo } from "react";
import { DynamicPageRenderer } from "../components/DynamicPageRenderer";
import { PageModel, PageSection } from "../types/page";
import { useGetAllPages } from "../utils/api/page";

interface DynamicRoute {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  icon?: string;
  element?: () => JSX.Element;
  children?: DynamicRoute[];
  link?: string;
}

export const useDynamicPages = () => {
  // Fetch all pages from the page API
  const pages = useGetAllPages();
  const pageData = useMemo(() => pages.data || [], [pages.data]);

  // Memoize element factory to prevent function recreation
  const createPageElement = useCallback((sections: PageSection[] = []) => {
    return () => <DynamicPageRenderer sections={sections} />;
  }, []);

  // Helper to build hierarchical structure
  const buildRouteHierarchy = useCallback(
    (allPages: PageModel[]): DynamicRoute[] => {
      // Helper to convert PageModel to DynamicRoute
      const createRoute = (
        page: PageModel,
        isSubPage = false
      ): DynamicRoute => {
        const route: DynamicRoute = {
          name: page.name,
          path: page.isGroupOnly
            ? undefined
            : `/${page.slug || page.name.toLowerCase().replace(/\s+/g, "-")}`,
          isOnSidebar: true,
          icon: page.icon,
        };

        // If page has subPage (nested page), create children array with both parent and subpage
        if (page.subPage && !isSubPage) {
          route.children = [
            // First child: the parent page itself (if not group-only)
            ...(page.isGroupOnly
              ? []
              : [
                  {
                    name: page.name,
                    path: route.path,
                    isOnSidebar: true,
                    icon: page.icon,
                    element: createPageElement(page.sections),
                  },
                ]),
            // Second child: the subpage
            createRoute(page.subPage, true),
          ];
          // Make parent a group (no direct path when expanded)
          if (!page.isGroupOnly) {
            delete route.element;
          }
        } else if (!page.isGroupOnly && route.path) {
          // If page is not group-only and has no subpage, add element to render
          route.element = createPageElement(page.sections);
        }

        return route;
      };

      // Build routes from all pages (all are treated as root level)
      return allPages
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((page) => createRoute(page));
    },
    [createPageElement]
  );

  // Generate routes from pages
  const dynamicRoutes = useMemo<DynamicRoute[]>(() => {
    if (pageData.length === 0) {
      return [];
    }

    return buildRouteHierarchy(pageData);
  }, [pageData, buildRouteHierarchy]);

  // Generate route enum entries
  const routeEnums = useMemo(() => {
    if (pageData.length === 0) {
      return {};
    }

    return pageData.reduce((acc: Record<string, string>, page: PageModel) => {
      if (!page.isGroupOnly) {
        const enumKey = page.name
          .replace(/\s+/g, "")
          .replace(/^./, (c: string) => c.toUpperCase());
        const slug = page.slug || page.name.toLowerCase().replace(/\s+/g, "-");
        acc[enumKey] = `/${slug}`;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [pageData]);

  return {
    dynamicRoutes,
    routeEnums,
    isLoading: pages.isLoading,
    isError: pages.isError,
    pages: pageData,
  };
};
