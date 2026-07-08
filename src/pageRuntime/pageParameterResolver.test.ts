import { describe, expect, it } from "vitest";
import type {
  CompiledComponentParameters,
  RuntimeSnapshot,
} from "./types";
import {
  canonicalizeRuntimeValue,
  resolveComponentParameters,
} from "./pageParameterResolver";

const compiledOutput = (
  valueType: "string" | "number" | "boolean" | "date" | "dateRange" | "stringArray" | "numberArray",
  field?: "start" | "end" | "preset" | "timezone",
): CompiledComponentParameters => ({
  componentId: "consumer",
  resolvers: {
    requested: {
      source: "componentOutput",
      componentId: "producer",
      outputId: "output",
      valueType,
      allowedFields:
        valueType === "dateRange"
          ? ["start", "end", "preset", "timezone"]
          : [],
      ...(field ? { field } : {}),
    },
  },
  dependencies: [
    {
      kind: "componentOutput",
      componentId: "producer",
      outputId: "output",
    },
  ],
  errors: [],
});

const snapshotWith = (runtimeValue: RuntimeSnapshot["components"][string]["outputs"][string]): RuntimeSnapshot => ({
  pageFilters: {},
  pageVariables: {},
  components: {
    producer: {
      outputs: {
        output: runtimeValue,
      },
    },
  },
});

describe("resolveComponentParameters", () => {
  it("returns ready values and carries dependencies", () => {
    const compiled = compiledOutput("string");
    const result = resolveComponentParameters(
      compiled,
      snapshotWith({ status: "available", value: "needle" }),
    );

    expect(result).toEqual({
      values: { requested: "needle" },
      dependencies: compiled.dependencies,
      status: "ready",
      errors: [],
    });
  });

  it("resolves pageFilter values", () => {
    const compiled: CompiledComponentParameters = {
      componentId: "consumer",
      resolvers: {
        status: {
          source: "pageFilter",
          filterId: "pfl_status",
          valueType: "string",
        },
      },
      dependencies: [],
      errors: [],
    };

    const result = resolveComponentParameters(compiled, {
      pageFilters: {
        pfl_status: { status: "available", value: "open" },
      },
      pageVariables: {},
      components: {},
    });

    expect(result).toEqual({
      values: { status: "open" },
      dependencies: [],
      status: "ready",
      errors: [],
    });
  });

  it("serializes pageFilter array values as comma-separated strings when configured", () => {
    const compiled: CompiledComponentParameters = {
      componentId: "consumer",
      resolvers: {
        test: {
          source: "pageFilter",
          filterId: "pfl_test",
          valueType: "numberArray",
          arraySerialization: "comma",
        },
      },
      dependencies: [{ kind: "pageFilter", filterId: "pfl_test" }],
      errors: [],
    };

    const result = resolveComponentParameters(compiled, {
      pageFilters: {
        pfl_test: { status: "available", value: [10, 23] },
      },
      pageVariables: {},
      components: {},
    });

    expect(result).toEqual({
      values: { test: "10,23" },
      dependencies: [{ kind: "pageFilter", filterId: "pfl_test" }],
      status: "ready",
      errors: [],
    });
  });

  it("resolves an unset pageFilter as null instead of waiting", () => {
    const compiled: CompiledComponentParameters = {
      componentId: "consumer",
      resolvers: {
        test: {
          source: "pageFilter",
          filterId: "pfl_test",
          valueType: "numberArray",
        },
      },
      dependencies: [{ kind: "pageFilter", filterId: "pfl_test" }],
      errors: [],
    };

    const result = resolveComponentParameters(compiled, {
      pageFilters: {
        pfl_test: { status: "unavailable" },
      },
      pageVariables: {},
      components: {},
    });

    expect(result).toEqual({
      values: { test: null },
      dependencies: [{ kind: "pageFilter", filterId: "pfl_test" }],
      status: "ready",
      errors: [],
    });
  });

  it("waits atomically while a required runtime output is unavailable", () => {
    const compiled = compiledOutput("string");
    compiled.resolvers.staticValue = { source: "static", value: "known" };

    const result = resolveComponentParameters(
      compiled,
      snapshotWith({ status: "unavailable" }),
    );

    expect(result.status).toBe("waiting");
    expect(result.values).toEqual({});
    expect(result.errors).toEqual([]);
  });

  it("preserves available null as a ready null value", () => {
    const result = resolveComponentParameters(
      compiledOutput("string"),
      snapshotWith({ status: "available", value: null }),
    );

    expect(result.status).toBe("ready");
    expect(result.values).toEqual({ requested: null });
  });

  it("reports a missing snapshot component without throwing", () => {
    const result = resolveComponentParameters(compiledOutput("string"), {
      pageFilters: {},
      pageVariables: {},
      components: {},
    });

    expect(result.status).toBe("error");
    expect(result.values).toEqual({});
    expect(result.errors).toMatchObject([
      { code: "missing_snapshot_component", parameter: "requested" },
    ]);
  });

  it("reports a missing snapshot output without throwing", () => {
    const result = resolveComponentParameters(compiledOutput("string"), {
      pageFilters: {},
      pageVariables: {},
      components: { producer: { outputs: {} } },
    });

    expect(result.status).toBe("error");
    expect(result.values).toEqual({});
    expect(result.errors).toMatchObject([
      { code: "missing_snapshot_output", parameter: "requested" },
    ]);
  });

  it("does not resolve inherited component or output properties", () => {
    const inheritedComponent = compiledOutput("string");
    const componentResolver = inheritedComponent.resolvers.requested;
    if (componentResolver.source !== "componentOutput") throw new Error("fixture");
    componentResolver.componentId = "constructor";

    const missingComponent = resolveComponentParameters(inheritedComponent, {
      pageFilters: {},
      pageVariables: {},
      components: {},
    });
    expect(missingComponent.errors).toMatchObject([
      { code: "missing_snapshot_component", parameter: "requested" },
    ]);

    const inheritedOutput = compiledOutput("string");
    const outputResolver = inheritedOutput.resolvers.requested;
    if (outputResolver.source !== "componentOutput") throw new Error("fixture");
    outputResolver.outputId = "__proto__";
    const missingOutput = resolveComponentParameters(inheritedOutput, {
      pageFilters: {},
      pageVariables: {},
      components: { producer: { outputs: {} } },
    });
    expect(missingOutput.errors).toMatchObject([
      { code: "missing_snapshot_output", parameter: "requested" },
    ]);
  });

  it("resolves own prototype-like component, output, and parameter keys", () => {
    const resolvers = Object.create(null) as CompiledComponentParameters["resolvers"];
    Object.defineProperty(resolvers, "__proto__", {
      value: {
        source: "componentOutput",
        componentId: "constructor",
        outputId: "__proto__",
        valueType: "string",
        allowedFields: [],
      },
      enumerable: true,
    });
    const components = Object.create(null) as RuntimeSnapshot["components"];
    const outputs = Object.create(null) as RuntimeSnapshot["components"][string]["outputs"];
    Object.defineProperty(outputs, "__proto__", {
      value: { status: "available", value: "safe" },
      enumerable: true,
    });
    Object.defineProperty(components, "constructor", {
      value: { outputs },
      enumerable: true,
    });

    const result = resolveComponentParameters(
      {
        componentId: "consumer",
        resolvers,
        dependencies: [],
        errors: [],
      },
      { pageFilters: {}, pageVariables: {}, components },
    );

    expect(result.status).toBe("ready");
    expect(Object.hasOwn(result.values, "__proto__")).toBe(true);
    expect(result.values.__proto__).toBe("safe");
  });

  it.each([
    ["string", 1],
    ["number", "1"],
    ["boolean", "true"],
    ["stringArray", ["valid", 2]],
    ["numberArray", [1, "2"]],
    ["dateRange", "2026-01-01"],
  ] as const)("reports a %s runtime type mismatch", (valueType, value) => {
    const result = resolveComponentParameters(
      compiledOutput(valueType),
      snapshotWith({ status: "available", value }),
    );

    expect(result.status).toBe("error");
    expect(result.values).toEqual({});
    expect(result.errors).toMatchObject([
      { code: "runtime_type_mismatch", parameter: "requested" },
    ]);
  });

  it.each([
    ["empty object", {}],
    ["empty start", { start: "", end: "2026-02-01T00:00:00Z" }],
    [
      "date-only start",
      { start: "2026-01-01", end: "2026-02-01T00:00:00Z" },
    ],
    [
      "invalid calendar date",
      { start: "2026-02-30T00:00:00Z", end: "2026-03-02T00:00:00Z" },
    ],
    [
      "equal bounds",
      {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-01T00:00:00Z",
      },
    ],
    [
      "decreasing bounds",
      {
        start: "2026-02-01T00:00:00Z",
        end: "2026-01-01T00:00:00Z",
      },
    ],
  ])("rejects a dateRange with %s", (_name, value) => {
    const result = resolveComponentParameters(
      compiledOutput("dateRange"),
      snapshotWith({ status: "available", value }),
    );

    expect(result.status).toBe("error");
    expect(result.errors).toMatchObject([
      { code: "runtime_type_mismatch", parameter: "requested" },
    ]);
  });

  it("accepts increasing ISO instants with Z and explicit offsets", () => {
    const range = {
      start: "2026-01-01T00:00:00.000-06:00",
      end: "2026-01-01T07:00:00Z",
    };
    const result = resolveComponentParameters(
      compiledOutput("dateRange"),
      snapshotWith({ status: "available", value: range }),
    );

    expect(result.status).toBe("ready");
    expect(result.values).toEqual({ requested: range });
  });

  it.each(["start", "end", "preset", "timezone"] as const)(
    "extracts the %s dateRange field",
    (field) => {
      const range = {
        start: "2026-01-01T00:00:00.000Z",
        end: "2026-02-01T00:00:00.000Z",
        preset: "lastMonth",
        timezone: "America/Chicago",
      };
      const result = resolveComponentParameters(
        compiledOutput("dateRange", field),
        snapshotWith({ status: "available", value: range }),
      );

      expect(result.status).toBe("ready");
      expect(result.values).toEqual({ requested: range[field] });
    },
  );

  it("returns the whole dateRange when the field is omitted", () => {
    const range = {
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-02-01T00:00:00.000Z",
      timezone: "America/Chicago",
    };
    const result = resolveComponentParameters(
      compiledOutput("dateRange"),
      snapshotWith({ status: "available", value: range }),
    );

    expect(result.status).toBe("ready");
    expect(result.values).toEqual({ requested: range });
  });

  it("preserves static scalar, object, array, and null values", () => {
    const compiled: CompiledComponentParameters = {
      componentId: "consumer",
      resolvers: {
        scalar: { source: "static", value: 4 },
        object: { source: "static", value: { nested: true } },
        array: { source: "static", value: ["one", 2] },
        nullable: { source: "static", value: null },
      },
      dependencies: [],
      errors: [],
    };

    const result = resolveComponentParameters(compiled, {
      pageFilters: {},
      pageVariables: {},
      components: {},
    });

    expect(result.status).toBe("ready");
    expect(result.values).toEqual({
      scalar: 4,
      object: { nested: true },
      array: ["one", 2],
      nullable: null,
    });
  });

  it("returns no partial values when one of multiple parameters errors", () => {
    const compiled = compiledOutput("string");
    compiled.resolvers.staticValue = { source: "static", value: "known" };

    const result = resolveComponentParameters(compiled, {
      pageFilters: {},
      pageVariables: {},
      components: {},
    });

    expect(result.status).toBe("error");
    expect(result.values).toEqual({});
  });

  it("reports resolution errors in deterministic parameter-name order", () => {
    const makeCompiled = (
      names: string[],
    ): CompiledComponentParameters => {
      const resolvers: CompiledComponentParameters["resolvers"] = {};
      names.forEach((name) => {
        resolvers[name] = {
          source: "componentOutput",
          componentId: `missing-${name}`,
          outputId: "output",
          valueType: "string",
          allowedFields: [],
        };
      });
      return {
        componentId: "consumer",
        resolvers,
        dependencies: [],
        errors: [],
      };
    };

    const first = resolveComponentParameters(makeCompiled(["z", "a"]), {
      pageFilters: {},
      pageVariables: {},
      components: {},
    });
    const second = resolveComponentParameters(makeCompiled(["a", "z"]), {
      pageFilters: {},
      pageVariables: {},
      components: {},
    });

    expect(first.errors).toEqual(second.errors);
    expect(first.errors.map((item) => item.parameter)).toEqual(["a", "z"]);
  });

  it("turns compilation errors into an atomic resolution error", () => {
    const compiled = compiledOutput("string");
    compiled.errors = [
      {
        code: "missing_output",
        parameter: "requested",
        message: "Missing persisted output.",
      },
    ];

    const result = resolveComponentParameters(
      compiled,
      snapshotWith({ status: "available", value: "ignored" }),
    );

    expect(result.status).toBe("error");
    expect(result.values).toEqual({});
    expect(result.errors).toEqual(compiled.errors);
  });
});

describe("canonicalizeRuntimeValue", () => {
  it("recursively sorts object keys and ignores object insertion order", () => {
    const first = {
      z: { second: 2, first: 1 },
      a: [{ y: true, x: false }],
    };
    const second = {
      a: [{ x: false, y: true }],
      z: { first: 1, second: 2 },
    };

    expect(canonicalizeRuntimeValue(first)).toBe(
      canonicalizeRuntimeValue(second),
    );
  });

  it("recursively omits undefined-valued object properties like JSON", () => {
    expect(
      canonicalizeRuntimeValue({
        keep: 1,
        omit: undefined,
        nested: { omit: undefined, keep: "value" },
      }),
    ).toBe(
      canonicalizeRuntimeValue({
        keep: 1,
        nested: { keep: "value" },
      }),
    );
  });

  it("preserves array order", () => {
    expect(canonicalizeRuntimeValue(["a", "b"])).not.toBe(
      canonicalizeRuntimeValue(["b", "a"]),
    );
  });

  it("represents undefined array slots as stable JSON nulls without string collisions", () => {
    const withUndefined = canonicalizeRuntimeValue([undefined, "after"]);

    expect(withUndefined).toBe(
      canonicalizeRuntimeValue([undefined, "after"]),
    );
    expect(withUndefined).toBe(canonicalizeRuntimeValue([null, "after"]));
    expect(withUndefined).not.toBe(canonicalizeRuntimeValue(["after"]));
    expect(withUndefined).not.toBe(
      canonicalizeRuntimeValue(["undefined", "after"]),
    );
  });

  it("distinguishes relevant primitives, null, undefined, and non-finite numbers", () => {
    const canonicalValues = [
      canonicalizeRuntimeValue(null),
      canonicalizeRuntimeValue(false),
      canonicalizeRuntimeValue(0),
      canonicalizeRuntimeValue("0"),
      canonicalizeRuntimeValue(undefined),
      canonicalizeRuntimeValue(Number.NaN),
      canonicalizeRuntimeValue(Number.POSITIVE_INFINITY),
      canonicalizeRuntimeValue(Number.NEGATIVE_INFINITY),
    ];

    expect(new Set(canonicalValues).size).toBe(canonicalValues.length);
    canonicalValues.forEach((value) => expect(() => JSON.parse(value)).not.toThrow());
  });

  it("rejects collision-prone symbol and function values", () => {
    expect(() => canonicalizeRuntimeValue(Symbol("value"))).toThrow(TypeError);
    expect(() => canonicalizeRuntimeValue(() => "value")).toThrow(TypeError);
  });

  it("handles bigint and cycles explicitly", () => {
    expect(canonicalizeRuntimeValue(2n)).not.toBe(
      canonicalizeRuntimeValue("2"),
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalizeRuntimeValue(cyclic)).toThrow(
      "Cannot canonicalize a cyclic runtime value.",
    );
  });
});
