import type { RuntimeValueType } from "../types/page";

export type RuntimeValue<T = unknown> =
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "available"; value: T }>;

export interface RuntimeSnapshot {
  readonly pageFilters: Readonly<Record<string, RuntimeValue>>;
  readonly pageVariables: Readonly<Record<string, RuntimeValue>>;
  readonly components: Readonly<Record<
    string,
    Readonly<{
      outputs: Readonly<Record<string, RuntimeValue>>;
    }>
  >>;
}

export interface ComponentOutputDependency {
  kind: "componentOutput";
  componentId: string;
  outputId: string;
}

export interface PageFilterDependency {
  kind: "pageFilter";
  filterId: string;
}

export type RuntimeDependency = ComponentOutputDependency | PageFilterDependency;

export interface StaticParameterResolver {
  source: "static";
  value: unknown;
  field?: undefined;
}

export interface ComponentOutputParameterResolver {
  source: "componentOutput";
  componentId: string;
  outputId: string;
  valueType: RuntimeValueType;
  allowedFields: Array<"start" | "end" | "preset" | "timezone">;
  field?: "start" | "end" | "preset" | "timezone";
}

export interface PageFilterParameterResolver {
  source: "pageFilter";
  filterId: string;
  valueType: RuntimeValueType;
  arraySerialization?: "comma" | "repeat";
  field?: "value" | "start" | "end" | "preset" | "timezone";
}

export type CompiledParameterResolver =
  | StaticParameterResolver
  | PageFilterParameterResolver
  | ComponentOutputParameterResolver;

export type ParameterCompilationErrorCode =
  | "missing_consumer_component"
  | "missing_referenced_component"
  | "missing_output"
  | "missing_page_filter"
  | "invalid_binding"
  | "invalid_page_structure"
  | "duplicate_component_id"
  | "cyclic_component_reference"
  | "cyclic_page_reference"
  | "invalid_component_outputs"
  | "invalid_output_definition"
  | "duplicate_output_id"
  | "invalid_field"
  | "unsupported_source";

export interface ParameterCompilationError {
  code: ParameterCompilationErrorCode;
  parameter: string | null;
  message: string;
  source?: string;
}

export interface CompiledComponentParameters {
  componentId: string;
  resolvers: Record<string, CompiledParameterResolver>;
  dependencies: RuntimeDependency[];
  errors: ParameterCompilationError[];
}

export type ParameterResolutionErrorCode =
  | ParameterCompilationErrorCode
  | "missing_snapshot_component"
  | "missing_snapshot_output"
  | "runtime_type_mismatch";

export interface ParameterResolutionError {
  code: ParameterResolutionErrorCode;
  parameter: string | null;
  message: string;
}

export interface ParameterResolutionResult {
  values: Record<string, unknown>;
  dependencies: RuntimeDependency[];
  status: "ready" | "waiting" | "error";
  errors: ParameterResolutionError[];
}
