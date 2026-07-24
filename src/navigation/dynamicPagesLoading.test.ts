import { describe, expect, it, vi } from "vitest";
import { shouldLoadDynamicPages } from "./dynamicPagesLoading";

vi.mock("../utils/jwtUtils", () => ({
  validateTokenForTenantProject: vi.fn(
    (token: string, tenant: string, project: string) =>
      token === `valid:${tenant}:${project}`,
  ),
}));

describe("dynamic page loading", () => {
  it("does not fetch pages on tenant login routes", () => {
    expect(
      shouldLoadDynamicPages("/t/acme/p/retailerv2/login", null),
    ).toBe(false);
    expect(
      shouldLoadDynamicPages(
        "/t/acme/p/retailerv2/login",
        "valid:acme:retailerv2",
      ),
    ).toBe(false);
  });

  it("does not fetch pages until a private route has a valid tenant token", () => {
    expect(shouldLoadDynamicPages("/t/acme/p/retailerv2/orders", null)).toBe(
      false,
    );
    expect(
      shouldLoadDynamicPages("/t/acme/p/retailerv2/orders", "valid:other:project"),
    ).toBe(false);
    expect(
      shouldLoadDynamicPages(
        "/t/acme/p/retailerv2/orders",
        "valid:acme:retailerv2",
      ),
    ).toBe(true);
  });
});
