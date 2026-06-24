import React from "react";
import { useParams } from "react-router-dom";
import { PageSection } from "../types/page";
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
  className?: string;
}

export const DynamicPageRenderer: React.FC<DynamicPageRendererProps> = ({
  sections,
  className = "",
}) => {
  const routeParams = useParams();

  if (!sections || sections.length === 0) {
    return (
      <>
        <Header />
        <div className="p-8 text-center text-gray-500">
          <p>No content configured for this page</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={`dynamic-page-renderer ${className}`}>
        <div className="sections-container space-y-6">
          {[...sections]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((section, index) => (
              <PageSectionView
                key={
                  section.id || section.grid?.cells[0]?.id || `section-${index}`
                }
                section={section}
                routeParams={routeParams}
              />
            ))}
        </div>
      </div>
    </>
  );
};
