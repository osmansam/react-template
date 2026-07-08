import { describe, expect, it } from "vitest";
import type { ComponentOutputDefinition } from "../types/page";
import {
  resolveSelectedRowIds,
  resolveTableOutput,
  type TableOutputState,
} from "./tableOutputAdapter";

const output = (
  source: ComponentOutputDefinition["source"],
  type: ComponentOutputDefinition["type"] = "string",
): ComponentOutputDefinition => ({
  id: "published",
  key: "published",
  type,
  source,
});

const state = (
  overrides: Partial<TableOutputState> = {},
): TableOutputState => ({
  filters: Object.create(null) as Record<string, unknown>,
  search: "",
  ...overrides,
});

describe("resolveTableOutput", () => {
  it("resolves table filters by immutable filter ID", () => {
    const filters = Object.assign(Object.create(null), {
      immutableStatus: "active",
      statusFormKey: "wrong",
    });

    expect(
      resolveTableOutput(
        output({ kind: "tableFilter", filterId: "immutableStatus" }),
        state({ filters }),
      ),
    ).toEqual({ status: "available", value: "active" });
  });

  it("does not resolve a table filter by form key or label", () => {
    expect(
      resolveTableOutput(
        output({ kind: "tableFilter", filterId: "immutableStatus" }),
        state({ filters: { statusFormKey: "active", Status: "active" } }),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("distinguishes a missing table filter from a present null value", () => {
    const definition = output({
      kind: "tableFilter",
      filterId: "nullableDate",
    });

    expect(resolveTableOutput(definition, state())).toEqual({
      status: "unavailable",
    });
    expect(
      resolveTableOutput(
        definition,
        state({ filters: { nullableDate: null } }),
      ),
    ).toEqual({ status: "available", value: null });
    expect(
      resolveTableOutput(
        definition,
        state({ filters: { nullableDate: undefined } }),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("keeps scalar date filter strings scalar", () => {
    expect(
      resolveTableOutput(
        output({ kind: "tableFilter", filterId: "createdOn" }),
        state({ filters: { createdOn: "2026-07-06" } }),
      ),
    ).toEqual({ status: "available", value: "2026-07-06" });
  });

  it("rejects a scalar date filter declared as a date range", () => {
    expect(
      resolveTableOutput(
        output(
          { kind: "tableFilter", filterId: "createdOn" },
          "dateRange",
        ),
        state({ filters: { createdOn: "2026-07-06" } }),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("keeps null available when the shared runtime validator accepts it", () => {
    expect(
      resolveTableOutput(
        output(
          { kind: "tableFilter", filterId: "createdRange" },
          "dateRange",
        ),
        state({ filters: { createdRange: null } }),
      ),
    ).toEqual({ status: "available", value: null });
  });

  it("trims table search and keeps an empty result available", () => {
    const definition = output({ kind: "tableSearch" });

    expect(
      resolveTableOutput(definition, state({ search: "  bicycles  " })),
    ).toEqual({ status: "available", value: "bicycles" });
    expect(
      resolveTableOutput(definition, state({ search: "   " })),
    ).toEqual({ status: "available", value: "" });
  });

  it("keeps selection unavailable until it is initialized", () => {
    expect(
      resolveTableOutput(
        output({ kind: "tableSelectedIds" }, "stringArray"),
        state(),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("publishes initialized selected IDs in their existing order", () => {
    expect(
      resolveTableOutput(
        output({ kind: "tableSelectedIds" }, "numberArray"),
        state({ selectedIds: [9, 3, 7] }),
      ),
    ).toEqual({ status: "available", value: [9, 3, 7] });
    expect(
      resolveTableOutput(
        output({ kind: "tableSelectedIds" }, "stringArray"),
        state({ selectedIds: [] }),
      ),
    ).toEqual({ status: "available", value: [] });
  });

  it("rejects string selected IDs declared as a number array", () => {
    expect(
      resolveTableOutput(
        output({ kind: "tableSelectedIds" }, "numberArray"),
        state({ selectedIds: ["9", "3"] }),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("rejects number selected IDs declared as a string array", () => {
    expect(
      resolveTableOutput(
        output({ kind: "tableSelectedIds" }, "stringArray"),
        state({ selectedIds: [9, 3] }),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("returns unavailable for malformed or unsupported definitions", () => {
    const malformed = { id: "bad" } as ComponentOutputDefinition;
    const malformedType = {
      ...output({ kind: "tableFilter", filterId: "status" }),
      type: "object",
    } as unknown as ComponentOutputDefinition;
    const unsupported = {
      ...output({ kind: "tableSearch" }),
      source: { kind: "chartSelection" },
    } as unknown as ComponentOutputDefinition;

    expect(resolveTableOutput(malformed, state())).toEqual({
      status: "unavailable",
    });
    expect(
      resolveTableOutput(
        malformedType,
        state({ filters: { status: "active" } }),
      ),
    ).toEqual({ status: "unavailable" });
    expect(resolveTableOutput(unsupported, state())).toEqual({
      status: "unavailable",
    });
  });

  it("does not mutate adapter inputs", () => {
    const filters = Object.freeze({ status: "active" });
    const selectedIds = Object.freeze(["b", "a"]);
    const adapterState = Object.freeze({
      filters,
      search: "  query ",
      selectedIds,
    });
    const definition = Object.freeze(
      output({ kind: "tableSelectedIds" }, "stringArray"),
    );

    resolveTableOutput(definition, adapterState);

    expect(adapterState).toEqual({
      filters: { status: "active" },
      search: "  query ",
      selectedIds: ["b", "a"],
    });
    expect(definition.source).toEqual({ kind: "tableSelectedIds" });
  });
});

describe("resolveSelectedRowIds", () => {
  it("returns undefined before selection initializes", () => {
    expect(resolveSelectedRowIds([{ _id: "a" }], false)).toBeUndefined();
  });

  it("returns an empty list for initialized empty selection", () => {
    expect(resolveSelectedRowIds([], true)).toEqual([]);
  });

  it("preserves own non-empty string and finite number IDs in order", () => {
    expect(
      resolveSelectedRowIds(
        [{ _id: "first" }, { _id: 7 }, { _id: "last" }],
        true,
      ),
    ).toEqual(["first", 7, "last"]);
  });

  it.each([
    ["missing", {}],
    ["empty string", { _id: "" }],
    ["non-finite number", { _id: Number.POSITIVE_INFINITY }],
    ["unsupported type", { _id: true }],
  ])("rejects the complete selection when an ID is %s", (_label, row) => {
    expect(
      resolveSelectedRowIds([{ _id: "valid" }, row], true),
    ).toBeUndefined();
  });

  it("rejects prototype-inherited IDs", () => {
    const inheritedId = Object.create({ _id: "inherited" }) as Record<
      string,
      unknown
    >;

    expect(resolveSelectedRowIds([inheritedId], true)).toBeUndefined();
  });
});
