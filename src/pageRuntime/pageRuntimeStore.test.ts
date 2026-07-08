import { describe, expect, it, vi } from "vitest";
import type {
  ComponentBlock,
  ComponentOutputDefinition,
  PageModel,
} from "../types/page";
import { createPageRuntimeStore } from "./pageRuntimeStore";

const table = (
  id: string,
  outputs: ComponentOutputDefinition[] = [],
): ComponentBlock => ({
  id,
  type: "table",
  outputs,
});

const output = (
  id: string,
  type: ComponentOutputDefinition["type"] = "string",
): ComponentOutputDefinition => ({
  id,
  key: `${id}Key`,
  type,
  source: { kind: "tableSearch" },
});

const pageWith = (
  components: ComponentBlock[],
  extra: Partial<PageModel> = {},
): PageModel => ({
  name: "Runtime page",
  sections: [
    {
      id: "section",
      cells: [{ id: "cell", row: 0, column: 0, components }],
    },
  ],
  ...extra,
});

describe("createPageRuntimeStore", () => {
  it("initializes variables and all declared outputs without breaking legacy pages", () => {
    const page = pageWith([table("products", [output("search")])], {
      variables: [
        { id: "ready", key: "ready", type: "string", initialValue: "yes" },
        { id: "waiting", key: "waiting", type: "number" },
      ],
    });

    const snapshot = createPageRuntimeStore(page).getSnapshot();

    expect(snapshot.pageFilters).toEqual({});
    expect(snapshot.pageVariables.ready).toEqual({
      status: "available",
      value: "yes",
    });
    expect(snapshot.pageVariables.waiting).toEqual({ status: "unavailable" });
    expect(snapshot.components.products.outputs.search).toEqual({
      status: "unavailable",
    });
    expect(
      createPageRuntimeStore({ name: "Legacy", sections: [] }).getSnapshot(),
    ).toEqual({ pageFilters: {}, pageVariables: {}, components: {} });
  });

  it("initializes and updates page filters", () => {
    const store = createPageRuntimeStore(
      pageWith([], {
        filters: [
          {
            id: "pfl_status",
            key: "status",
            label: "Status",
            type: "string",
            defaultValue: "open",
            placement: { kind: "navbar" },
          },
        ],
      }),
    );

    expect(store.getSnapshot().pageFilters.pfl_status).toEqual({
      status: "available",
      value: "open",
    });

    const before = store.getSnapshot();
    store.setPageFilterValue("pfl_status", "closed");
    const after = store.getSnapshot();

    expect(after.pageFilters.pfl_status).toEqual({
      status: "available",
      value: "closed",
    });
    expect(after.pageFilters).not.toBe(before.pageFilters);
    expect(after.pageVariables).toBe(before.pageVariables);
    expect(after.components).toBe(before.components);
  });

  it("initializes and updates single-date page filters", () => {
    const store = createPageRuntimeStore(
      pageWith([], {
        filters: [
          {
            id: "pfl_date",
            key: "date",
            label: "Date",
            type: "date",
            defaultValue: "2026-07-08T00:00:00.000Z",
            placement: { kind: "navbar" },
          },
        ],
      }),
    );

    expect(store.getSnapshot().pageFilters.pfl_date).toEqual({
      status: "available",
      value: "2026-07-08T00:00:00.000Z",
    });

    store.setPageFilterValue("pfl_date", "2026-07-09T00:00:00.000Z");

    expect(store.getSnapshot().pageFilters.pfl_date).toEqual({
      status: "available",
      value: "2026-07-09T00:00:00.000Z",
    });
  });

  it("initializes date and date-range page filters from dynamic presets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T15:30:00.000Z"));
    try {
      const store = createPageRuntimeStore(
        pageWith([], {
          filters: [
            {
              id: "pfl_today",
              key: "today",
              label: "Today",
              type: "date",
              defaultPreset: "today",
              placement: { kind: "navbar" },
            },
            {
              id: "pfl_year",
              key: "year",
              label: "This year",
              type: "dateRange",
              defaultPreset: "thisYear",
              placement: { kind: "navbar" },
            },
          ],
        }),
      );

      expect(store.getSnapshot().pageFilters.pfl_today).toEqual({
        status: "available",
        value: "2026-07-08T00:00:00.000Z",
      });
      expect(store.getSnapshot().pageFilters.pfl_year).toEqual({
        status: "available",
        value: {
          start: "2026-01-01T00:00:00.000Z",
          end: "2026-12-31T23:59:59.999Z",
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("publishes by cloning only the affected snapshot branches", () => {
    const store = createPageRuntimeStore(
      pageWith([
        table("products", [output("search"), output("secondary")]),
        table("orders", [output("orderSearch")]),
      ]),
    );
    const before = store.getSnapshot();

    store.publishOutput("products", "products", "search", "needle");
    const after = store.getSnapshot();

    expect(after).not.toBe(before);
    expect(after.pageFilters).toBe(before.pageFilters);
    expect(after.pageVariables).toBe(before.pageVariables);
    expect(after.components).not.toBe(before.components);
    expect(after.components.products).not.toBe(before.components.products);
    expect(after.components.products.outputs).not.toBe(
      before.components.products.outputs,
    );
    expect(after.components.products.outputs.secondary).toBe(
      before.components.products.outputs.secondary,
    );
    expect(after.components.orders).toBe(before.components.orders);
    expect(after.components.products.outputs.search).toEqual({
      status: "available",
      value: "needle",
    });
  });

  it("notifies listeners only for changes and supports unsubscribe", () => {
    const store = createPageRuntimeStore(
      pageWith([table("products", [output("search")])]),
    );
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.publishOutput("products", "products", "search", "needle");
    store.publishOutput("products", "products", "search", "needle");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.markOutputUnavailable("products", "products", "search");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps selectors of untouched branches referentially stable", () => {
    const store = createPageRuntimeStore(
      pageWith([
        table("products", [output("search")]),
        table("orders", [output("orderSearch")]),
      ]),
    );
    const beforeOrders = store.getSnapshot().components.orders;

    store.publishOutput("products", "products", "search", "needle");

    expect(store.getSnapshot().components.orders).toBe(beforeOrders);
  });

  it("rejects non-owner, unknown, and inherited publishers without notifying", () => {
    const store = createPageRuntimeStore(
      pageWith([
        table("products", [output("search")]),
        table("other"),
      ]),
    );
    const listener = vi.fn();
    store.subscribe(listener);

    expect(() =>
      store.publishOutput("other", "products", "search", "needle"),
    ).toThrow("cannot publish output owned by products");
    expect(() =>
      store.publishOutput("missing", "products", "search", "needle"),
    ).toThrow("Publisher component");
    expect(() =>
      store.publishOutput("products", "missing", "search", "needle"),
    ).toThrow("Owner component");
    expect(() =>
      store.publishOutput("products", "products", "missing", "needle"),
    ).toThrow("Output");
    expect(() =>
      store.publishOutput("toString", "products", "search", "needle"),
    ).toThrow("Publisher component");
    expect(listener).not.toHaveBeenCalled();
  });

  it("validates owner definitions and values before publication", () => {
    expect(() =>
      createPageRuntimeStore(
        pageWith([
          { id: "notTable", type: "text", outputs: [output("search")] },
        ]),
      ),
    ).toThrow("table component");
    expect(() =>
      createPageRuntimeStore(
        pageWith([
          table("products", [
            {
              ...output("search"),
              source: { kind: "tableSearch" },
              type: "number",
            },
          ]),
        ]),
      ),
    ).toThrow("tableSearch");
    expect(() =>
      createPageRuntimeStore(
        pageWith([
          table("products", [
            {
              ...output("search"),
              source: { kind: "tableFilter", filterId: "" },
            },
          ]),
        ]),
      ),
    ).toThrow("source");

    const store = createPageRuntimeStore(
      pageWith([
        table("products", [
          output("search"),
          {
            ...output("selected", "numberArray"),
            source: { kind: "tableSelectedIds" },
          },
        ]),
      ]),
    );
    expect(() =>
      store.publishOutput("products", "products", "search", 1),
    ).toThrow('does not match type "string"');
    expect(() =>
      store.publishOutput(
        "products",
        "products",
        "selected",
        [1, Number.NaN],
      ),
    ).toThrow('does not match type "numberArray"');
  });

  it("preserves available null with the same runtime semantics as the resolver", () => {
    const store = createPageRuntimeStore(
      pageWith([table("products", [output("search")])]),
    );

    store.publishOutput("products", "products", "search", null);

    expect(store.getSnapshot().components.products.outputs.search).toEqual({
      status: "available",
      value: null,
    });
  });

  it.each([
    ["empty object", {}],
    ["empty start", { start: "", end: "2026-02-01T00:00:00Z" }],
    [
      "non-ISO start",
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
      "reversed bounds",
      {
        start: "2026-02-01T00:00:00Z",
        end: "2026-01-01T00:00:00Z",
      },
    ],
  ])("rejects publication of a dateRange with %s", (_name, value) => {
    const store = createPageRuntimeStore(
      pageWith([
        table("products", [
          {
            ...output("range", "dateRange"),
            source: { kind: "tableFilter", filterId: "createdAt" },
          },
        ]),
      ]),
    );

    expect(() =>
      store.publishOutput("products", "products", "range", value),
    ).toThrow('does not match type "dateRange"');
  });

  it("publishes increasing dateRanges with Z and explicit offsets", () => {
    const store = createPageRuntimeStore(
      pageWith([
        table("products", [
          {
            ...output("range", "dateRange"),
            source: { kind: "tableFilter", filterId: "createdAt" },
          },
        ]),
      ]),
    );
    const range = {
      start: "2026-01-01T00:00:00.000-06:00",
      end: "2026-01-01T07:00:00Z",
    };

    store.publishOutput("products", "products", "range", range);

    expect(store.getSnapshot().components.products.outputs.range).toEqual({
      status: "available",
      value: range,
    });
  });

  it("detaches and freezes caller-owned structured output values", () => {
    const store = createPageRuntimeStore(
      pageWith([
        table("products", [
          {
            ...output("selected", "numberArray"),
            source: { kind: "tableSelectedIds" },
          },
          {
            ...output("range", "dateRange"),
            source: { kind: "tableFilter", filterId: "createdAt" },
          },
        ]),
      ]),
    );
    const selected = [1, 2];
    const range = {
      start: "2026-01-01T00:00:00Z",
      end: "2026-02-01T00:00:00Z",
      preset: "month",
    };

    store.publishOutput("products", "products", "selected", selected);
    store.publishOutput("products", "products", "range", range);
    selected.push(3);
    range.preset = "mutated";

    const outputs = store.getSnapshot().components.products.outputs;
    expect(outputs.selected).toEqual({ status: "available", value: [1, 2] });
    expect(outputs.range).toEqual({
      status: "available",
      value: {
        start: "2026-01-01T00:00:00Z",
        end: "2026-02-01T00:00:00Z",
        preset: "month",
      },
    });
    expect(Object.isFrozen(outputs.selected)).toBe(true);
    expect(
      outputs.selected.status === "available" &&
        Object.isFrozen(outputs.selected.value),
    ).toBe(true);
    expect(Object.isFrozen(outputs.range)).toBe(true);
    expect(
      outputs.range.status === "available" &&
        Object.isFrozen(outputs.range.value),
    ).toBe(true);
    expect(() => {
      if (outputs.selected.status === "available") {
        (outputs.selected.value as number[]).push(4);
      }
    }).toThrow(TypeError);
    expect(() => {
      if (outputs.range.status === "available") {
        (outputs.range.value as { preset?: string }).preset = "changed";
      }
    }).toThrow(TypeError);
  });

  it("freezes every snapshot branch and preserves null-prototype dictionaries", () => {
    const store = createPageRuntimeStore(
      pageWith([table("products", [output("search")])]),
    );
    store.publishOutput("products", "products", "search", "needle");
    const snapshot = store.getSnapshot();
    const component = snapshot.components.products;
    const runtimeValue = component.outputs.search;

    [
      snapshot,
      snapshot.pageFilters,
      snapshot.pageVariables,
      snapshot.components,
      component,
      component.outputs,
      runtimeValue,
    ].forEach((branch) => expect(Object.isFrozen(branch)).toBe(true));
    expect(Object.getPrototypeOf(snapshot.pageFilters)).toBeNull();
    expect(Object.getPrototypeOf(snapshot.pageVariables)).toBeNull();
    expect(Object.getPrototypeOf(snapshot.components)).toBeNull();
    expect(Object.getPrototypeOf(component.outputs)).toBeNull();

    expect(() => {
      (snapshot.components as Record<string, unknown>).intruder = {};
    }).toThrow(TypeError);
    expect(() => {
      (component.outputs as Record<string, unknown>).search = {
        status: "unavailable",
      };
    }).toThrow(TypeError);
    expect(() => {
      (runtimeValue as { status: string }).status = "unavailable";
    }).toThrow(TypeError);
    expect(store.getSnapshot().components.products.outputs.search).toEqual({
      status: "available",
      value: "needle",
    });
  });

  it("validates, detaches, and freezes structured initial variable values", () => {
    const selected = ["a", "b"];
    const range = {
      start: "2026-01-01T00:00:00Z",
      end: "2026-02-01T00:00:00Z",
    };
    const store = createPageRuntimeStore(
      pageWith([], {
        variables: [
          {
            id: "selected",
            key: "selected",
            type: "stringArray",
            initialValue: selected,
          },
          {
            id: "range",
            key: "range",
            type: "dateRange",
            initialValue: range,
          },
        ],
      }),
    );
    selected.push("c");
    range.end = "2027-01-01T00:00:00Z";

    const variables = store.getSnapshot().pageVariables;
    expect(variables.selected).toEqual({
      status: "available",
      value: ["a", "b"],
    });
    expect(variables.range).toEqual({
      status: "available",
      value: {
        start: "2026-01-01T00:00:00Z",
        end: "2026-02-01T00:00:00Z",
      },
    });
    expect(Object.isFrozen(variables.selected)).toBe(true);
    expect(
      variables.selected.status === "available" &&
        Object.isFrozen(variables.selected.value),
    ).toBe(true);
    expect(() => {
      if (variables.selected.status === "available") {
        (variables.selected.value as string[]).push("mutated");
      }
    }).toThrow(TypeError);
    expect(() =>
      createPageRuntimeStore(
        pageWith([], {
          variables: [
            {
              id: "invalid",
              key: "invalid",
              type: "numberArray",
              initialValue: [1, Number.NaN],
            },
          ],
        }),
      ),
    ).toThrow('does not match type "numberArray"');
  });

  it("notifies a stable listener snapshot during reentrant subscription changes", () => {
    const store = createPageRuntimeStore(
      pageWith([table("products", [output("search")])]),
    );
    const calls: string[] = [];
    const late = () => calls.push("late");
    let unsubscribeFirst: () => void = () => undefined;
    unsubscribeFirst = store.subscribe(() => {
      calls.push("first");
      unsubscribeFirst();
      store.subscribe(late);
    });
    store.subscribe(() => calls.push("second"));

    store.publishOutput("products", "products", "search", "first");
    expect(calls).toEqual(["first", "second"]);

    store.publishOutput("products", "products", "search", "second");
    expect(calls).toEqual(["first", "second", "second", "late"]);
  });

  it("supports own IDs named __proto__ and constructor safely", () => {
    const store = createPageRuntimeStore(
      pageWith([
        table("__proto__", [output("constructor")]),
        table("constructor", [output("__proto__")]),
      ]),
    );

    store.publishOutput("__proto__", "__proto__", "constructor", "first");
    store.publishOutput("constructor", "constructor", "__proto__", "second");

    expect(
      store.getSnapshot().components["__proto__"].outputs.constructor,
    ).toEqual({ status: "available", value: "first" });
    expect(
      store.getSnapshot().components["constructor"].outputs["__proto__"],
    ).toEqual({ status: "available", value: "second" });
  });

  it("marks outputs unavailable with ownership checks and no-op stability", () => {
    const store = createPageRuntimeStore(
      pageWith([
        table("products", [output("search")]),
        table("other"),
      ]),
    );
    const listener = vi.fn();
    store.subscribe(listener);
    const initial = store.getSnapshot();

    store.markOutputUnavailable("products", "products", "search");
    expect(store.getSnapshot()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
    expect(() =>
      store.markOutputUnavailable("other", "products", "search"),
    ).toThrow("cannot publish output owned by products");

    store.publishOutput("products", "products", "search", "needle");
    store.markOutputUnavailable("products", "products", "search");
    expect(store.getSnapshot().components.products.outputs.search).toEqual({
      status: "unavailable",
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("traverses section, grid, flat cells, tabs, component tabs, and subpages", () => {
    const componentTabChild = table("component-tab", [output("out")]);
    const page: PageModel = {
      name: "All layouts",
      sections: [
        {
          component: {
            id: "direct",
            type: "tabPanel",
            tabs: [
              { title: "nested", components: [componentTabChild] },
            ],
          },
        },
        {
          grid: {
            columns: 1,
            cells: [
              {
                id: "grid",
                row: 0,
                column: 0,
                components: [table("grid", [output("out")])],
              },
            ],
          },
          cells: [
            {
              id: "flat",
              row: 0,
              column: 0,
              components: [table("flat", [output("out")])],
            },
          ],
        },
        {
          tabs: {
            tabs: [
              {
                id: "page-tab",
                label: "tab",
                order: 0,
                sections: [
                  {
                    component: table("page-tab-child", [output("out")]),
                  },
                ],
              },
            ],
          },
        },
      ],
      subPage: pageWith([table("subpage", [output("out")])]),
    };

    expect(Object.keys(createPageRuntimeStore(page).getSnapshot().components))
      .toEqual(
        expect.arrayContaining([
          "direct",
          "component-tab",
          "grid",
          "flat",
          "page-tab-child",
          "subpage",
        ]),
      );
  });

  it("rejects duplicate IDs and cyclic malformed page data clearly", () => {
    expect(() =>
      createPageRuntimeStore(
        pageWith([table("duplicate"), table("duplicate")]),
      ),
    ).toThrow("duplicate");

    const cyclicPage = pageWith([]);
    cyclicPage.subPage = cyclicPage;
    expect(() => createPageRuntimeStore(cyclicPage)).toThrow("cycle");

    const cyclicComponent = table("cyclic") as ComponentBlock & {
      tabs: Array<{ title: string; components: ComponentBlock[] }>;
    };
    cyclicComponent.tabs = [
      { title: "cycle", components: [cyclicComponent] },
    ];
    expect(() =>
      createPageRuntimeStore(pageWith([cyclicComponent])),
    ).toThrow("cycle");
  });
});
