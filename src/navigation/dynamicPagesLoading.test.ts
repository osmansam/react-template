import { describe, expect, it } from "vitest";
import {
  getDynamicPagesAuthFailureRedirect,
  shouldLoadDynamicPages,
} from "./dynamicPagesLoading";

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

  it("redirects a stale tenant session to its scoped login after a 401", () => {
    expect(getDynamicPagesAuthFailureRedirect(
      "/t/davinci/p/goblin",
      { response: { status: 401 } },
    )).toBe("/t/davinci/p/goblin/login");
    expect(getDynamicPagesAuthFailureRedirect(
      "/t/davinci/p/goblin/orders",
      { response: { data: { statusCode: 401 } } },
    )).toBe("/t/davinci/p/goblin/login");
  });

  it("keeps genuine page-loading failures on the error screen", () => {
    expect(getDynamicPagesAuthFailureRedirect(
      "/t/davinci/p/goblin",
      { response: { status: 500 } },
    )).toBeUndefined();
  });
});
