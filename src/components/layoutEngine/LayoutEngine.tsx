import React from "react";
import { PageLayout, Section } from "../../types/layout";
import { GridSectionView } from "./GridSectionView";
import "./layout-engine.css";

/**
 * LayoutEngine - Main component for rendering dynamic page layouts
 *
 * This component orchestrates the rendering of complete page layouts
 * based on the Section structure from the backend.
 *
 * Features:
 * - Renders multiple sections
 * - Supports tab-based sections
 * - Fully dynamic layout based on backend configuration
 * - No assumptions about component positions
 */

interface LayoutEngineProps {
  /** Array of sections to render */
  sections: Section[];
  /** Optional page title */
  pageTitle?: string;
  /** Optional container class */
  className?: string;
}

/**
 * Single Section Renderer
 */
const SectionRenderer: React.FC<{ section: Section }> = ({ section }) => {
  return (
    <div className="layout-section mb-8" id={section.id}>
      {section.title && (
        <div className="section-header mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{section.title}</h2>
        </div>
      )}
      <GridSectionView section={section.grid} />
    </div>
  );
};

/**
 * LayoutEngine Component
 *
 * Usage:
 * ```tsx
 * <LayoutEngine sections={sections} pageTitle="Dashboard" />
 * ```
 */
export const LayoutEngine: React.FC<LayoutEngineProps> = ({
  sections,
  pageTitle,
  className = "",
}) => {
  if (!sections || sections.length === 0) {
    return (
      <div className="layout-engine-empty p-8 text-center text-gray-500">
        <p>No sections to display</p>
      </div>
    );
  }

  return (
    <div className={`layout-engine ${className}`}>
      {pageTitle && (
        <div className="page-header mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
        </div>
      )}

      <div className="sections-container">
        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
};

/**
 * PageLayoutRenderer - Alternative component for rendering complete PageLayout objects
 *
 * This is a convenience wrapper around LayoutEngine that accepts the full
 * PageLayout structure from the backend.
 */
interface PageLayoutRendererProps {
  layout: PageLayout;
  className?: string;
}

export const PageLayoutRenderer: React.FC<PageLayoutRendererProps> = ({
  layout,
  className = "",
}) => {
  return (
    <LayoutEngine
      sections={layout.sections}
      pageTitle={layout.title}
      className={className}
    />
  );
};

/**
 * Export all components
 */
export { GridSectionView } from "./GridSectionView";
export {
  ChartView,
  CustomComponent,
  FormView,
  KPIBlock,
  RenderComponent,
  TableView,
  TextBlock,
} from "./PrimitiveComponents";
