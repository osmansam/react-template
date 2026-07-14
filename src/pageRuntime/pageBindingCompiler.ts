import type { ComponentBlock, PageModel, RuntimeValueType } from "../types/page";
import type {
  CompiledComponentParameters,
  CompiledParameterResolver,
  ParameterCompilationError,
  RuntimeDependency,
} from "./types";

const DATE_RANGE_FIELDS = ["start", "end", "preset", "timezone"] as const;
const RUNTIME_VALUE_TYPES = new Set<RuntimeValueType>([
  "string",
  "number",
  "boolean",
  "date",
  "monthYear",
  "dateRange",
  "stringArray",
  "numberArray",
]);
const KNOWN_SOURCES = new Set([
  "static",
  "pageFilter",
  "pageVariable",
  "componentOutput",
  "system",
  "derived",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createDictionary = <T>(): Record<string, T> =>
  Object.create(null) as Record<string, T>;

const error = (
  code: ParameterCompilationError["code"],
  parameter: string | null,
  message: string,
  source?: string,
): ParameterCompilationError => ({
  code,
  parameter,
  message,
  ...(source === undefined ? {} : { source }),
});

type PageFilterRuntimeDefinition = {
  type: RuntimeValueType;
  arraySerialization?: "comma" | "repeat";
};

const collectPageFilters = (page: PageModel): Map<string, PageFilterRuntimeDefinition> => {
  const result = new Map<string, PageFilterRuntimeDefinition>();
  const seen = new WeakSet<object>();
  let current: PageModel | undefined = page;
  while (current) {
    if (seen.has(current)) return result;
    seen.add(current);
    for (const filter of current.filters ?? []) {
      if (
        isRecord(filter) &&
        typeof filter.id === "string" &&
        RUNTIME_VALUE_TYPES.has(filter.type)
      ) {
        result.set(filter.id, {
          type: filter.type,
          ...(filter.arraySerialization === "repeat"
            ? { arraySerialization: "repeat" as const }
            : filter.type === "stringArray" || filter.type === "numberArray"
              ? { arraySerialization: "comma" as const }
              : {}),
        });
      }
    }
    current = current.subPage;
  }
  return result;
};

interface CollectionContext {
  components: Map<string, ComponentBlock>;
  ambiguousComponentIds: Set<string>;
  errors: ParameterCompilationError[];
  seenComponents: WeakSet<object>;
  activeComponents: WeakSet<object>;
  seenPages: WeakSet<object>;
  activeSectionCollections: WeakSet<object>;
  activeSections: WeakSet<object>;
}

const invalidStructure = (
  context: CollectionContext,
  message: string,
) => {
  context.errors.push(error("invalid_page_structure", null, message));
};

const visitComponent = (
  value: unknown,
  context: CollectionContext,
) => {
  if (!isRecord(value) || typeof value.id !== "string") {
    invalidStructure(context, "A component must be an object with a string ID.");
    return;
  }

  if (context.activeComponents.has(value)) {
    context.errors.push(
      error(
        "cyclic_component_reference",
        null,
        `Component "${value.id}" contains a cyclic child reference.`,
      ),
    );
    return;
  }
  if (context.seenComponents.has(value)) return;
  context.seenComponents.add(value);
  context.activeComponents.add(value);

  const existing = context.components.get(value.id);
  if (existing && (existing as unknown as object) !== value) {
    context.errors.push(
      error(
        "duplicate_component_id",
        null,
        `Component ID "${value.id}" is declared more than once.`,
      ),
    );
    context.components.delete(value.id);
    context.ambiguousComponentIds.add(value.id);
  } else if (!existing && !context.ambiguousComponentIds.has(value.id)) {
    context.components.set(value.id, value as unknown as ComponentBlock);
  }

  if (value.tabs !== undefined) {
    if (!Array.isArray(value.tabs)) {
      invalidStructure(context, `Component "${value.id}" tabs must be an array.`);
    } else {
      value.tabs.forEach((tab) => {
        if (!isRecord(tab) || !Array.isArray(tab.components)) {
          invalidStructure(
            context,
            `Component "${value.id}" tab children must be an array.`,
          );
          return;
        }
        tab.components.forEach((component) => visitComponent(component, context));
      });
    }
  }

  context.activeComponents.delete(value);
};

const visitSections = (
  sections: unknown,
  context: CollectionContext,
) => {
  if (!Array.isArray(sections)) {
    invalidStructure(context, "Page sections must be an array.");
    return;
  }
  if (context.activeSectionCollections.has(sections)) {
    context.errors.push(
      error(
        "cyclic_page_reference",
        null,
        "Page tab sections must not form a cycle.",
      ),
    );
    return;
  }
  context.activeSectionCollections.add(sections);

  sections.forEach((section) => {
    if (!isRecord(section)) {
      invalidStructure(context, "A page section must be an object.");
      return;
    }
    if (context.activeSections.has(section)) {
      context.errors.push(
        error(
          "cyclic_page_reference",
          null,
          "Page section references must not form a cycle.",
        ),
      );
      return;
    }
    context.activeSections.add(section);

    if (section.component !== undefined) {
      visitComponent(section.component, context);
    }

    const gridCells = isRecord(section.grid) ? section.grid.cells : undefined;
    if (section.grid !== undefined && !isRecord(section.grid)) {
      invalidStructure(context, "A section grid must be an object.");
    }
    [gridCells, section.cells].forEach((cells) => {
      if (cells === undefined) return;
      if (!Array.isArray(cells)) {
        invalidStructure(context, "Section cells must be an array.");
        return;
      }
      cells.forEach((cell) => {
        if (!isRecord(cell) || !Array.isArray(cell.components)) {
          invalidStructure(context, "A grid cell must contain a component array.");
          return;
        }
        cell.components.forEach((component) => {
          visitComponent(component, context);
        });
      });
    });

    if (section.tabs !== undefined) {
      if (!isRecord(section.tabs) || !Array.isArray(section.tabs.tabs)) {
        invalidStructure(context, "Section tabs must contain a tabs array.");
      } else {
        section.tabs.tabs.forEach((tab) => {
          if (!isRecord(tab)) {
            invalidStructure(context, "A page tab must be an object.");
            return;
          }
          visitSections(tab.sections, context);
        });
      }
    }
    context.activeSections.delete(section);
  });
  context.activeSectionCollections.delete(sections);
};

const collectComponents = (
  page: PageModel,
): {
  components: Map<string, ComponentBlock>;
  errors: ParameterCompilationError[];
} => {
  const context: CollectionContext = {
    components: new Map(),
    ambiguousComponentIds: new Set(),
    errors: [],
    seenComponents: new WeakSet(),
    activeComponents: new WeakSet(),
    seenPages: new WeakSet(),
    activeSectionCollections: new WeakSet(),
    activeSections: new WeakSet(),
  };
  let currentPage: unknown = page;

  while (currentPage !== undefined && currentPage !== null) {
    if (!isRecord(currentPage)) {
      invalidStructure(context, "A page must be an object.");
      break;
    }
    if (context.seenPages.has(currentPage)) {
      context.errors.push(
        error(
          "cyclic_page_reference",
          null,
          "Page subPage references must not form a cycle.",
        ),
      );
      break;
    }
    context.seenPages.add(currentPage);
    visitSections(currentPage.sections, context);
    currentPage = currentPage.subPage;
  }

  return { components: context.components, errors: context.errors };
};

export const compileComponentParameters = (
  page: PageModel,
  componentId: string,
): CompiledComponentParameters => {
  const result: CompiledComponentParameters = {
    componentId,
    resolvers: createDictionary(),
    dependencies: [],
    errors: [],
  };
  const collected = collectComponents(page);
  const { components } = collected;
  const pageFilters = collectPageFilters(page);
  result.errors.push(...collected.errors);
  const consumer = components.get(componentId);

  if (!consumer) {
    result.errors.push(
      error(
        "missing_consumer_component",
        null,
        `Consumer component "${componentId}" was not found.`,
      ),
    );
    return result;
  }

  const bindings = createDictionary<unknown>();
  Object.entries(consumer.dataBinding?.params ?? {}).forEach(([parameter, value]) => {
    bindings[parameter] = { source: "static", value };
  });
  Object.assign(bindings, consumer.dataBinding?.parameters ?? {});

  const dependencyKeys = new Set<string>();

  Object.keys(bindings)
    .sort()
    .forEach((parameter) => {
    const binding = bindings[parameter];
    if (
      !isRecord(binding) ||
      typeof binding.source !== "string" ||
      !KNOWN_SOURCES.has(binding.source) ||
      (binding.source === "static" &&
        (!Object.hasOwn(binding, "value") || binding.value === undefined)) ||
      (binding.source === "componentOutput" &&
        (typeof binding.componentId !== "string" ||
          typeof binding.outputId !== "string" ||
          (binding.field !== undefined && typeof binding.field !== "string"))) ||
      (binding.source === "pageFilter" &&
        (typeof binding.filterId !== "string" ||
          (binding.field !== undefined && typeof binding.field !== "string")))
    ) {
      result.errors.push(
        error(
          "invalid_binding",
          parameter,
          `Parameter "${parameter}" has an invalid binding definition.`,
        ),
      );
      return;
    }

    if (binding.source === "static") {
      result.resolvers[parameter] = {
        source: "static",
        value: binding.value,
      };
      return;
    }

    if (binding.source === "pageFilter") {
      const filterId = binding.filterId as string;
      const filterDefinition = pageFilters.get(filterId);
      if (!filterDefinition) {
        result.errors.push(
          error(
            "missing_page_filter",
            parameter,
            `Page filter "${filterId}" was not found.`,
            binding.source,
          ),
        );
        return;
      }
      const valueType = filterDefinition.type;
      const field = binding.field as string | undefined;
      const allowedFields =
        valueType === "dateRange"
          ? [...DATE_RANGE_FIELDS, "value"]
          : valueType === "monthYear"
            ? ["value", "month", "year"]
            : ["value"];
      if (
        field !== undefined &&
        !allowedFields.includes(field as (typeof allowedFields)[number])
      ) {
        result.errors.push(
          error(
            "invalid_field",
            parameter,
            `Field "${field}" is not valid for page filter type "${valueType}".`,
          ),
        );
        return;
      }
      result.resolvers[parameter] = {
        source: "pageFilter",
        filterId,
        valueType,
        ...(filterDefinition.arraySerialization === undefined
          ? {}
          : { arraySerialization: filterDefinition.arraySerialization }),
        ...(field === undefined
          ? {}
          : {
              field: field as "value" | "month" | "year" | "start" | "end" | "preset" | "timezone",
            }),
      } satisfies CompiledParameterResolver;
      const dependencyKey = `pageFilter:${filterId}`;
      if (!dependencyKeys.has(dependencyKey)) {
        dependencyKeys.add(dependencyKey);
        result.dependencies.push({ kind: "pageFilter", filterId });
      }
      return;
    }

    if (binding.source !== "componentOutput") {
      result.errors.push(
        error(
          "unsupported_source",
          parameter,
          `Parameter source "${binding.source}" is not supported yet.`,
          binding.source,
        ),
      );
      return;
    }

    const componentId = binding.componentId as string;
    const outputId = binding.outputId as string;
    const producer = components.get(componentId);
    if (!producer) {
      result.errors.push(
        error(
          "missing_referenced_component",
          parameter,
          `Referenced component "${componentId}" was not found.`,
        ),
      );
      return;
    }

    if (producer.outputs !== undefined && !Array.isArray(producer.outputs)) {
      result.errors.push(
        error(
          "invalid_component_outputs",
          parameter,
          `Component "${componentId}" outputs must be an array.`,
        ),
      );
      return;
    }

    const outputs = producer.outputs ?? [];
    const malformedOutput = outputs.some(
      (candidate) =>
        !isRecord(candidate) ||
        typeof candidate.id !== "string" ||
        typeof candidate.type !== "string" ||
        !RUNTIME_VALUE_TYPES.has(candidate.type as RuntimeValueType),
    );
    if (malformedOutput) {
      result.errors.push(
        error(
          "invalid_output_definition",
          parameter,
          `Component "${componentId}" has a malformed output definition.`,
        ),
      );
      return;
    }

    const outputIds = new Set<string>();
    const duplicateOutputId = outputs.find((candidate) => {
      if (outputIds.has(candidate.id)) return true;
      outputIds.add(candidate.id);
      return false;
    })?.id;
    if (duplicateOutputId !== undefined) {
      result.errors.push(
        error(
          "duplicate_output_id",
          parameter,
          `Output ID "${duplicateOutputId}" is declared more than once on component "${componentId}".`,
        ),
      );
      return;
    }

    const output = outputs.find((candidate) => candidate.id === outputId);
    if (!output) {
      result.errors.push(
        error(
          "missing_output",
          parameter,
          `Output "${outputId}" was not found on component "${componentId}".`,
        ),
      );
      return;
    }

    const field = binding.field as string | undefined;
    const allowedFields =
      output.type === "dateRange" ? [...DATE_RANGE_FIELDS] : [];
    if (
      field !== undefined &&
      !allowedFields.includes(field as (typeof DATE_RANGE_FIELDS)[number])
    ) {
      result.errors.push(
        error(
          "invalid_field",
          parameter,
          `Field "${field}" is not valid for output type "${output.type}".`,
        ),
      );
      return;
    }

    result.resolvers[parameter] = {
      source: "componentOutput",
      componentId,
      outputId,
      valueType: output.type,
      allowedFields,
      ...(field === undefined
        ? {}
        : {
            field: field as (typeof DATE_RANGE_FIELDS)[number],
          }),
    } satisfies CompiledParameterResolver;

    const dependency: RuntimeDependency = {
      kind: "componentOutput",
      componentId,
      outputId,
    };
    const dependencyKey = `${dependency.componentId}\0${dependency.outputId}`;
    if (!dependencyKeys.has(dependencyKey)) {
      dependencyKeys.add(dependencyKey);
      result.dependencies.push(dependency);
    }
    });

  const dependencySortKey = (dependency: RuntimeDependency): string =>
    dependency.kind === "pageFilter"
      ? `${dependency.kind}\0${dependency.filterId}`
      : `${dependency.kind}\0${dependency.componentId}\0${dependency.outputId}`;

  result.dependencies.sort((left, right) => {
    const leftKey = dependencySortKey(left);
    const rightKey = dependencySortKey(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  return result;
};
