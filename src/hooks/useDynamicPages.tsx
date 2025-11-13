import { useMemo } from "react";
import GenericPaginatedPage from "../components/panelComponents/FormElements/GenericPaginatedPage";
import GenericTabPage from "../components/panelComponents/FormElements/GenericTabPage";
import GenericUnpaginatedPage from "../components/panelComponents/FormElements/GenericUnpaginatedPage";
import { useGetDynamicItems } from "../utils/dynamic";

interface PageSchema {
  schemaName: string;
  label?: string;
  isPaginated?: boolean; // Add isPaginated prop
  icon?: string; // Add icon for individual schemas in tabs
}

interface Page {
  _id: string;
  name: string;
  icon?: string; // Icon name from page data
  schemas?: PageSchema[]; // Optional top-level schemas
  page?: Page; // Single nested page
}

interface DynamicRoute {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  icon?: string; // Icon name from page data
  element?: () => JSX.Element;
  children?: DynamicRoute[]; // Support nested routes
}

export const useDynamicPages = () => {
  // Fetch all pages from the "page" schema
  const pages = useGetDynamicItems<Page>("page");

  // Helper function to create a route from a page's schemas
  const createRouteFromSchemas = (
    name: string,
    schemas: PageSchema[],
    basePath: string,
    icon?: string,
    showHeader: boolean = true // Add parameter to control header display
  ): DynamicRoute => {
    const path = basePath;

    // If multiple schemas, use GenericTabPage
    if (schemas.length > 1) {
      return {
        name,
        path,
        isOnSidebar: true,
        icon,
        element: () => (
          <GenericTabPage
            tabs={schemas.map((schema: PageSchema) => ({
              schemaName: schema.schemaName,
              label: schema.label,
              isPaginated: schema.isPaginated ?? true, // Default to true
              iconName: schema.icon, // Pass icon name from schema
            }))}
          />
        ),
      };
    }

    // If single schema, use GenericPaginatedPage or GenericUnpaginatedPage based on isPaginated
    if (schemas.length === 1) {
      const schema = schemas[0];
      const isPaginated = schema.isPaginated ?? true; // Default to true

      return {
        name,
        path,
        isOnSidebar: true,
        icon,
        element: () =>
          isPaginated ? (
            <GenericPaginatedPage
              schemaName={schema.schemaName}
              isHeader={showHeader}
            />
          ) : (
            <GenericUnpaginatedPage
              schemaName={schema.schemaName}
              isHeader={showHeader}
            />
          ),
      };
    }

    // Fallback for empty schemas
    return {
      name,
      path,
      isOnSidebar: false,
      icon,
      element: () => <div>No schemas configured for this page</div>,
    };
  };

  // Generate routes from pages
  const dynamicRoutes = useMemo<DynamicRoute[]>(() => {
    if (!pages || pages.length === 0) {
      return [];
    }

    return pages.map((page: Page) => {
      const basePath = `/${page.name.toLowerCase().replace(/\s+/g, "-")}`;

      // Handle nested page (singular 'page' property)
      const nestedPages: Page[] = [];
      if (page.page) {
        nestedPages.push(page.page);
      }

      // If page has nested page, create a parent route with children
      if (nestedPages.length > 0) {
        const children: DynamicRoute[] = nestedPages.map((childPage: Page) => {
          const childPath = `${basePath}/${childPage.name
            .toLowerCase()
            .replace(/\s+/g, "-")}`;

          // Create route from child page's schemas
          if (childPage.schemas && childPage.schemas.length > 0) {
            return createRouteFromSchemas(
              childPage.name,
              childPage.schemas,
              childPath,
              childPage.icon,
              true // Show header for nested pages
            );
          }

          // Fallback for child page without schemas
          return {
            name: childPage.name,
            path: childPath,
            isOnSidebar: false,
            icon: childPage.icon,
            element: () => <div>No schemas configured for this page</div>,
          };
        });

        // If parent page also has schemas, add them as a child route
        if (page.schemas && page.schemas.length > 0) {
          children.unshift(
            createRouteFromSchemas(
              page.name,
              page.schemas,
              basePath,
              page.icon,
              true
            )
          );
        }

        // Return parent route with children
        return {
          name: page.name,
          isOnSidebar: true,
          icon: page.icon,
          children,
        };
      }

      // If page has only schemas (no nested pages), create a simple route
      if (page.schemas && page.schemas.length > 0) {
        return createRouteFromSchemas(
          page.name,
          page.schemas,
          basePath,
          page.icon,
          true // Explicitly show header for standalone pages
        );
      }

      // Fallback for pages with no schemas and no nested pages
      return {
        name: page.name,
        path: basePath,
        isOnSidebar: false,
        icon: page.icon,
        element: () => <div>No schemas configured for this page</div>,
      };
    });
  }, [pages]);

  // Generate route enum entries
  const routeEnums = useMemo(() => {
    if (!pages || pages.length === 0) {
      return {};
    }

    return pages.reduce((acc: Record<string, string>, page: Page) => {
      const enumKey = page.name
        .replace(/\s+/g, "")
        .replace(/^./, (c: string) => c.toUpperCase()); // PascalCase
      const path = `/${page.name.toLowerCase().replace(/\s+/g, "-")}`;
      acc[enumKey] = path;
      return acc;
    }, {} as Record<string, string>);
  }, [pages]);

  return {
    dynamicRoutes,
    routeEnums,
    isLoading: !pages, // Simple loading check
    pages: pages || [],
  };
};
