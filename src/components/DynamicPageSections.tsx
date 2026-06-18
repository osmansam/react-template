import React, { lazy, Suspense, useState } from "react";
import {
  ComponentBlock,
  GridCell,
  GridSection,
  PageSection,
  TableComponentConfig,
  TabContent,
} from "../types/page";
import { useGetSelection } from "../utils/dynamic";
import type { ChartType } from "./charts/DynamicChart";
import GenericPaginatedPage from "./panelComponents/FormElements/GenericPaginatedPage";
import GenericTabPage from "./panelComponents/FormElements/GenericTabPage";
import UnifiedTabPanel from "./panelComponents/TabPanel/UnifiedTabPanel";

const DynamicCalendar = lazy(() => import("./calendar/DynamicCalendar"));
const DynamicChart = lazy(() => import("./charts/DynamicChart"));

const LoadingPanel = ({ message }: { message: string }) => (
  <div className="flex min-h-32 items-center justify-center rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
    {message}
  </div>
);

const NoticePanel = ({
  children,
  tone = "warning",
}: {
  children: React.ReactNode;
  tone?: "warning" | "error" | "empty";
}) => {
  const styles = {
    warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    error: "border-red-200 bg-red-50 text-red-700",
    empty: "border-gray-200 bg-gray-50 text-gray-500",
  };

  return (
    <div className={`rounded border p-4 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
};

const getChartTypeFromComponentType = (
  componentType: string,
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

const getTableConfig = (
  table: TableComponentConfig | undefined,
  props: Record<string, unknown> | undefined,
): TableComponentConfig | undefined =>
  table ||
  (props?.table as TableComponentConfig | undefined) ||
  ([
    props?.columns,
    props?.rows,
    props?.cache,
    props?.actions,
    props?.filterPanel,
  ].some(Boolean)
    ? (props as TableComponentConfig)
    : undefined);

const MixedTabPanel: React.FC<{ tabs: TabContent[] }> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  const unifiedTabs = tabs.map((tab: TabContent, idx: number) => ({
    number: idx,
    label: tab.title,
    isDisabled: false,
    content: (
      <div className="flex flex-col gap-4">
        {tab.components.map((comp) => (
          <RenderComponent key={comp.id} component={comp} />
        ))}
      </div>
    ),
  }));

  return (
    <UnifiedTabPanel
      tabs={unifiedTabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      allowOrientationToggle={true}
    />
  );
};

const RenderComponent: React.FC<{ component: ComponentBlock }> = React.memo(
  ({ component }) => {
    const { type, dataBinding, tabs, groupBy, title, props } = component;
    const tableConfig = getTableConfig(component.table, props);
    const tabWithGroupByIndex =
      tabs?.findIndex((tab) => tab.components[0]?.groupBy) ?? -1;
    const tabPanelGroupBy =
      groupBy ||
      (tabWithGroupByIndex >= 0
        ? tabs![tabWithGroupByIndex]?.components[0]?.groupBy
        : undefined);
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
      shouldFetchGrouping && tabPanelGroupBy
        ? tabPanelGroupBy.groupByField
        : "",
    );

    switch (type) {
      case "table":
        return dataBinding?.schemaName &&
          ["schema", "pipeline", "workflow"].includes(dataBinding.kind) ? (
          <GenericPaginatedPage
            schemaName={dataBinding.schemaName}
            isHeader={false}
            tableConfig={tableConfig}
            dataBinding={dataBinding}
            actionsEnabled={dataBinding.kind === "schema"}
          />
        ) : (
          <NoticePanel>
            Table component requires schema, pipeline, or workflow binding.
          </NoticePanel>
        );
      case "tabPanel":
        if (shouldFetchGrouping && tabWithGroupByIndex >= 0) {
          if (!selectionData || selectionData.length === 0) {
            return <LoadingPanel message="Loading grouped tabs..." />;
          }

          const baseTab = tabs![tabWithGroupByIndex];
          const baseComponent = baseTab?.components[0];
          if (!baseComponent?.dataBinding?.schemaName) {
            return (
              <NoticePanel>
                Tab panel grouping requires a table component with schema
                binding.
              </NoticePanel>
            );
          }

          const dynamicTabs = selectionData.map((item) => {
            const groupValue = item._id;
            return {
              schemaName: baseComponent.dataBinding!.schemaName!,
              label: String(item[tabPanelGroupBy!.groupByField] || groupValue),
              isPaginated: true,
              constantFilter: {
                [tabPanelGroupBy!.groupByObjectId]: groupValue,
              },
              tableConfig: getTableConfig(baseComponent.table, baseComponent.props),
            };
          });

          const allTabsConfig = [
            ...tabs!.slice(0, tabWithGroupByIndex).map((tab: TabContent) => ({
              schemaName: tab.components[0]?.dataBinding?.schemaName || "",
              label: tab.title,
              isPaginated: true,
              tableConfig: getTableConfig(
                tab.components[0]?.table,
                tab.components[0]?.props,
              ),
            })),
            ...dynamicTabs,
            ...tabs!.slice(tabWithGroupByIndex + 1).map((tab: TabContent) => ({
              schemaName: tab.components[0]?.dataBinding?.schemaName || "",
              label: tab.title,
              isPaginated: true,
              tableConfig: getTableConfig(
                tab.components[0]?.table,
                tab.components[0]?.props,
              ),
            })),
          ];

          return <GenericTabPage tabs={allTabsConfig} />;
        }

        if (tabs && Array.isArray(tabs) && tabs.length > 0) {
          const allTabsAreTables = tabs.every(
            (tab) =>
              tab.components.length === 1 &&
              tab.components[0]?.type === "table",
          );

          if (allTabsAreTables) {
            return (
              <GenericTabPage
                tabs={tabs.map((tab) => ({
                  schemaName: tab.components[0]?.dataBinding?.schemaName || "",
                  label: tab.title,
                  isPaginated: true,
                  tableConfig: getTableConfig(
                    tab.components[0]?.table,
                    tab.components[0]?.props,
                  ),
                }))}
              />
            );
          }

          return <MixedTabPanel tabs={tabs} />;
        }

        return (
          <NoticePanel>
            Tab panel component requires tabs configuration.
          </NoticePanel>
        );
      case "calendar":
        return dataBinding?.kind === "schema" && dataBinding.schemaName ? (
          <Suspense fallback={<LoadingPanel message="Loading calendar..." />}>
            <DynamicCalendar
              config={{
                title,
                height: props?.height as number | undefined,
                width: props?.width as string | undefined,
                schemaName: dataBinding.schemaName,
                fieldMappings: props?.fieldMappings as
                  | {
                      id?: string;
                      title?: string;
                      date?: string;
                      startTime?: string;
                      endTime?: string;
                      description?: string;
                      color?: string;
                      category?: string;
                      status?: string;
                    }
                  | undefined,
                options: props?.options as
                  | {
                      defaultView?: "month" | "week" | "day";
                      showWeekNumbers?: boolean;
                      firstDayOfWeek?: 0 | 1;
                      allowEventClick?: boolean;
                      highlightToday?: boolean;
                      enableCreate?: boolean;
                      enableEdit?: boolean;
                      enableDelete?: boolean;
                    }
                  | undefined,
              }}
            />
          </Suspense>
        ) : (
          <NoticePanel>Calendar component requires schema binding.</NoticePanel>
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
        const chartType = getChartTypeFromComponentType(type);
        if (!chartType) {
          return (
            <NoticePanel tone="error">Invalid chart type: {type}</NoticePanel>
          );
        }
        return dataBinding?.kind === "pipeline" &&
          dataBinding.schemaName &&
          dataBinding.pipelineName ? (
          <Suspense fallback={<LoadingPanel message="Loading chart..." />}>
            <DynamicChart
              config={{
                type: chartType,
                title,
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
          </Suspense>
        ) : (
          <NoticePanel>Chart component requires pipeline binding.</NoticePanel>
        );
      }
      default:
        return (
          <NoticePanel tone="error">
            Unknown component type: <code>{type}</code>
          </NoticePanel>
        );
    }
  },
);

const GridCellView: React.FC<{ cell: GridCell }> = React.memo(({ cell }) => {
  const { row, column, rowSpan = 1, colSpan = 1, components } = cell;
  const sortedComponents = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div
      className="grid-cell"
      style={{
        gridRow: `${row} / span ${rowSpan}`,
        gridColumn: `${column} / span ${colSpan}`,
      }}
    >
      <div className="flex h-full flex-col">
        {sortedComponents.map((component) => (
          <RenderComponent key={component.id} component={component} />
        ))}
      </div>
    </div>
  );
});

const GridSectionView: React.FC<{ grid: GridSection }> = React.memo(
  ({ grid }) => {
    const { columns, gap = 16, cells } = grid;

    if (!cells?.length) {
      return (
        <NoticePanel tone="empty">
          No content configured for this section.
        </NoticePanel>
      );
    }

    return (
      <div
        className="grid-section w-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns || 1}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {cells.map((cell) => (
          <GridCellView key={cell.id} cell={cell} />
        ))}
      </div>
    );
  },
);

const normalizeGrid = (section: PageSection): GridSection | null => {
  if (section.grid) return section.grid;
  if (section.cells) {
    return {
      columns: section.columns || 1,
      gap: section.gap,
      cells: section.cells,
    };
  }
  return null;
};

export const PageSectionView: React.FC<{ section: PageSection }> = ({
  section,
}) => {
  if (section.type === "component" && section.component) {
    return <RenderComponent component={section.component} />;
  }

  if (section.type === "tabs" && section.tabs?.tabs?.length) {
    const tabs: TabContent[] = section.tabs.tabs
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((tab) => ({
        title: tab.label,
        components: tab.sections
          .flatMap((tabSection) => tabSection.component ? [tabSection.component] : [])
          .filter(Boolean),
      }));
    return <MixedTabPanel tabs={tabs} />;
  }

  const grid = normalizeGrid(section);
  if (grid) {
    return <GridSectionView grid={grid} />;
  }

  return (
    <NoticePanel tone="empty">
      No content configured for this section.
    </NoticePanel>
  );
};
