import { describe, expect, it } from "vitest";
import {
  getDynamicItemsQueryEntries,
  getDynamicItemsQueryKey,
  getTableSourceQueryEntries,
  getTableSourceQueryKey,
  normalizeJsonRequestValue,
  normalizeQueryEntries,
  serializeQueryEntries,
} from "./dynamicQueryKeys";

const binding = {
  kind: "pipeline" as const,
  schemaName: "orders",
  pipelineName: "summary",
  fields: ["total"],
  params: { tenant: "legacy", limit: 5 },
};

describe("getTableSourceQueryKey", () => {
  it("changes when resolved values change", () => {
    const first = getTableSourceQueryKey(1, 20, binding, {}, { tenant: "a" });
    const second = getTableSourceQueryKey(1, 20, binding, {}, { tenant: "b" });

    expect(first).not.toEqual(second);
  });

  it("changes when source revision changes with identical values", () => {
    const first = getTableSourceQueryKey(1, 20, binding, {}, {}, "revision-a");
    const second = getTableSourceQueryKey(1, 20, binding, {}, {}, "revision-b");

    expect(first).not.toEqual(second);
  });

  it("is stable across object insertion order", () => {
    const first = getTableSourceQueryKey(
      1,
      20,
      binding,
      { nested: { a: 1, b: 2 } },
      { range: { start: "2026-01-01", end: "2026-01-31" } },
    );
    const second = getTableSourceQueryKey(
      1,
      20,
      binding,
      { nested: { b: 2, a: 1 } },
      { range: { end: "2026-01-31", start: "2026-01-01" } },
    );

    expect(first).toEqual(second);
  });

  it("keeps source identity independent from binding aliases", () => {
    const first = getTableSourceQueryKey(1, 20, binding, {}, { region: "west" });
    const second = getTableSourceQueryKey(
      1,
      20,
      ({
        ...binding,
        parameters: {
          renamedDisplayKey: {
            source: "component",
            componentId: "filters",
            outputId: "region",
          },
        },
      } as typeof binding & { parameters: Record<string, unknown> }),
      {},
      { region: "west" },
    );

    expect(first).toEqual(second);
  });

  it("merges legacy and resolved params with resolved values winning", () => {
    const entries = getTableSourceQueryEntries(
      1,
      20,
      binding,
      {},
      { tenant: "resolved", region: "west" },
    );

    expect(entries).toContainEqual(["tenant", "resolved"]);
    expect(entries).toContainEqual(["region", "west"]);
    expect(entries).not.toContainEqual(["tenant", "legacy"]);
  });

  it("preserves array order", () => {
    const first = getTableSourceQueryKey(1, 20, binding, {}, { ids: ["a", "b"] });
    const second = getTableSourceQueryKey(1, 20, binding, {}, { ids: ["b", "a"] });

    expect(first).not.toEqual(second);
  });

  it("handles prototype-sensitive parameter names safely", () => {
    const resolved = Object.create(null) as Record<string, unknown>;
    resolved["__proto__"] = "literal";
    resolved["constructor"] = "named";

    expect(() =>
      getTableSourceQueryKey(1, 20, binding, {}, resolved),
    ).not.toThrow();
    expect(getTableSourceQueryKey(1, 20, binding, {}, resolved)).not.toEqual(
      getTableSourceQueryKey(1, 20, binding, {}, {}),
    );
  });

  it("uses the exact transmitted normalization for cache identity", () => {
    const date = new Date("2026-02-03T04:05:06.000Z");
    const noisy = getTableSourceQueryKey(
      1,
      20,
      binding,
      { status: "  active  ", omitted: null },
      {
        ids: [" first ", null, "", undefined, " second "],
        date,
        empty: "",
        missing: undefined,
      },
    );
    const transmitted = getTableSourceQueryKey(
      1,
      20,
      binding,
      { status: "active" },
      {
        ids: ["first", "second"],
        date: date.toISOString(),
      },
    );

    expect(noisy).toEqual(transmitted);
  });

  it("distinguishes actually different transmitted values", () => {
    const first = getTableSourceQueryKey(
      1,
      20,
      binding,
      {},
      { ids: ["a", "b"] },
    );
    const second = getTableSourceQueryKey(
      1,
      20,
      binding,
      {},
      { ids: ["a", "c"] },
    );

    expect(first).not.toEqual(second);
  });

  it("matches filter collision precedence and reserved query semantics", () => {
    const entries = getTableSourceQueryEntries(
      1,
      20,
      binding,
      { tenant: "filter", sort: "createdAt", search: "  invoice " },
      { tenant: "resolved", sort: "ignored", search: "ignored" },
    );

    expect(entries.filter(([key]) => key === "tenant")).toEqual([
      ["tenant", "resolved"],
    ]);
    expect(entries.filter(([key]) => key === "sort")).toEqual([
      ["sort", "createdAt"],
    ]);
    expect(entries.filter(([key]) => key === "search")).toEqual([
      ["search", "invoice"],
    ]);
  });
});

describe("query normalization", () => {
  it("is stable across omission, trimming, dates, arrays, and insertion order", () => {
    const date = new Date("2026-02-03T04:05:06.000Z");
    const first = normalizeQueryEntries({
      z: undefined,
      date,
      tags: [" one ", null, "", " two "],
      name: "  report  ",
    });
    const second = normalizeQueryEntries({
      name: "report",
      tags: ["one", "two"],
      date: date.toISOString(),
      z: null,
    });

    expect(first).toEqual(second);
    expect(serializeQueryEntries(first)).toBe(
      "date=2026-02-03T04%3A05%3A06.000Z&name=report&tags=one&tags=two",
    );
  });

  it("serializes object request values as JSON instead of object string placeholders", () => {
    const entries = normalizeQueryEntries({
      test: {
        start: "2026-07-01T00:00:00.000Z",
        end: "2026-07-31T23:59:59.999Z",
      },
    });

    expect(entries).toEqual([
      [
        "test",
        '{"end":"2026-07-31T23:59:59.999Z","start":"2026-07-01T00:00:00.000Z"}',
      ],
    ]);
    expect(serializeQueryEntries(entries)).not.toContain("[object+Object]");
  });
});

describe("JSON request normalization", () => {
  it("matches Date values to their transmitted ISO strings", () => {
    const date = new Date("2026-02-03T04:05:06.000Z");

    expect(normalizeJsonRequestValue({ date })).toEqual(
      normalizeJsonRequestValue({ date: date.toISOString() }),
    );
  });

  it("matches JSON omission and array null semantics", () => {
    expect(
      normalizeJsonRequestValue({
        omitted: undefined,
        values: [undefined, Number.NaN, Number.POSITIVE_INFINITY],
      }),
    ).toEqual({ values: [null, null, null] });
  });

  it("produces insertion-order-independent canonical values", () => {
    const first = normalizeJsonRequestValue({ outer: { a: 1, b: 2 } });
    const second = normalizeJsonRequestValue({ outer: { b: 2, a: 1 } });

    expect(first).toEqual(second);
  });

  it("rejects values JSON cannot encode with a clear error", () => {
    expect(() => normalizeJsonRequestValue({ value: 1n })).toThrow(
      "Request value is not JSON-serializable.",
    );
    expect(() => normalizeJsonRequestValue(undefined)).toThrow(
      "Request value is not JSON-serializable.",
    );
  });
});

describe("getDynamicItemsQueryKey", () => {
  it("places revision before the canonical transmitted request", () => {
    const key = getDynamicItemsQueryKey(
      "events",
      { category: ["work", "personal"] },
      "container-revision",
    );

    expect(key.slice(0, 4)).toEqual([
      "dynamic",
      "events",
      "all",
      "container-revision",
    ]);
    expect(key).toHaveLength(5);
    expect(key[4]).toBe(
      JSON.stringify([
        "array",
        [
          ["array", [["string", "category"], ["string", "work"]]],
          ["array", [["string", "category"], ["string", "personal"]]],
          ["array", [["string", "schemaName"], ["string", "events"]]],
        ],
      ]),
    );
  });

  it("canonicalizes the exact normalized request semantics", () => {
    const first = getDynamicItemsQueryKey(
      "events",
      {
        omitted: null,
        search: "  launch  ",
        tags: [" one ", undefined, "", " two "],
      },
      "revision",
    );
    const second = getDynamicItemsQueryKey(
      "events",
      { tags: ["one", "two"], search: "launch" },
      "revision",
    );

    expect(first).toEqual(second);
    expect(getDynamicItemsQueryEntries("events", { search: " launch " })).toEqual(
      getDynamicItemsQueryEntries("events", { search: "launch" }),
    );
  });

  it("preserves exact legacy keys without a revision", () => {
    const filters = { category: "work" };

    expect(getDynamicItemsQueryKey("events", filters)).toEqual([
      "dynamic",
      "events",
      "all",
      filters,
    ]);
    expect(getDynamicItemsQueryKey("events")).toEqual([
      "dynamic",
      "events",
      "all",
    ]);
  });
});
