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

export type ComponentType = "table" | "tabPanel";
// Future types: "chart" | "form" | "text" | "custom"

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
  sections: GridSection[]; // Array of grid sections directly
  subPage?: PageModel; // Nested sub-page
}
