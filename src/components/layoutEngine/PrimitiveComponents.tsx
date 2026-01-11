import React from "react";
import { ComponentBlock, DataBinding } from "../../types/layout";
import DynamicChart, { ChartType } from "../charts/DynamicChart";

/**
 * Primitive Component Props Interface
 */
interface PrimitiveComponentProps {
  title?: string;
  binding?: DataBinding;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Map component type to chart type for DynamicChart
 */
const componentTypeToChartType = (componentType: string): ChartType | null => {
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
 * TableView - Renders table components
 */
export const TableView: React.FC<PrimitiveComponentProps> = ({
  title,
  binding,
}) => {
  return (
    <div className="primitive-component table-view bg-white rounded-lg shadow p-4">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="border rounded p-4">
        <p className="text-gray-600 text-sm mb-2">Table Component</p>
        {binding && (
          <div className="text-xs text-gray-500">
            <p>Binding: {binding.kind}</p>
            {binding.schemaName && <p>Schema: {binding.schemaName}</p>}
            {binding.pipelineName && <p>Pipeline: {binding.pipelineName}</p>}
            {binding.apiEndpoint && <p>API: {binding.apiEndpoint}</p>}
          </div>
        )}
        <div className="mt-2 text-sm text-gray-400">
          {/* Table implementation will go here */}
          Table data will be rendered here based on the data binding
          configuration.
        </div>
      </div>
    </div>
  );
};

/**
 * ChartView - Renders chart components using DynamicChart
 */
export const ChartView: React.FC<
  PrimitiveComponentProps & { chartType?: ChartType }
> = ({ title, binding, chartType, ...rest }) => {
  if (!chartType) {
    return (
      <div className="primitive-component chart-view bg-white rounded-lg shadow p-4">
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <div className="border rounded p-4 h-64 flex items-center justify-center bg-gray-50">
          <div className="text-center text-red-500">
            <p className="text-sm">Invalid chart type</p>
          </div>
        </div>
      </div>
    );
  }

  // Extract ALL params from dataBinding and use them as chart options
  // Since the pipeline doesn't need params, everything in params is for chart config
  const chartParams = (binding?.params || {}) as Record<string, any>;

  // Remove params from dataBinding since they're chart config, not pipeline params
  const updatedBinding = binding
    ? {
        kind: binding.kind,
        schemaName: binding.schemaName,
        pipelineName: binding.pipelineName,
        // No params for pipeline
      }
    : undefined;

  // ALL params go to chartOptions
  const finalChartOptions = { ...chartParams, ...rest };

  return (
    <div className="primitive-component chart-view bg-white rounded-lg shadow p-4">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-96">
        <DynamicChart
          config={{
            type: chartType,
            title,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dataBinding: updatedBinding as any,
            chartOptions: finalChartOptions,
          }}
        />
      </div>
    </div>
  );
};

/**
 * FormView - Renders form components
 */
export const FormView: React.FC<PrimitiveComponentProps> = ({
  title,
  binding,
}) => {
  return (
    <div className="primitive-component form-view bg-white rounded-lg shadow p-4">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="border rounded p-4">
        <p className="text-gray-600 text-sm mb-2">Form Component</p>
        {binding && (
          <div className="text-xs text-gray-500 mb-4">
            <p>Binding: {binding.kind}</p>
            {binding.schemaName && <p>Schema: {binding.schemaName}</p>}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sample Input Field
            </label>
            <input
              type="text"
              placeholder="Form inputs will be generated dynamically"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
          </div>
          <div className="text-sm text-gray-400">
            Dynamic form fields will be rendered here based on schema.
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TextBlock - Renders text/content blocks
 */
export const TextBlock: React.FC<PrimitiveComponentProps> = ({
  title,
  content,
}) => {
  return (
    <div className="primitive-component text-block bg-white rounded-lg shadow p-4">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="prose max-w-none">
        {content ? (
          <div>{content}</div>
        ) : (
          <p className="text-gray-600">
            Text content will be displayed here. Supports markdown and rich text
            formatting.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * KPIBlock - Renders KPI/metrics components
 */
export const KPIBlock: React.FC<PrimitiveComponentProps> = ({
  title,
  binding,
  value,
  unit,
  trend,
}) => {
  return (
    <div className="primitive-component kpi-block bg-white rounded-lg shadow p-4">
      {title && (
        <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      )}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{value || "---"}</p>
          {unit && <p className="text-sm text-gray-500 mt-1">{unit}</p>}
        </div>
        {trend && (
          <div
            className={`text-sm font-medium ${
              trend > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      {binding && (
        <div className="mt-2 text-xs text-gray-400">
          Data from: {binding.kind}
          {binding.pipelineName && ` (${binding.pipelineName})`}
        </div>
      )}
    </div>
  );
};

/**
 * CustomComponent - Renders custom components
 */
export const CustomComponent: React.FC<PrimitiveComponentProps> = ({
  title,
  componentType,
}) => {
  return (
    <div className="primitive-component custom-component bg-white rounded-lg shadow p-4">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="border-2 border-dashed border-gray-300 rounded p-6 text-center">
        <p className="text-gray-600 text-sm mb-2">Custom Component</p>
        {componentType && (
          <p className="text-xs text-gray-500 mb-2">Type: {componentType}</p>
        )}
        <p className="text-sm text-gray-400">
          Custom component implementation will be loaded here based on the
          componentType.
        </p>
      </div>
    </div>
  );
};

/**
 * RenderComponent - Central component renderer
 *
 * This is the main switch that determines which primitive component to render
 * based on the ComponentBlock type.
 */
export const RenderComponent: React.FC<{ block: ComponentBlock }> = ({
  block,
}) => {
  const { type, title, dataBinding, props = {} } = block;

  // Check if this is a chart type (barChart, lineChart, etc.)
  const chartType = componentTypeToChartType(type);
  if (chartType) {
    return (
      <ChartView
        title={title}
        binding={dataBinding}
        chartType={chartType}
        {...props}
      />
    );
  }

  switch (type) {
    case "table":
      return <TableView title={title} binding={dataBinding} {...props} />;

    case "chart":
      return <ChartView title={title} binding={dataBinding} {...props} />;

    case "form":
      return <FormView title={title} binding={dataBinding} {...props} />;

    case "text":
      return <TextBlock title={title} {...props} />;

    case "kpi":
      return <KPIBlock title={title} binding={dataBinding} {...props} />;

    case "custom":
      return <CustomComponent title={title} {...props} />;

    default:
      console.warn(`Unknown component type: ${type}`);
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-yellow-800 text-sm">
            Unknown component type: <code>{type}</code>
          </p>
        </div>
      );
  }
};
