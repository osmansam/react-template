import { describe, expect, it } from "vitest";
import { resolveTableActionFormLayout } from "./tableActionFormLayout";

describe("resolveTableActionFormLayout", () => {
  it("keeps defaults for old action configurations", () => {
    expect(
      resolveTableActionFormLayout(undefined, {
        topClassName: "flex flex-col gap-2",
      }),
    ).toEqual({
      topClassName: "flex flex-col gap-2",
      generalClassName: undefined,
    });
  });

  it("resolves the saved layout independently for an action", () => {
    expect(
      resolveTableActionFormLayout({
        formLayout: {
          columns: 4,
          allowOverflow: true,
          topClassName: "items-start",
        },
      }),
    ).toEqual({
      topClassName:
        "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start",
      generalClassName: "overflow-visible",
    });
  });

  it("allows an action to turn off the legacy overflow default", () => {
    expect(
      resolveTableActionFormLayout(
        { formLayout: { allowOverflow: false } },
        { generalClassName: "overflow-visible" },
      ),
    ).toEqual({
      topClassName: undefined,
      generalClassName: undefined,
    });
  });
});
