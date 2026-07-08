import { describe, expect, it } from "vitest";
import {
  buildTabInstanceKey,
  canonicalizeTabKeyValue,
} from "./tabInstanceKey";

describe("canonicalizeTabKeyValue", () => {
  it("distinguishes string and number group values", () => {
    expect(canonicalizeTabKeyValue("7")).not.toBe(
      canonicalizeTabKeyValue(7),
    );
  });

  it("canonicalizes records independently of property order", () => {
    expect(canonicalizeTabKeyValue({ status: "open", priority: 2 })).toBe(
      canonicalizeTabKeyValue({ priority: 2, status: "open" }),
    );
  });
});

describe("buildTabInstanceKey", () => {
  it("uses an explicit instance key unchanged", () => {
    expect(
      buildTabInstanceKey(
        {
          schemaName: "orders",
          instanceKey: "component:orders-table",
        },
        4,
      ),
    ).toBe("component:orders-table");
  });

  it("builds a deterministic legacy key from tab configuration", () => {
    const first = buildTabInstanceKey(
      {
        schemaName: "orders",
        label: "Open",
        constantFilter: { status: "open", priority: 2 },
      },
      0,
    );
    const reordered = buildTabInstanceKey(
      {
        schemaName: "orders",
        label: "Open",
        constantFilter: { priority: 2, status: "open" },
      },
      0,
    );

    expect(first).toBe(reordered);
  });

  it("uses the tab index to distinguish otherwise identical legacy tabs", () => {
    const tab = {
      schemaName: "orders",
      label: "Orders",
      constantFilter: { status: "open" },
    };

    expect(buildTabInstanceKey(tab, 0)).not.toBe(
      buildTabInstanceKey(tab, 1),
    );
  });
});
