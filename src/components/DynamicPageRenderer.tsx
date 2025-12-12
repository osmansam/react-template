import React from "react";
import {
  ComponentBlock,
  GridCell,
  GridSection,
  TabContent,
} from "../types/page";
import { useGetSelection } from "../utils/dynamic";
import DynamicChart, { ChartType } from "./charts/DynamicChart";
import "./dynamic-page-renderer.css";
import { Header } from "./header/Header";
import GenericPaginatedPage from "./panelComponents/FormElements/GenericPaginatedPage";
import GenericTabPage from "./panelComponents/FormElements/GenericTabPage";

// Map component type to chart type
const getChartTypeFromComponentType = (
  componentType: string
): ChartType | null => {
  const mapping: Record<string, ChartType> = {
    barChart: "bar",
    lineChart: "line",
    pieChart: "pie",
    areaChart: "area",
    radarChart: "radar",
    heatmapChart: "heatmap",
    scatterChart: "scatter",
    funnelChart: "funnel",
    sankeyChart: "sankey",
    sunburstChart: "sunburst",
    treemapChart: "treemap",
    calendarChart: "calendar",
    bumpChart: "bump",
    streamChart: "stream",
    waffleChart: "waffle",
    circlePackingChart: "circle-packing",
  };
  return mapping[componentType] || null;
};

/**
 * Renders a single component based on its type
 */
const RenderComponent: React.FC<{ component: ComponentBlock }> = React.memo(
  ({ component }) => {
    const { type, dataBinding, tabs, groupBy, title, props } = component;

    // Find which tab (if any) has a groupBy configuration
    const tabWithGroupByIndex =
      tabs?.findIndex((tab) => tab.components[0]?.groupBy) ?? -1;

    const tabPanelGroupBy =
      groupBy ||
      (tabWithGroupByIndex >= 0
        ? tabs![tabWithGroupByIndex]?.components[0]?.groupBy
        : undefined);

    // Call useGetSelection unconditionally, but only when groupBy is defined
    const shouldFetchGrouping =
      type === "tabPanel" &&
      Boolean(tabPanelGroupBy?.groupByObjectId) &&
      Boolean(tabPanelGroupBy?.groupByField) &&
      tabs &&
      tabs.length > 0;

    const selectionData = useGetSelection<Array<Record<string, unknown>>>(
      shouldFetchGrouping && tabPanelGroupBy
        ? tabPanelGroupBy.groupByObjectId
        : "",
      shouldFetchGrouping && tabPanelGroupBy ? tabPanelGroupBy.groupByField : ""
    );

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
        // Check if this tabPanel should be dynamically generated from GroupBy
        if (shouldFetchGrouping && tabWithGroupByIndex >= 0) {
          if (!selectionData || selectionData.length === 0) {
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-yellow-800 text-sm">
                  Loading grouped tabs...
                </p>
              </div>
            );
          }

          // Get the base component configuration from the tab with groupBy
          const baseTab = tabs![tabWithGroupByIndex];
          const baseComponent = baseTab?.components[0];
          if (!baseComponent?.dataBinding?.schemaName) {
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-yellow-800 text-sm">
                  TabPanel with GroupBy requires a table component with schema
                  binding
                </p>
              </div>
            );
          }

          // Generate dynamic tabs based on selection data
          const dynamicTabs = selectionData.map((item) => {
            const groupValue = item._id; // The ID to filter by
            const tabLabel = String(
              item[tabPanelGroupBy!.groupByField] || groupValue
            ); // Display label

            return {
              schemaName: baseComponent.dataBinding!.schemaName!,
              label: tabLabel,
              isPaginated: true,
              constantFilter: {
                [tabPanelGroupBy!.groupByObjectId]: groupValue,
              },
            };
          });

          // Create all tabs: static tabs + dynamic tabs (replacing the groupBy tab)
          const allTabsConfig = [
            // All tabs before the groupBy tab
            ...tabs!.slice(0, tabWithGroupByIndex).map((tab: TabContent) => ({
              schemaName: tab.components[0]?.dataBinding?.schemaName || "",
              label: tab.title,
              isPaginated: true,
            })),
            // Dynamic tabs replacing the groupBy tab
            ...dynamicTabs,
            // All tabs after the groupBy tab
            ...tabs!.slice(tabWithGroupByIndex + 1).map((tab: TabContent) => ({
              schemaName: tab.components[0]?.dataBinding?.schemaName || "",
              label: tab.title,
              isPaginated: true,
            })),
          ];

          return <GenericTabPage tabs={allTabsConfig} />;
        }

        // Use existing GenericTabPage component (static tabs)
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

      case "barChart":
      case "lineChart":
      case "pieChart":
      case "areaChart":
      case "radarChart":
      case "heatmapChart":
      case "scatterChart":
      case "funnelChart":
      case "sankeyChart":
      case "sunburstChart":
      case "treemapChart":
      case "calendarChart":
      case "bumpChart":
      case "streamChart":
      case "waffleChart":
      case "circlePackingChart": {
        // Render chart component
        const chartType = getChartTypeFromComponentType(type);
        if (!chartType) {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800 text-sm">
                Invalid chart type: {type}
              </p>
            </div>
          );
        }

        if (
          dataBinding?.kind === "pipeline" &&
          dataBinding.schemaName &&
          dataBinding.pipelineName
        ) {
          return (
            <DynamicChart
              config={{
                type: chartType,
                title: title,
                height: props?.height as number | undefined,
                width: props?.width as string | undefined,
                chartOptions: props?.chartOptions as
                  | Record<string, unknown>
                  | undefined,
                dataBinding: {
                  kind: "pipeline",
                  schemaName: dataBinding.schemaName,
                  pipelineName: dataBinding.pipelineName,
                  params: dataBinding.params,
                },
              }}
            />
          );
        }
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-yellow-800 text-sm">
              Chart component requires pipeline binding with schemaName and
              pipelineName
            </p>
          </div>
        );
      }

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
