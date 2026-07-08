import { describe, expect, it } from "vitest";
import type {
  ComponentBlock,
  PageModel,
  PageSection,
  ParameterBinding,
} from "../types/page";
import { compileComponentParameters } from "./pageBindingCompiler";

const component = (
  id: string,
  options: Partial<ComponentBlock> = {},
): ComponentBlock => ({
  id,
  type: "table",
  ...options,
});

const pageWith = (
  components: ComponentBlock[],
  sections?: PageSection[],
): PageModel => ({
  name: "Runtime test",
  sections:
    sections ??
    [
      {
        type: "grid",
        grid: {
          columns: 1,
          cells: [{ id: "cell", row: 0, column: 0, components }],
        },
      },
    ],
});

const outputProducer = component("cmp_products", {
  stateKey: "products-renamed",
  outputs: [
    {
      id: "out_date",
      key: "date-renamed",
      type: "dateRange",
      source: { kind: "tableFilter", filterId: "createdAt" },
    },
    {
      id: "out_search",
      key: "search-renamed",
      type: "string",
      source: { kind: "tableSearch" },
    },
    {
      id: "out_ids",
      key: "ids-renamed",
      type: "stringArray",
      source: { kind: "tableSelectedIds" },
    },
  ],
});

const consumer = (parameters: Record<string, ParameterBinding>) =>
  component("cmp_summary", {
    dataBinding: {
      kind: "pipeline",
      pipelineName: "summary",
      parameters,
    },
  });

describe("compileComponentParameters", () => {
  it("compiles component outputs by immutable component and output IDs", () => {
    const result = compileComponentParameters(
      pageWith([
        outputProducer,
        consumer({
          after: {
            source: "componentOutput",
            componentId: "cmp_products",
            outputId: "out_date",
            field: "start",
          },
        }),
      ]),
      "cmp_summary",
    );

    expect(result.errors).toEqual([]);
    expect(result.dependencies).toEqual([
      {
        kind: "componentOutput",
        componentId: "cmp_products",
        outputId: "out_date",
      },
    ]);
    expect(result.resolvers.after).toEqual({
      source: "componentOutput",
      componentId: "cmp_products",
      outputId: "out_date",
      valueType: "dateRange",
      allowedFields: ["start", "end", "preset", "timezone"],
      field: "start",
    });
  });

  it("does not use mutable stateKey or output key aliases for lookup", () => {
    const result = compileComponentParameters(
      pageWith([
        outputProducer,
        consumer({
          byComponentAlias: {
            source: "componentOutput",
            componentId: "products-renamed",
            outputId: "out_date",
          },
          byOutputAlias: {
            source: "componentOutput",
            componentId: "cmp_products",
            outputId: "date-renamed",
          },
        }),
      ]),
      "cmp_summary",
    );

    expect(result.errors.map(({ code, parameter }) => ({ code, parameter }))).toEqual([
      { code: "missing_referenced_component", parameter: "byComponentAlias" },
      { code: "missing_output", parameter: "byOutputAlias" },
    ]);
  });

  it("compiles pageFilter bindings by immutable filter ID", () => {
    const result = compileComponentParameters(
      {
        ...pageWith([
          consumer({
            status: { source: "pageFilter", filterId: "pfl_status" },
          }),
        ]),
        filters: [
          {
            id: "pfl_status",
            key: "status",
            label: "Status",
            type: "numberArray",
            arraySerialization: "comma",
            placement: { kind: "navbar" },
          },
        ],
      },
      "cmp_summary",
    );

    expect(result.errors).toEqual([]);
    expect(result.dependencies).toEqual([
      { kind: "pageFilter", filterId: "pfl_status" },
    ]);
    expect(result.resolvers.status).toEqual({
      source: "pageFilter",
      filterId: "pfl_status",
      valueType: "numberArray",
      arraySerialization: "comma",
    });
  });

  it("returns a structured error when the consumer component is missing", () => {
    const result = compileComponentParameters(
      pageWith([outputProducer]),
      "missing-consumer",
    );

    expect(result.resolvers).toEqual({});
    expect(result.dependencies).toEqual([]);
    expect(result.errors).toMatchObject([
      { code: "missing_consumer_component", parameter: null },
    ]);
  });

  it("accepts every dateRange accessor including an omitted field", () => {
    const fields = [undefined, "start", "end", "preset", "timezone"] as const;
    const parameters = Object.fromEntries(
      fields.map((field, index) => [
        `range${index}`,
        {
          source: "componentOutput",
          componentId: "cmp_products",
          outputId: "out_date",
          ...(field ? { field } : {}),
        },
      ]),
    ) as Record<string, ParameterBinding>;

    const result = compileComponentParameters(
      pageWith([outputProducer, consumer(parameters)]),
      "cmp_summary",
    );

    expect(result.errors).toEqual([]);
    expect(Object.values(result.resolvers).map((resolver) => resolver.field)).toEqual(
      fields,
    );
    expect(result.dependencies).toHaveLength(1);
  });

  it("sorts deduplicated dependencies independently of parameter insertion order", () => {
    const dateBinding: ParameterBinding = {
      source: "componentOutput",
      componentId: "cmp_products",
      outputId: "out_date",
    };
    const searchBinding: ParameterBinding = {
      source: "componentOutput",
      componentId: "cmp_products",
      outputId: "out_search",
    };
    const compile = (parameters: Record<string, ParameterBinding>) =>
      compileComponentParameters(
        pageWith([outputProducer, consumer(parameters)]),
        "cmp_summary",
      );

    const first = compile({
      search: searchBinding,
      duplicateSearch: searchBinding,
      date: dateBinding,
    });
    const second = compile({
      date: dateBinding,
      search: searchBinding,
      duplicateSearch: searchBinding,
    });

    expect(first.dependencies).toEqual(second.dependencies);
    expect(first.dependencies).toEqual([
      {
        kind: "componentOutput",
        componentId: "cmp_products",
        outputId: "out_date",
      },
      {
        kind: "componentOutput",
        componentId: "cmp_products",
        outputId: "out_search",
      },
    ]);
  });

  it("rejects invalid dateRange, scalar, and array field accessors", () => {
    const unsafe = (binding: object) => binding as ParameterBinding;
    const result = compileComponentParameters(
      pageWith([
        outputProducer,
        consumer({
          invalidRange: unsafe({
            source: "componentOutput",
            componentId: "cmp_products",
            outputId: "out_date",
            field: "value",
          }),
          scalarField: unsafe({
            source: "componentOutput",
            componentId: "cmp_products",
            outputId: "out_search",
            field: "start",
          }),
          arrayField: unsafe({
            source: "componentOutput",
            componentId: "cmp_products",
            outputId: "out_ids",
            field: "end",
          }),
        }),
      ]),
      "cmp_summary",
    );

    expect(result.errors.map(({ code, parameter }) => ({ code, parameter }))).toEqual([
      { code: "invalid_field", parameter: "arrayField" },
      { code: "invalid_field", parameter: "invalidRange" },
      { code: "invalid_field", parameter: "scalarField" },
    ]);
    expect(result.resolvers).toEqual({});
  });

  it("normalizes legacy params to static and lets structured parameters overlay them", () => {
    const target = component("cmp_summary", {
      dataBinding: {
        kind: "pipeline",
        params: { untouched: { nested: true }, same: "legacy" },
        parameters: {
          same: { source: "static", value: ["structured"] },
        },
      },
    });

    const result = compileComponentParameters(pageWith([target]), "cmp_summary");

    expect(result.errors).toEqual([]);
    expect(result.resolvers).toEqual({
      untouched: { source: "static", value: { nested: true } },
      same: { source: "static", value: ["structured"] },
    });
  });

  it("preserves prototype-like parameter names as own resolver keys", () => {
    const parameters = Object.create(null) as Record<string, ParameterBinding>;
    Object.defineProperty(parameters, "constructor", {
      value: { source: "static", value: "constructor-value" },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(parameters, "__proto__", {
      value: { source: "static", value: "proto-value" },
      enumerable: true,
      configurable: true,
    });
    const result = compileComponentParameters(
      pageWith([consumer(parameters)]),
      "cmp_summary",
    );

    expect(result.errors).toEqual([]);
    expect(Object.hasOwn(result.resolvers, "__proto__")).toBe(true);
    expect(Object.hasOwn(result.resolvers, "constructor")).toBe(true);
    expect(result.resolvers.__proto__).toEqual({
      source: "static",
      value: "proto-value",
    });
  });

  it.each([
    ["missing", { source: "static" }],
    ["undefined", { source: "static", value: undefined }],
  ])("rejects a static binding with %s own value", (_name, malformed) => {
    const result = compileComponentParameters(
      pageWith([
        consumer({
          invalid: malformed as unknown as ParameterBinding,
        }),
      ]),
      "cmp_summary",
    );

    expect(result.errors).toMatchObject([
      { code: "invalid_binding", parameter: "invalid" },
    ]);
    expect(result.resolvers).toEqual({});
  });

  it("produces deterministic resolver and error order for equivalent parameter maps", () => {
    const invalidA = {
      source: "componentOutput",
      componentId: "cmp_products",
      outputId: "out_search",
      field: "start",
    } as unknown as ParameterBinding;
    const invalidZ = { source: "pageVariable" } as ParameterBinding;
    const compile = (parameters: Record<string, ParameterBinding>) =>
      compileComponentParameters(
        pageWith([
          outputProducer,
          consumer({
            ...parameters,
            middle: { source: "static", value: true },
          }),
        ]),
        "cmp_summary",
      );

    const first = compile({ zError: invalidZ, aError: invalidA });
    const second = compile({ aError: invalidA, zError: invalidZ });

    expect(first.errors).toEqual(second.errors);
    expect(first.errors.map((item) => item.parameter)).toEqual([
      "aError",
      "zError",
    ]);
    expect(Object.keys(first.resolvers)).toEqual(["middle"]);
  });

  it.each(["pageVariable", "system", "derived"] as const)(
    "returns unsupported_source for %s without compiling a partial resolver",
    (source) => {
      const binding = { source } as ParameterBinding;
      const result = compileComponentParameters(
        pageWith([consumer({ unsupported: binding })]),
        "cmp_summary",
      );

      expect(result.resolvers).toEqual({});
      expect(result.errors).toMatchObject([
        {
          code: "unsupported_source",
          parameter: "unsupported",
          source,
        },
      ]);
    },
  );

  it.each([
    ["null", null],
    ["number", 17],
    ["array", []],
    ["missing source", {}],
    ["non-string source", { source: 17 }],
    [
      "incomplete component output",
      { source: "componentOutput", componentId: "cmp_products" },
    ],
  ])("returns invalid_binding for a malformed %s parameter", (_name, malformed) => {
    const target = component("cmp_summary", {
      dataBinding: {
        kind: "pipeline",
        parameters: {
          malformed,
        } as unknown as Record<string, ParameterBinding>,
      },
    });

    const result = compileComponentParameters(
      pageWith([outputProducer, target]),
      "cmp_summary",
    );

    expect(result.resolvers).toEqual({});
    expect(result.errors).toMatchObject([
      {
        code: "invalid_binding",
        parameter: "malformed",
      },
    ]);
  });

  it("finds components across section, legacy grid, page tabs, component tabs, and subpages", () => {
    const nestedConsumer = consumer({
      search: {
        source: "componentOutput",
        componentId: "cmp_deep_producer",
        outputId: "out_deep",
      },
    });
    const page = pageWith([], [
      { type: "component", component: component("cmp_direct") },
      {
        cells: [
          {
            id: "legacy-cell",
            row: 0,
            column: 0,
            components: [component("cmp_legacy_grid")],
          },
        ],
      },
      {
        type: "tabs",
        tabs: {
          tabs: [
            {
              id: "page-tab",
              label: "Page tab",
              order: 0,
              sections: [
                {
                  component: component("cmp_tab_panel", {
                    type: "tabPanel",
                    tabs: [
                      {
                        title: "Component tab",
                        components: [nestedConsumer],
                      },
                    ],
                  }),
                },
              ],
            },
          ],
        },
      },
    ]);
    page.subPage = pageWith([
      component("cmp_deep_producer", {
        outputs: [
          {
            id: "out_deep",
            key: "mutable",
            type: "string",
            source: { kind: "tableSearch" },
          },
        ],
      }),
    ]);

    const result = compileComponentParameters(page, "cmp_summary");

    expect(result.errors).toEqual([]);
    expect(result.dependencies).toEqual([
      {
        kind: "componentOutput",
        componentId: "cmp_deep_producer",
        outputId: "out_deep",
      },
    ]);
  });

  it("traverses both nested grid cells and flat legacy cells when both exist", () => {
    const result = compileComponentParameters(
      pageWith([], [
        {
          type: "grid",
          grid: {
            columns: 1,
            cells: [
              {
                id: "nested-cell",
                row: 0,
                column: 0,
                components: [outputProducer],
              },
            ],
          },
          cells: [
            {
              id: "flat-cell",
              row: 1,
              column: 0,
              components: [
                consumer({
                  search: {
                    source: "componentOutput",
                    componentId: "cmp_products",
                    outputId: "out_search",
                  },
                }),
              ],
            },
          ],
        },
      ]),
      "cmp_summary",
    );

    expect(result.errors).toEqual([]);
    expect(result.dependencies).toEqual([
      {
        kind: "componentOutput",
        componentId: "cmp_products",
        outputId: "out_search",
      },
    ]);
  });

  it.each([
    [
      "sections",
      (page: PageModel) => {
        page.sections = null as unknown as PageSection[];
      },
    ],
    [
      "grid cells",
      (page: PageModel) => {
        page.sections = [
          {
            grid: {
              columns: 1,
              cells: [null] as unknown as NonNullable<PageSection["grid"]>["cells"],
            },
          },
        ];
      },
    ],
    [
      "component tab children",
      (page: PageModel) => {
        page.sections = [
          {
            component: component("tab", {
              type: "tabPanel",
              tabs: [
                {
                  title: "Malformed",
                  components: null as unknown as ComponentBlock[],
                },
              ],
            }),
          },
        ];
      },
    ],
  ])("returns a structured error for malformed persisted %s", (_name, mutate) => {
    const page = pageWith([]);
    mutate(page);

    const result = compileComponentParameters(page, "cmp_summary");

    expect(result.errors.some((item) => item.code === "invalid_page_structure")).toBe(
      true,
    );
  });

  it("detects duplicate immutable component IDs instead of picking the first", () => {
    const result = compileComponentParameters(
      pageWith([
        component("duplicate"),
        component("duplicate"),
        consumer({ safe: { source: "static", value: true } }),
      ]),
      "cmp_summary",
    );

    expect(result.errors).toMatchObject([
      { code: "duplicate_component_id", parameter: null },
    ]);
  });

  it("terminates cyclic page and component references with structured errors", () => {
    const cyclicComponent = component("cycle", {
      type: "tabPanel",
      tabs: [{ title: "Cycle", components: [] }],
    });
    cyclicComponent.tabs![0].components.push(cyclicComponent);
    const page = pageWith([
      cyclicComponent,
      consumer({ safe: { source: "static", value: true } }),
    ]);
    page.subPage = page;

    const result = compileComponentParameters(page, "cmp_summary");

    expect(result.errors.map((item) => item.code)).toEqual([
      "cyclic_component_reference",
      "cyclic_page_reference",
    ]);
  });

  it.each(["direct", "indirect"] as const)(
    "terminates a %s cyclic page-tab section graph",
    (kind) => {
      const ancestor: PageSection[] = [];
      const descendant: PageSection[] =
        kind === "direct"
          ? ancestor
          : [
              {
                tabs: {
                  tabs: [
                    {
                      id: "indirect",
                      label: "Indirect",
                      order: 0,
                      sections: ancestor,
                    },
                  ],
                },
              },
            ];
      ancestor.push({
        tabs: {
          tabs: [
            {
              id: "cycle",
              label: "Cycle",
              order: 0,
              sections: descendant,
            },
          ],
        },
      });
      const page: PageModel = { name: "Cycle", sections: ancestor };

      const result = compileComponentParameters(page, "missing");

      expect(result.errors.some((item) => item.code === "cyclic_page_reference")).toBe(
        true,
      );
    },
  );

  it("allows shared page-tab sections when reuse is not cyclic", () => {
    const shared: PageSection[] = [
      { component: consumer({ safe: { source: "static", value: true } }) },
    ];
    const page: PageModel = {
      name: "Shared",
      sections: [
        {
          tabs: {
            tabs: [
              { id: "one", label: "One", order: 0, sections: shared },
              { id: "two", label: "Two", order: 1, sections: shared },
            ],
          },
        },
      ],
    };

    const result = compileComponentParameters(page, "cmp_summary");

    expect(result.errors).toEqual([]);
  });

  it("rejects duplicate output IDs before resolving either definition", () => {
    const producer = component("producer", {
      outputs: [
        {
          id: "ambiguous",
          key: "first",
          type: "string",
          source: { kind: "tableSearch" },
        },
        {
          id: "ambiguous",
          key: "second",
          type: "dateRange",
          source: { kind: "tableFilter", filterId: "createdAt" },
        },
      ],
    });
    const target = consumer({
      ambiguous: {
        source: "componentOutput",
        componentId: "producer",
        outputId: "ambiguous",
        field: "start",
      },
    });

    const result = compileComponentParameters(
      pageWith([producer, target]),
      "cmp_summary",
    );

    expect(result.errors).toMatchObject([
      { code: "duplicate_output_id", parameter: "ambiguous" },
    ]);
    expect(result.resolvers).toEqual({});
  });

  it.each([0, "", false])(
    "rejects malformed falsey subPage value %j",
    (subPage) => {
      const page = pageWith([
        consumer({ safe: { source: "static", value: true } }),
      ]);
      page.subPage = subPage as unknown as PageModel;

      const result = compileComponentParameters(page, "cmp_summary");

      expect(result.errors).toMatchObject([
        { code: "invalid_page_structure", parameter: null },
      ]);
    },
  );

  it.each([
    ["non-array outputs", { not: "an array" }, "invalid_component_outputs"],
    ["malformed output entry", [null], "invalid_output_definition"],
  ])("returns a parameter error for %s", (_name, outputs, code) => {
    const producer = component("producer", {
      outputs: outputs as unknown as ComponentBlock["outputs"],
    });
    const target = consumer({
      broken: {
        source: "componentOutput",
        componentId: "producer",
        outputId: "out",
      },
    });

    const result = compileComponentParameters(
      pageWith([producer, target]),
      "cmp_summary",
    );

    expect(result.errors).toMatchObject([{ code, parameter: "broken" }]);
  });
});
