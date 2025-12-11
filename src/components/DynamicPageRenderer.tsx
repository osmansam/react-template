import React from "react";
import {
  ComponentBlock,
  GridCell,
  GridSection,
  TabContent,
} from "../types/page";
import "./dynamic-page-renderer.css";
import { Header } from "./header/Header";
import GenericPaginatedPage from "./panelComponents/FormElements/GenericPaginatedPage";
import GenericTabPage from "./panelComponents/FormElements/GenericTabPage";

/**
 * Renders a single component based on its type
 */
const RenderComponent: React.FC<{ component: ComponentBlock }> = React.memo(
  ({ component }) => {
    const { type, dataBinding, tabs } = component;

    switch (type) {
      case "table":
        // Use existing GenericPaginatedPage component
        if (dataBinding?.kind === "schema" && dataBinding.schemaName) {
          return (
            <GenericPaginatedPage
              schemaName={dataBinding.schemaName}
              isHeader={false} // Header/Sidebar handled by page layout
            />
          );
        }
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-yellow-800 text-sm">
              Table component requires schema binding
            </p>
          </div>
        );

      case "tabPanel":
        // Use existing GenericTabPage component
        if (tabs && Array.isArray(tabs) && tabs.length > 0) {
          // Transform tabs to GenericTabPage format
          const tabsConfig = tabs.map((tab: TabContent) => {
            // Extract schema name from the first component
            const schemaName = tab.components[0]?.dataBinding?.schemaName || "";
            return {
              schemaName,
              label: tab.title,
              isPaginated: true,
            };
          });

          return <GenericTabPage tabs={tabsConfig} />;
        }
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-yellow-800 text-sm">
              TabPanel component requires tabs configuration
            </p>
          </div>
        );

      default:
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-yellow-800 text-sm">
              Unknown component type: <code>{type}</code>
            </p>
          </div>
        );
    }
  }
);

/**
 * Renders a grid cell with its components
 */
const GridCellView: React.FC<{ cell: GridCell }> = React.memo(({ cell }) => {
  const { row, column, rowSpan = 1, colSpan = 1, components } = cell;

  // Sort components by order
  const sortedComponents = [...components].sort((a, b) => a.order - b.order);

  return (
    <div
      className="grid-cell"
      style={{
        gridRow: `${row} / span ${rowSpan}`,
        gridColumn: `${column} / span ${colSpan}`,
      }}
    >
      <div className="flex flex-col gap-4 h-full">
        {sortedComponents.map((component) => (
          <RenderComponent key={component.id} component={component} />
        ))}
      </div>
    </div>
  );
});

/**
 * Renders a grid section
 */
const GridSectionView: React.FC<{ grid: GridSection }> = React.memo(
  ({ grid }) => {
    const { columns, gap = 16, cells } = grid;

    return (
      <div
        className="grid-section w-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {cells.map((cell: GridCell) => (
          <GridCellView key={cell.id} cell={cell} />
        ))}
      </div>
    );
  }
);

/**
 * Main DynamicPageRenderer component
 *
 * Renders a dynamic page with header and content sections
 * based on the sections configuration from the backend
 */
interface DynamicPageRendererProps {
  sections: GridSection[];
  className?: string;
}

export const DynamicPageRenderer: React.FC<DynamicPageRendererProps> = ({
  sections,
  className = "",
}) => {
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
          {sections.map((section, index) => (
            <GridSectionView
              key={section.cells[0]?.id || `section-${index}`}
              grid={section}
            />
          ))}
        </div>
      </div>
    </>
  );
};
