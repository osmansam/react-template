import type { RuntimeValueType } from "../types/page";
import type {
  CompiledComponentParameters,
  ParameterResolutionError,
  ParameterResolutionResult,
  RuntimeSnapshot,
} from "./types";

type DateRangeValue = {
  start: string;
  end: string;
  preset?: string;
  timezone?: string;
};

const ISO_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  const days = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return days[month - 1] ?? 0;
};

const parseIsoInstant = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const match = ISO_INSTANT.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [
    match[1],
    match[2],
    match[3],
    match[4],
    match[5],
    match[6],
    match[7],
    match[8],
  ].map((part) => (part === undefined ? 0 : Number(part)));
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isDateRangeValue = (value: unknown): value is DateRangeValue => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const start = parseIsoInstant(candidate.start);
  const end = parseIsoInstant(candidate.end);
  return (
    start !== null &&
    end !== null &&
    start < end &&
    (candidate.preset === undefined || typeof candidate.preset === "string") &&
    (candidate.timezone === undefined ||
      typeof candidate.timezone === "string")
  );
};

export const matchesRuntimeValueType = (
  value: unknown,
  valueType: RuntimeValueType,
): boolean => {
  if (value === null) {
    return true;
  }

  switch (valueType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "date":
      return parseIsoInstant(value) !== null;
    case "dateRange":
      return isDateRangeValue(value);
    case "stringArray":
      return (
        Array.isArray(value) &&
        value.every((item) => typeof item === "string")
      );
    case "numberArray":
      return (
        Array.isArray(value) &&
        value.every(
          (item) => typeof item === "number" && Number.isFinite(item),
        )
      );
  }
};

const resolutionError = (
  code: ParameterResolutionError["code"],
  parameter: string,
  message: string,
): ParameterResolutionError => ({ code, parameter, message });

export const resolveComponentParameters = (
  compiled: CompiledComponentParameters,
  snapshot: RuntimeSnapshot,
): ParameterResolutionResult => {
  if (compiled.errors.length > 0) {
    return {
      values: {},
      dependencies: compiled.dependencies,
      status: "error",
      errors: compiled.errors,
    };
  }

  const values: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  const errors: ParameterResolutionError[] = [];
  let waiting = false;

  Object.keys(compiled.resolvers)
    .sort()
    .forEach((parameter) => {
      const resolver = compiled.resolvers[parameter];
      if (resolver.source === "static") {
        values[parameter] = resolver.value;
        return;
      }

      if (resolver.source === "pageFilter") {
        const runtimeValue = snapshot.pageFilters[resolver.filterId];
        if (
          typeof runtimeValue !== "object" ||
          runtimeValue === null ||
          !("status" in runtimeValue)
        ) {
          errors.push(
            resolutionError(
              "runtime_type_mismatch",
              parameter,
              `Page filter "${resolver.filterId}" has an invalid value wrapper.`,
            ),
          );
          return;
        }
        if (runtimeValue.status === "unavailable") {
          values[parameter] = null;
          return;
        }
        if (
          runtimeValue.status !== "available" ||
          !matchesRuntimeValueType(runtimeValue.value, resolver.valueType)
        ) {
          errors.push(
            resolutionError(
              "runtime_type_mismatch",
              parameter,
              `Page filter "${resolver.filterId}" does not match type "${resolver.valueType}".`,
            ),
          );
          return;
        }
        if (resolver.field === "value") {
          values[parameter] = runtimeValue.value;
          return;
        }
        if (
          resolver.arraySerialization === "comma" &&
          Array.isArray(runtimeValue.value)
        ) {
          values[parameter] = runtimeValue.value.join(",");
          return;
        }
        if (
          resolver.field !== undefined &&
          runtimeValue.value !== null &&
          isDateRangeValue(runtimeValue.value)
        ) {
          values[parameter] = runtimeValue.value[resolver.field];
          return;
        }
        values[parameter] = runtimeValue.value;
        return;
      }

      if (!Object.hasOwn(snapshot.components, resolver.componentId)) {
        errors.push(
          resolutionError(
            "missing_snapshot_component",
            parameter,
            `Runtime component "${resolver.componentId}" is missing.`,
          ),
        );
        return;
      }
      const componentSnapshot = snapshot.components[resolver.componentId];

      if (
        typeof componentSnapshot !== "object" ||
        componentSnapshot === null ||
        typeof componentSnapshot.outputs !== "object" ||
        componentSnapshot.outputs === null ||
        !Object.hasOwn(componentSnapshot.outputs, resolver.outputId)
      ) {
        errors.push(
          resolutionError(
            "missing_snapshot_output",
            parameter,
            `Runtime output "${resolver.outputId}" is missing from component "${resolver.componentId}".`,
          ),
        );
        return;
      }
      const runtimeValue = componentSnapshot.outputs[resolver.outputId];

      if (
        typeof runtimeValue !== "object" ||
        runtimeValue === null ||
        !("status" in runtimeValue)
      ) {
        errors.push(
          resolutionError(
            "runtime_type_mismatch",
            parameter,
            `Runtime output "${resolver.outputId}" has an invalid value wrapper.`,
          ),
        );
        return;
      }

      if (runtimeValue.status === "unavailable") {
        waiting = true;
        return;
      }

      if (
        runtimeValue.status !== "available" ||
        !matchesRuntimeValueType(runtimeValue.value, resolver.valueType)
      ) {
        errors.push(
          resolutionError(
            "runtime_type_mismatch",
            parameter,
            `Runtime output "${resolver.outputId}" does not match type "${resolver.valueType}".`,
          ),
        );
        return;
      }

      if (
        resolver.field !== undefined &&
        runtimeValue.value !== null &&
        isDateRangeValue(runtimeValue.value)
      ) {
        values[parameter] = runtimeValue.value[resolver.field];
        return;
      }

      values[parameter] = runtimeValue.value;
    });

  if (errors.length > 0) {
    return {
      values: {},
      dependencies: compiled.dependencies,
      status: "error",
      errors,
    };
  }

  if (waiting) {
    return {
      values: {},
      dependencies: compiled.dependencies,
      status: "waiting",
      errors: [],
    };
  }

  return {
    values,
    dependencies: compiled.dependencies,
    status: "ready",
    errors: [],
  };
};

type CanonicalNode =
  | ["null"]
  | ["undefined"]
  | ["boolean", boolean]
  | ["string", string]
  | ["number", string]
  | ["bigint", string]
  | ["date", string]
  | ["array", CanonicalNode[]]
  | ["object", Array<[string, CanonicalNode]>];

const canonicalNumber = (value: number): string => {
  if (Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  if (Object.is(value, -0)) return "-0";
  return String(value);
};

const toCanonicalNode = (
  value: unknown,
  ancestors: Set<object>,
): CanonicalNode => {
  if (value === null) return ["null"];
  if (value === undefined) return ["undefined"];
  if (typeof value === "boolean") return ["boolean", value];
  if (typeof value === "string") return ["string", value];
  if (typeof value === "number") return ["number", canonicalNumber(value)];
  if (typeof value === "bigint") return ["bigint", value.toString()];
  if (typeof value === "symbol" || typeof value === "function") {
    throw new TypeError(`Cannot canonicalize a ${typeof value} runtime value.`);
  }

  if (value instanceof Date) {
    return [
      "date",
      Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString(),
    ];
  }

  if (ancestors.has(value)) {
    throw new TypeError("Cannot canonicalize a cyclic runtime value.");
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);

  if (Array.isArray(value)) {
    return [
      "array",
      Array.from(value, (item) =>
        item === undefined
          ? (["null"] as CanonicalNode)
          : toCanonicalNode(item, nextAncestors),
      ),
    ];
  }

  const entries = Object.keys(value)
    .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
    .sort()
    .map(
      (key) =>
        [
          key,
          toCanonicalNode(
            (value as Record<string, unknown>)[key],
            nextAncestors,
          ),
        ] as [string, CanonicalNode],
    );
  return ["object", entries];
};

export const canonicalizeRuntimeValue = (value: unknown): string =>
  JSON.stringify(toCanonicalNode(value, new Set()));
