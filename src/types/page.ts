/**
 * Types matching the Go backend PageModel structure
 */

export type BindingKind = "schema" | "pipeline" | "api" | "function";

export interface DataBinding {
  kind: BindingKind;
  schemaName?: string;
  pipelineName?: string;
  apiName?: string;
  functionName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>;
}

export interface GroupBy {
  groupByObjectId: string; // Schema name to group by (e.g., "can")
  groupByField: string; // Field name to display from grouped object (e.g., "name")
}

export type ComponentType =
  | "table"
  | "tabPanel"
  | "calendar" // Dynamic Calendar Component
  // Chart types
  | "barChart"
  | "lineChart"
  | "pieChart"
  | "areaChart"
  | "radarChart"
  | "heatmapChart"
  | "scatterChart"
  | "funnelChart"
  | "sankeyChart"
  | "sunburstChart"
  | "treemapChart"
  | "calendarChart"
  | "bumpChart"
  | "streamChart"
  | "waffleChart"
  | "circlePackingChart";
// Future types: "form" | "text" | "custom"

export interface TabContent {
  title: string;
  components: ComponentBlock[];
}

export interface ComponentBlock {
  id: string;
  type: ComponentType;
  title?: string;
  order: number;
  dataBinding?: DataBinding;
  groupBy?: GroupBy; // Grouping configuration for table components
  isAuthorized?: boolean;
  authorizeRole?: string[];
  tabs?: TabContent[]; // For tabPanel type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
}

export interface GridCell {
  id: string;
  row: number;
  column: number;
  rowSpan?: number;
  colSpan?: number;
  components: ComponentBlock[];
}

export interface GridSection {
  columns: number;
  gap?: number;
  cells: GridCell[];
}

export interface PageTab {
  id: string;
  label: string;
  icon?: string;
  order: number;
  sections: PageSection[];
}

export interface TabsSection {
  tabs: PageTab[];
}

export type SectionType = "grid" | "tabs" | "component";

export interface PageSection {
  id?: string;
  type?: SectionType;
  order?: number;
  grid?: GridSection;
  tabs?: TabsSection;
  component?: ComponentBlock;
  columns?: number;
  gap?: number;
  cells?: GridCell[];
}

export interface PageModel {
  id?: string;
  name: string;
  icon?: string;
  slug?: string;
  order?: number;
  isGroupOnly?: boolean;
  isAuthenticated?: boolean;
  isAuthorized?: boolean;
  authorizeRole?: string[];
  sections: PageSection[]; // Matches Go backend Section model; flat grid sections are still accepted.
  subPage?: PageModel; // Nested sub-page
}
