import { useCallback, useMemo } from "react";
import { DynamicPageRenderer } from "../components/DynamicPageRenderer";
import {
  ComponentBlock,
  PageModel,
  PageSection,
  PageTab,
  TabContent,
} from "../types/page";
import { useGetAllPages } from "../utils/api/page";

export interface DynamicRouteTab {
  label: string;
  icon?: string;
}

export interface DynamicRoute {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  isMainPage?: boolean;
  icon?: string;
  element?: () => JSX.Element;
  children?: DynamicRoute[];
  link?: string;
  tabs?: DynamicRouteTab[];
}

const getPageId = (page: PageModel) => page.id || page._id || "";

const getPagePath = (page: PageModel) =>
  `/${page.slug || page.name.toLowerCase().replace(/\s+/g, "-")}`;

const addUniqueTab = (
  tabs: DynamicRouteTab[],
  seen: Set<string>,
  tab?: DynamicRouteTab
) => {
  const label = tab?.label?.trim();
  if (!label || seen.has(label)) return;

  seen.add(label);
  tabs.push({ label, icon: tab?.icon });
};

const extractComponentTabs = (
  component: ComponentBlock | undefined,
  tabs: DynamicRouteTab[],
  seen: Set<string>
) => {
  if (!component) return;

  if (component.type === "tabPanel" && component.tabs?.length) {
    component.tabs.forEach((tab: TabContent) => {
      addUniqueTab(tabs, seen, { label: tab.title });
    });
  }
};

const extractPageTabs = (sections: PageSection[] = []): DynamicRouteTab[] => {
  const tabs: DynamicRouteTab[] = [];
  const seen = new Set<string>();

  sections.forEach((section) => {
    if (section.type === "tabs" && section.tabs?.tabs?.length) {
      section.tabs.tabs
        .slice()
        .sort((a: PageTab, b: PageTab) => a.order - b.order)
        .forEach((tab) => {
          addUniqueTab(tabs, seen, { label: tab.label, icon: tab.icon });
        });
    }

    extractComponentTabs(section.component, tabs, seen);

    const cells = section.grid?.cells || section.cells || [];
    cells.forEach((cell) => {
      cell.components.forEach((component) => {
        extractComponentTabs(component, tabs, seen);
      });
    });
  });

  return tabs;
};

export const useDynamicPages = () => {
  // Fetch all pages from the page API
  const pages = useGetAllPages();
  const pageData = useMemo(
    () => (Array.isArray(pages.data) ? pages.data : []),
    [pages.data]
  );

  // Memoize element factory to prevent function recreation
  const createPageElement = useCallback((page: PageModel) => {
    return () => <DynamicPageRenderer page={page} sections={page.sections} />;
  }, []);

  // Helper to build hierarchical structure
  const buildRouteHierarchy = useCallback(
    (allPages: PageModel[]): DynamicRoute[] => {
      const childrenByParentId = new Map<string, PageModel[]>();
      const pageIds = new Set(allPages.map(getPageId).filter(Boolean));

      allPages.forEach((page) => {
        const parentId = page.parentPageId || "";
        if (!parentId) return;

        const siblings = childrenByParentId.get(parentId) || [];
        siblings.push(page);
        childrenByParentId.set(parentId, siblings);
      });

      const createRoute = (page: PageModel): DynamicRoute => {
        const pageId = getPageId(page);
        const childPages = (childrenByParentId.get(pageId) || []).sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        const path = page.isGroupOnly ? undefined : getPagePath(page);
        const tabs = extractPageTabs(page.sections);

        const route: DynamicRoute = {
          name: page.name,
          path,
          isOnSidebar: page.isOnSidebar !== false,
          isMainPage: page.isMainPage === true,
          icon: page.icon,
        };

        if (tabs.length > 0) {
          route.tabs = tabs;
        }

        if (!page.isGroupOnly && path) {
          route.element = createPageElement(page);
        }

        if (childPages.length > 0) {
          route.children = [
            ...(page.isGroupOnly
              ? []
              : [
                  {
                    name: page.name,
                    path,
                    isOnSidebar: page.isOnSidebar !== false,
                    isMainPage: page.isMainPage === true,
                    icon: page.icon,
                    tabs: tabs.length > 0 ? tabs : undefined,
                    element: createPageElement(page),
                  },
                ]),
            ...childPages.map((childPage) => createRoute(childPage)),
          ];

          delete route.element;
        }

        return route;
      };

      return allPages
        .filter((page) => {
          const parentId = page.parentPageId || "";
          return !parentId || !pageIds.has(parentId);
        })
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
