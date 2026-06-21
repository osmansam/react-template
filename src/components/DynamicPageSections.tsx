import React, { lazy, Suspense, useMemo, useState } from "react";
import {
  ComponentBlock,
  DistributionBlocksConfig,
  GridCell,
  GridSection,
  InfoBlocksConfig,
  PageSection,
  TabContent,
  TableComponentConfig,
} from "../types/page";
import { useGetSelection } from "../utils/dynamic";
import { resolveRouteParamValue, RouteParams } from "../utils/routeParams";
import type { ChartType } from "./charts/DynamicChart";
import GenericPaginatedPage from "./panelComponents/FormElements/GenericPaginatedPage";
import GenericTabPage from "./panelComponents/FormElements/GenericTabPage";
import DistributionBlocks from "./panelComponents/FormElements/DistributionBlocks";
import InfoBlocks from "./panelComponents/FormElements/InfoBlocks";
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
    props?.title,
  ].some(Boolean)
    ? (props as TableComponentConfig)
    : undefined);

const MixedTabPanel: React.FC<{
  tabs: TabContent[];
  routeParams: RouteParams;
}> = ({ tabs, routeParams }) => {
  const [activeTab, setActiveTab] = useState(0);

  const unifiedTabs = useMemo(
    () =>
      tabs.map((tab: TabContent, idx: number) => ({
        number: idx,
        label: tab.title,
        isDisabled: false,
        content: (
          <div className="flex flex-col gap-4">
            {tab.components.map((comp) => (
              <RenderComponent
                key={comp.id}
                component={comp}
                routeParams={routeParams}
              />
            ))}
          </div>
        ),
      })),
    [routeParams, tabs],
  );

  return (
    <UnifiedTabPanel
      tabs={unifiedTabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      allowOrientationToggle={true}
    />
  );
};

const RenderComponent: React.FC<{
  component: ComponentBlock;
  routeParams: RouteParams;
}> = React.memo(({ component, routeParams }) => {
  const { type, dataBinding, tabs, groupBy, title, props } = component;
  const resolvedDataBinding = useMemo(
    () => resolveRouteParamValue(dataBinding, routeParams),
    [dataBinding, routeParams],
  );
  const tableConfig = getTableConfig(component.table, props);
  const firstTableTabIndex =
    tabs?.findIndex((tab) => tab.components[0]?.type === "table") ?? -1;
  const tabWithGroupByIndex =
    tabs?.findIndex((tab) => tab.components[0]?.groupBy) ?? -1;
  const tabPanelGroupBy =
    groupBy ||
    (tabWithGroupByIndex >= 0
      ? tabs![tabWithGroupByIndex]?.components[0]?.groupBy
      : undefined);
  const tabPanelTemplateTabIndex =
    tabWithGroupByIndex >= 0
      ? tabWithGroupByIndex
      : tabPanelGroupBy
        ? firstTableTabIndex
        : -1;
  const templateComponent =
    tabPanelTemplateTabIndex >= 0
      ? tabs?.[tabPanelTemplateTabIndex]?.components[0]
      : undefined;
  const templateSchemaName =
    templateComponent?.dataBinding?.schemaName ||
    resolvedDataBinding?.schemaName ||
    "";
  const groupByGroupedSchema =
    tabPanelGroupBy?.groupedSchemaName || templateSchemaName;
  const groupByGroupedField =
    tabPanelGroupBy?.groupedField ||
    tabPanelGroupBy?.filterField ||
    tabPanelGroupBy?.groupByObjectId ||
    "";
  const groupBySourceSchema =
    tabPanelGroupBy?.sourceSchemaName || tabPanelGroupBy?.groupByObjectId || "";
  const groupByValueField = tabPanelGroupBy?.sourceValueField || "_id";
  const groupByLabelField =
    tabPanelGroupBy?.sourceLabelField ||
    tabPanelGroupBy?.groupByField ||
    groupByValueField;
  const shouldFetchGrouping =
    type === "tabPanel" &&
    Boolean(groupByGroupedSchema) &&
    Boolean(groupByGroupedField) &&
    Boolean(groupBySourceSchema) &&
    Boolean(groupByLabelField) &&
    Boolean(templateSchemaName);
  const selectionData = useGetSelection<Array<Record<string, unknown>>>(
    shouldFetchGrouping ? groupBySourceSchema : "",
    shouldFetchGrouping ? groupByLabelField : "",
    shouldFetchGrouping ? groupByValueField : "",
  );

  switch (type) {
    case "table":
      return resolvedDataBinding?.schemaName &&
        ["schema", "pipeline", "workflow"].includes(
          resolvedDataBinding.kind,
        ) ? (
        <GenericPaginatedPage
          schemaName={resolvedDataBinding.schemaName}
          isHeader={false}
          customTitle={title}
          tableConfig={tableConfig}
          dataBinding={resolvedDataBinding}
          actionsEnabled={resolvedDataBinding.kind === "schema"}
        />
      ) : (
        <NoticePanel>
          Table component requires schema, pipeline, or workflow binding.
        </NoticePanel>
      );
    case "tabPanel":
      if (shouldFetchGrouping) {
        if (!selectionData || selectionData.length === 0) {
          return <LoadingPanel message="Loading grouped tabs..." />;
        }

        const baseComponent =
          templateComponent ||
          ({
            dataBinding,
            table: component.table,
            props,
          } as ComponentBlock);
        if (!baseComponent?.dataBinding?.schemaName) {
          return (
            <NoticePanel>
              Tab panel grouping requires a grouped schema binding.
            </NoticePanel>
          );
        }

        const dynamicTabs = selectionData.map((item) => {
          const groupValue = item[groupByValueField] ?? item._id;
          const resolvedBaseBinding = resolveRouteParamValue(
            baseComponent.dataBinding,
            routeParams,
          );
          return {
            schemaName: resolvedBaseBinding!.schemaName!,
            label: String(item[groupByLabelField] ?? groupValue),
            customTitle: baseComponent.title,
            isPaginated: true,
            constantFilter: {
              [groupByGroupedField]: groupValue,
            },
            dataBinding: resolvedBaseBinding,
            tableConfig: getTableConfig(
              baseComponent.table,
              baseComponent.props,
            ),
          };
        });

        const manualTabs = (tabs || []).map((tab: TabContent) => {
          const tabComponent = tab.components[0];
          const tabBinding = resolveRouteParamValue(
            tabComponent?.dataBinding,
            routeParams,
          );
          return {
            schemaName: tabBinding?.schemaName || "",
            label: tab.title,
            customTitle: tabComponent?.title || tab.title,
            isPaginated: true,
            dataBinding: tabBinding,
            tableConfig: getTableConfig(
              tabComponent?.table,
              tabComponent?.props,
            ),
          };
        });
        const allTabsConfig = [...dynamicTabs, ...manualTabs];

        return <GenericTabPage tabs={allTabsConfig} />;
      }

      if (tabs && Array.isArray(tabs) && tabs.length > 0) {
        const allTabsAreTables = tabs.every(
          (tab) =>
            tab.components.length === 1 && tab.components[0]?.type === "table",
        );

        if (allTabsAreTables) {
          return (
            <GenericTabPage
              tabs={tabs.map((tab) => {
                const tabComponent = tab.components[0];
                const tabBinding = resolveRouteParamValue(
                  tabComponent?.dataBinding,
                  routeParams,
                );
                return {
                  schemaName: tabBinding?.schemaName || "",
                  label: tab.title,
                  customTitle: tabComponent?.title || tab.title,
                  isPaginated: true,
                  dataBinding: tabBinding,
                  tableConfig: getTableConfig(
                    tabComponent?.table,
                    tabComponent?.props,
                  ),
                };
              })}
            />
          );
        }

        return <MixedTabPanel tabs={tabs} routeParams={routeParams} />;
      }

      return (
        <NoticePanel>
          Tab panel component requires tabs configuration.
        </NoticePanel>
      );
    case "calendar":
      return resolvedDataBinding?.kind === "schema" &&
        resolvedDataBinding.schemaName ? (
        <Suspense fallback={<LoadingPanel message="Loading calendar..." />}>
          <DynamicCalendar
            config={{
              title,
              height: props?.height as number | undefined,
              width: props?.width as string | undefined,
              schemaName: resolvedDataBinding.schemaName,
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
    case "infoBlocks":
      return (
        <InfoBlocks
          config={props?.infoBlocks as InfoBlocksConfig | undefined}
          dataBinding={resolvedDataBinding}
        />
      );
    case "distributionBlocks":
      return (
        <DistributionBlocks
          title={title}
          config={
            props?.distributionBlocks as DistributionBlocksConfig | undefined
          }
          dataBinding={resolvedDataBinding}
        />
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
      return resolvedDataBinding?.kind === "pipeline" &&
        resolvedDataBinding.schemaName &&
        resolvedDataBinding.pipelineName ? (
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
                schemaName: resolvedDataBinding.schemaName,
                pipelineName: resolvedDataBinding.pipelineName,
                params: resolvedDataBinding.params,
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
});

const GridCellView: React.FC<{
  cell: GridCell;
  routeParams: RouteParams;
}> = React.memo(({ cell, routeParams }) => {
  const { row, column, rowSpan = 1, colSpan = 1, components } = cell;
  const sortedComponents = [...components].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

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
          <RenderComponent
            key={component.id}
            component={component}
            routeParams={routeParams}
          />
        ))}
      </div>
    </div>
  );
});

const GridSectionView: React.FC<{
  grid: GridSection;
  routeParams: RouteParams;
}> = React.memo(({ grid, routeParams }) => {
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
        <GridCellView key={cell.id} cell={cell} routeParams={routeParams} />
      ))}
    </div>
  );
});

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

export const PageSectionView: React.FC<{
  section: PageSection;
  routeParams: RouteParams;
}> = ({ section, routeParams }) => {
  if (section.type === "component" && section.component) {
    return (
      <RenderComponent
        component={section.component}
        routeParams={routeParams}
      />
    );
  }

  if (section.type === "tabs" && section.tabs?.tabs?.length) {
    const tabs: TabContent[] = section.tabs.tabs
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((tab) => ({
        title: tab.label,
        components: tab.sections
          .flatMap((tabSection) =>
            tabSection.component ? [tabSection.component] : [],
          )
          .filter(Boolean),
      }));
    return <MixedTabPanel tabs={tabs} routeParams={routeParams} />;
  }

  const grid = normalizeGrid(section);
  if (grid) {
    return <GridSectionView grid={grid} routeParams={routeParams} />;
  }

  return (
    <NoticePanel tone="empty">
      No content configured for this section.
    </NoticePanel>
  );
};
