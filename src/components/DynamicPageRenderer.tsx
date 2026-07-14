import React from "react";
import { useParams } from "react-router-dom";
import { PageModel, PageSection } from "../types/page";
import { PageRuntimeProvider } from "../pageRuntime/PageRuntimeProvider";
import PageFilterRenderer from "../pageRuntime/PageFilterRenderer";
import "./dynamic-page-renderer.css";
import { PageSectionView } from "./DynamicPageSections";
import { Header } from "./header/Header";

/**
 * Main DynamicPageRenderer component
 *
 * Renders a dynamic page with header and content sections
 * based on the sections configuration from the backend
 */
interface DynamicPageRendererProps {
  sections: PageSection[];
  page?: PageModel;
  className?: string;
}

export const DynamicPageRenderer: React.FC<DynamicPageRendererProps> = ({
  sections,
  page,
  className = "",
}) => {
  const routeParams = useParams();
  const runtimePage = React.useMemo(
    () => page ?? { name: "", sections },
    [page, sections],
  );
  const renderedSections = page?.sections ?? sections;
  const navbarFilters = (runtimePage.filters ?? []).filter(
    (filter) => filter.placement.kind === "navbar",
  );

  if (!renderedSections || renderedSections.length === 0) {
    return (
      <PageRuntimeProvider page={runtimePage}>
        <Header />
        <div className="p-8 text-center text-gray-500">
          <p>No content configured for this page</p>
        </div>
      </PageRuntimeProvider>
    );
  }

  return (
    <PageRuntimeProvider page={runtimePage}>
      <Header />
      <div className={`dynamic-page-renderer ${className}`}>
        {navbarFilters.length > 0 && (
          <div className="relative z-[1000] mb-4 flex flex-wrap gap-3">
            {navbarFilters.map((filter) => (
              <PageFilterRenderer key={filter.id} filter={filter} />
            ))}
          </div>
        )}
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
      </div>
    </PageRuntimeProvider>
  );
};
