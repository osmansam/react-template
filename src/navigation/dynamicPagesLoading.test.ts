import { describe, expect, it } from "vitest";
import { shouldLoadDynamicPages } from "./dynamicPagesLoading";

describe("dynamic page loading", () => {
  it("does not fetch pages on tenant login routes", () => {
    expect(
      shouldLoadDynamicPages("/t/acme/p/retailerv2/login", false),
    ).toBe(false);
    expect(
      shouldLoadDynamicPages(
        "/t/acme/p/retailerv2/login",
        true,
      ),
    ).toBe(false);
  });

  it("loads private dynamic pages from HTTP-only cookie login state", () => {
    expect(shouldLoadDynamicPages("/t/acme/p/retailerv2/orders", false)).toBe(
      false,
    );
    expect(
      shouldLoadDynamicPages("/t/acme/p/retailerv2/orders", true),
    ).toBe(true);
  });
});
