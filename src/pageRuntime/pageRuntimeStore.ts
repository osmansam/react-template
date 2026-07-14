import type {
  ComponentBlock,
  ComponentOutputDefinition,
  PageModel,
  RuntimeValueType,
} from "../types/page";
import { matchesRuntimeValueType } from "./pageParameterResolver";
import type { RuntimeSnapshot, RuntimeValue } from "./types";

export interface PageRuntimeStore {
  getSnapshot(): RuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  setPageFilterValue(filterId: string, value: unknown): void;
  publishOutput(
    publisherComponentId: string,
    ownerComponentId: string,
    outputId: string,
    value: unknown,
  ): void;
  markOutputUnavailable(
    publisherComponentId: string,
    ownerComponentId: string,
    outputId: string,
  ): void;
}

const dictionary = <T>(): Record<string, T> =>
  Object.create(null) as Record<string, T>;

const cloneDictionary = <T>(
  source: Readonly<Record<string, T>>,
): Record<string, T> => {
  const result = dictionary<T>();
  Object.keys(source).forEach((key) => {
    result[key] = source[key];
  });
  return result;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const unavailableValue: RuntimeValue = Object.freeze({
  status: "unavailable",
});

const utcDateFromLocalParts = (
  date: Date,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
): Date =>
  new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      seconds,
      milliseconds,
    ),
  );

const startOfCalendarDay = (date: Date): Date =>
  utcDateFromLocalParts(date, 0, 0, 0, 0);

const endOfCalendarDay = (date: Date): Date =>
  utcDateFromLocalParts(date, 23, 59, 59, 999);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfLocalWeek = (date: Date): Date => {
  const start = startOfCalendarDay(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(start, mondayOffset);
};

const resolveDatePreset = (preset: string, now = new Date()): string | null => {
  if (preset === "today") return startOfCalendarDay(now).toISOString();
  if (preset === "yesterday") return startOfCalendarDay(addDays(now, -1)).toISOString();
  if (preset === "tomorrow") return startOfCalendarDay(addDays(now, 1)).toISOString();
  return null;
};

const resolveDateRangePreset = (
  preset: string,
  now = new Date(),
): { start: string; end: string } | null => {
  if (preset === "today") {
    return {
      start: startOfCalendarDay(now).toISOString(),
      end: endOfCalendarDay(now).toISOString(),
    };
  }
  if (preset === "yesterday") {
    const date = addDays(now, -1);
    return {
      start: startOfCalendarDay(date).toISOString(),
      end: endOfCalendarDay(date).toISOString(),
    };
  }
  const weekStart = startOfLocalWeek(now);
  if (preset === "thisWeek") {
    return {
      start: weekStart.toISOString(),
      end: endOfCalendarDay(addDays(weekStart, 6)).toISOString(),
    };
  }
  if (preset === "lastWeek") {
    const start = addDays(weekStart, -7);
    return {
      start: start.toISOString(),
      end: endOfCalendarDay(addDays(start, 6)).toISOString(),
    };
  }
  if (preset === "thisMonth") {
    return {
      start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)).toISOString(),
      end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)).toISOString(),
    };
  }
  if (preset === "lastMonth") {
    return {
      start: new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)).toISOString(),
      end: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)).toISOString(),
    };
  }
  if (preset === "thisYear") {
    return {
      start: new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0)).toISOString(),
      end: new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999)).toISOString(),
    };
  }
  if (preset === "lastYear") {
    return {
      start: new Date(Date.UTC(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)).toISOString(),
      end: new Date(Date.UTC(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)).toISOString(),
    };
  }
  return null;
};

const resolveMonthYearPreset = (preset: string): string | null => {
  if (preset !== "currentMonthYear") return null;
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
};

const resolveDefaultPreset = (
  type: RuntimeValueType,
  preset: unknown,
): unknown => {
  if (typeof preset !== "string") return undefined;
  if (type === "date") return resolveDatePreset(preset) ?? undefined;
  if (type === "monthYear") return resolveMonthYearPreset(preset) ?? undefined;
  if (type === "dateRange") return resolveDateRangePreset(preset) ?? undefined;
  return undefined;
};

const cloneAndFreezeValue = (
  value: unknown,
  type: RuntimeValueType,
): unknown => {
  if (value === null) return null;
  if (type === "stringArray" || type === "numberArray") {
    return Object.freeze([...(value as unknown[])]);
  }
  if (type === "dateRange") {
    const range = value as Record<string, unknown>;
    return Object.freeze({
      start: range.start,
      end: range.end,
      ...(range.preset === undefined ? {} : { preset: range.preset }),
      ...(range.timezone === undefined ? {} : { timezone: range.timezone }),
    });
  }
  return value;
};

const availableValue = (
  value: unknown,
  type: RuntimeValueType,
): RuntimeValue =>
  Object.freeze({
    status: "available" as const,
    value: cloneAndFreezeValue(value, type),
  });

const sameRuntimeValue = (
  previous: unknown,
  next: unknown,
  type: RuntimeValueType,
): boolean => {
  if (Object.is(previous, next)) return true;
  if (
    (type === "stringArray" || type === "numberArray") &&
    Array.isArray(previous) &&
    Array.isArray(next)
  ) {
    return (
      previous.length === next.length &&
      previous.every((item, index) => Object.is(item, next[index]))
    );
  }
  if (type === "dateRange" && isRecord(previous) && isRecord(next)) {
    return (
      previous.start === next.start &&
      previous.end === next.end &&
      previous.preset === next.preset &&
      previous.timezone === next.timezone
    );
  }
  return false;
};

interface CollectedComponent {
  component: ComponentBlock;
  outputs: Map<string, ComponentOutputDefinition>;
}

const validateOutput = (
  component: ComponentBlock,
  candidate: unknown,
): ComponentOutputDefinition => {
  if (
    !isRecord(candidate) ||
    typeof candidate.id !== "string" ||
    candidate.id.length === 0 ||
    typeof candidate.key !== "string" ||
    typeof candidate.type !== "string" ||
    !["string", "number", "boolean", "date", "monthYear", "dateRange", "stringArray", "numberArray"].includes(
      candidate.type,
    ) ||
    !isRecord(candidate.source) ||
    typeof candidate.source.kind !== "string"
  ) {
    throw new Error(`Component "${component.id}" has a malformed output definition.`);
  }
  if (component.type !== "table") {
    throw new Error(
      `Output "${candidate.id}" can only be declared by a table component.`,
    );
  }
  const source = candidate.source;
  if (
    !["tableFilter", "tableSelectedIds", "tableSearch"].includes(
      source.kind as string,
    ) ||
    (source.kind === "tableFilter" &&
      (typeof source.filterId !== "string" || source.filterId.length === 0))
  ) {
    throw new Error(`Output "${candidate.id}" has an invalid source definition.`);
  }
  if (source.kind === "tableSearch" && candidate.type !== "string") {
    throw new Error(`A tableSearch output must have type "string".`);
  }
  if (
    source.kind === "tableSelectedIds" &&
    candidate.type !== "stringArray" &&
    candidate.type !== "numberArray"
  ) {
    throw new Error(`A tableSelectedIds output must have an array type.`);
  }
  return candidate as unknown as ComponentOutputDefinition;
};

const collectComponents = (page: PageModel): Map<string, CollectedComponent> => {
  const result = new Map<string, CollectedComponent>();
  const seenComponents = new WeakSet<object>();
  const activeComponents = new WeakSet<object>();
  const seenPages = new WeakSet<object>();
  const activeSections = new WeakSet<object>();

  const visitComponent = (value: unknown): void => {
    if (!isRecord(value) || typeof value.id !== "string" || value.id.length === 0) {
      throw new Error("A malformed component must have a non-empty string ID.");
    }
    if (activeComponents.has(value)) {
      throw new Error(`Component "${value.id}" contains a cycle.`);
    }
    if (seenComponents.has(value)) return;
    seenComponents.add(value);
    activeComponents.add(value);
    if (result.has(value.id)) {
      throw new Error(`Component ID "${value.id}" is a duplicate.`);
    }
    const component = value as unknown as ComponentBlock;
    if (component.outputs !== undefined && !Array.isArray(component.outputs)) {
      throw new Error(`Component "${component.id}" outputs must be an array.`);
    }
    const outputs = new Map<string, ComponentOutputDefinition>();
    (component.outputs ?? []).forEach((candidate) => {
      const definition = validateOutput(component, candidate);
      if (outputs.has(definition.id)) {
        throw new Error(
          `Output ID "${definition.id}" is a duplicate on component "${component.id}".`,
        );
      }
      outputs.set(definition.id, definition);
    });
    result.set(component.id, { component, outputs });

    if (value.tabs !== undefined) {
      if (!Array.isArray(value.tabs)) {
        throw new Error(`Component "${value.id}" tabs are malformed.`);
      }
      value.tabs.forEach((tab) => {
        if (!isRecord(tab) || !Array.isArray(tab.components)) {
          throw new Error(`Component "${value.id}" tab children are malformed.`);
        }
        tab.components.forEach(visitComponent);
      });
    }
    activeComponents.delete(value);
  };

  const visitSections = (value: unknown): void => {
    if (!Array.isArray(value)) throw new Error("Page sections are malformed.");
    if (activeSections.has(value)) throw new Error("Page sections contain a cycle.");
    activeSections.add(value);
    value.forEach((section) => {
      if (!isRecord(section)) throw new Error("A page section is malformed.");
      if (section.component !== undefined) visitComponent(section.component);
      const cellCollections: unknown[] = [];
      if (section.grid !== undefined) {
        if (!isRecord(section.grid)) throw new Error("A section grid is malformed.");
        cellCollections.push(section.grid.cells);
      }
      if (section.cells !== undefined) cellCollections.push(section.cells);
      cellCollections.forEach((cells) => {
        if (!Array.isArray(cells)) throw new Error("Section cells are malformed.");
        cells.forEach((cell) => {
          if (!isRecord(cell) || !Array.isArray(cell.components)) {
            throw new Error("A grid cell is malformed.");
          }
          cell.components.forEach(visitComponent);
        });
      });
      if (section.tabs !== undefined) {
        if (!isRecord(section.tabs) || !Array.isArray(section.tabs.tabs)) {
          throw new Error("Section tabs are malformed.");
        }
        section.tabs.tabs.forEach((tab) => {
          if (!isRecord(tab)) throw new Error("A page tab is malformed.");
          visitSections(tab.sections);
        });
      }
    });
    activeSections.delete(value);
  };

  let current: unknown = page;
  while (current !== undefined && current !== null) {
    if (!isRecord(current)) throw new Error("A page is malformed.");
    if (seenPages.has(current)) throw new Error("Page subPage contains a cycle.");
    seenPages.add(current);
    visitSections(current.sections);
    current = current.subPage;
  }
  return result;
};

export const createPageRuntimeStore = (page: PageModel): PageRuntimeStore => {
  const definitions = collectComponents(page);
  const pageFilterTypes = dictionary<RuntimeValueType>();
  const pageFilters = dictionary<RuntimeValue>();
  (page.filters ?? []).forEach((filter) => {
    if (
      !isRecord(filter) ||
      typeof filter.id !== "string" ||
      filter.id.length === 0 ||
      Object.hasOwn(pageFilters, filter.id)
    ) {
      throw new Error("Page filters contain a malformed or duplicate ID.");
    }
    if (
      !["string", "number", "boolean", "date", "monthYear", "dateRange", "stringArray", "numberArray"].includes(
        filter.type,
      )
    ) {
      throw new Error(`Page filter "${filter.id}" has an invalid type.`);
    }
    pageFilterTypes[filter.id] = filter.type;
    const presetValue = resolveDefaultPreset(filter.type, filter.defaultPreset);
    if (presetValue !== undefined) {
      pageFilters[filter.id] = availableValue(presetValue, filter.type);
    } else if (Object.hasOwn(filter, "defaultValue")) {
      if (!matchesRuntimeValueType(filter.defaultValue, filter.type)) {
        throw new Error(
          `Default value for page filter "${filter.id}" does not match type "${filter.type}".`,
        );
      }
      pageFilters[filter.id] = availableValue(filter.defaultValue, filter.type);
    } else {
      pageFilters[filter.id] = unavailableValue;
    }
  });
  const pageVariables = dictionary<RuntimeValue>();
  (page.variables ?? []).forEach((variable) => {
    if (
      !isRecord(variable) ||
      typeof variable.id !== "string" ||
      variable.id.length === 0 ||
      Object.hasOwn(pageVariables, variable.id)
    ) {
      throw new Error("Page variables contain a malformed or duplicate ID.");
    }
    if (Object.hasOwn(variable, "initialValue")) {
      if (!matchesRuntimeValueType(variable.initialValue, variable.type)) {
        throw new Error(
          `Initial value for variable "${variable.id}" does not match type "${variable.type}".`,
        );
      }
      pageVariables[variable.id] = availableValue(
        variable.initialValue,
        variable.type,
      );
    } else {
      pageVariables[variable.id] = unavailableValue;
    }
  });
  const components = dictionary<RuntimeSnapshot["components"][string]>();
  definitions.forEach(({ outputs }, componentId) => {
    const outputSnapshot = dictionary<RuntimeValue>();
    outputs.forEach((_definition, outputId) => {
      outputSnapshot[outputId] = unavailableValue;
    });
    components[componentId] = Object.freeze({
      outputs: Object.freeze(outputSnapshot),
    });
  });
  let snapshot: RuntimeSnapshot = Object.freeze({
    pageFilters: Object.freeze(pageFilters),
    pageVariables: Object.freeze(pageVariables),
    components: Object.freeze(components),
  });
  const listeners = new Set<() => void>();

  const definitionFor = (
    publisherComponentId: string,
    ownerComponentId: string,
    outputId: string,
  ): ComponentOutputDefinition => {
    if (!definitions.has(publisherComponentId)) {
      throw new Error(`Publisher component "${publisherComponentId}" was not found.`);
    }
    const owner = definitions.get(ownerComponentId);
    if (!owner) throw new Error(`Owner component "${ownerComponentId}" was not found.`);
    if (publisherComponentId !== ownerComponentId) {
      throw new Error(
        `Component "${publisherComponentId}" cannot publish output owned by ${ownerComponentId}.`,
      );
    }
    const definition = owner.outputs.get(outputId);
    if (!definition) {
      throw new Error(
        `Output "${outputId}" is not declared on component "${ownerComponentId}".`,
      );
    }
    return definition;
  };

  const replaceOutput = (
    ownerComponentId: string,
    outputId: string,
    next: RuntimeValue,
  ): void => {
    const component = snapshot.components[ownerComponentId];
    const nextOutputs = cloneDictionary(component.outputs);
    nextOutputs[outputId] = next;
    const nextComponents = cloneDictionary(snapshot.components);
    nextComponents[ownerComponentId] = Object.freeze({
      outputs: Object.freeze(nextOutputs),
    });
    snapshot = Object.freeze({
      pageFilters: snapshot.pageFilters,
      pageVariables: snapshot.pageVariables,
      components: Object.freeze(nextComponents),
    });
    Array.from(listeners).forEach((listener) => listener());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPageFilterValue: (filterId, value) => {
      const type = pageFilterTypes[filterId];
      if (!type) {
        throw new Error(`Page filter "${filterId}" was not found.`);
      }
      if (!matchesRuntimeValueType(value, type)) {
        throw new Error(`Page filter "${filterId}" does not match type "${type}".`);
      }
      const previous = snapshot.pageFilters[filterId];
      if (
        previous?.status === "available" &&
        sameRuntimeValue(previous.value, value, type)
      ) return;
      const nextPageFilters = cloneDictionary(snapshot.pageFilters);
      nextPageFilters[filterId] = availableValue(value, type);
      snapshot = Object.freeze({
        pageFilters: Object.freeze(nextPageFilters),
        pageVariables: snapshot.pageVariables,
        components: snapshot.components,
      });
      Array.from(listeners).forEach((listener) => listener());
    },
    publishOutput: (publisher, owner, outputId, value) => {
      const definition = definitionFor(publisher, owner, outputId);
      if (!matchesRuntimeValueType(value, definition.type)) {
        throw new Error(
          `Output "${outputId}" does not match type "${definition.type}".`,
        );
      }
      const previous = snapshot.components[owner].outputs[outputId];
      if (
        previous.status === "available" &&
        sameRuntimeValue(previous.value, value, definition.type)
      ) return;
      replaceOutput(owner, outputId, availableValue(value, definition.type));
    },
    markOutputUnavailable: (publisher, owner, outputId) => {
      definitionFor(publisher, owner, outputId);
      if (snapshot.components[owner].outputs[outputId].status === "unavailable") {
        return;
      }
      replaceOutput(owner, outputId, unavailableValue);
    },
  };
};
