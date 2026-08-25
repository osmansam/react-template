import React from "react";
import { useParams } from "react-router-dom";
import { PageModel, PageSection } from "../types/page";
import { PageRuntimeProvider } from "../pageRuntime/PageRuntimeProvider";
import PageFilterRenderer from "../pageRuntime/PageFilterRenderer";
import "./dynamic-page-renderer.css";
import { PageSectionView } from "./DynamicPageSections";
import { Header } from "./header/Header";
import { useTenantProject } from "../hooks/useTenantProject";
import { PageNavigator } from "../navigation/PageNavigator";
import { buildPageNavigatorViewModel } from "../navigation/pageNavigatorIntegration";

/**
 * Main DynamicPageRenderer component
 *
 * Renders a dynamic page with header and content sections
 * based on the sections configuration from the backend
 */
interface DynamicPageRendererProps {
  sections: PageSection[];
  page?: PageModel;
  pages?: PageModel[];
  className?: string;
}

export const DynamicPageRenderer: React.FC<DynamicPageRendererProps> = ({
  sections,
  page,
  pages = [],
  className = "",
}) => {
  const routeParams = useParams();
  const { buildPath } = useTenantProject();
  const runtimePage = React.useMemo(
    () => page ?? { name: "", sections },
    [page, sections],
  );
  const renderedSections = page?.sections ?? sections;
  const navbarFilters = (runtimePage.filters ?? []).filter(
    (filter) => filter.placement.kind === "navbar",
  );
  const navigatorItems = React.useMemo(
    () => buildPageNavigatorViewModel({ pages, page, routeParams, buildPath }),
    [buildPath, page, pages, routeParams],
  );

  return (
    <PageRuntimeProvider page={runtimePage}>
      <Header />
      <div className={`dynamic-page-renderer ${className}`}>
        <PageNavigator items={navigatorItems} />
        {navbarFilters.length > 0 && (
          <div className="relative z-[1000] mb-4 flex flex-wrap gap-3">
            {navbarFilters.map((filter) => (
              <PageFilterRenderer key={filter.id} filter={filter} />
            ))}
          </div>
        )}
        {!renderedSections || renderedSections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No content configured for this page</p>
          </div>
        ) : (
          <div className="sections-container relative z-0 space-y-6">
            {[...renderedSections]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((section, index) => (
              <PageSectionView
                key={
                  section.id || section.grid?.cells[0]?.id || `section-${index}`
                }
                section={section}
                pageFilters={runtimePage.filters ?? []}
                routeParams={routeParams}
              />
              ))}
          </div>
        )}
      </div>
    </PageRuntimeProvider>
  );
};
