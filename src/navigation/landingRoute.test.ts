import { describe, expect, it } from "vitest";
import { getPreferredLandingPath } from "./landingRoute";

describe("getPreferredLandingPath", () => {
  it("uses the configured main page before other routes", () => {
    expect(
      getPreferredLandingPath([
        { name: "Audit Logs", path: "/audit-logs", isOnSidebar: true },
        {
          name: "Sales Reports",
          path: "/reports",
          isOnSidebar: true,
          isMainPage: true,
        },
      ]),
    ).toBe("/reports");
  });

  it("falls back to the first available child route when no main page exists", () => {
    expect(
      getPreferredLandingPath([
        {
          name: "Reports",
          isOnSidebar: true,
          children: [
            { name: "Monthly Sales", path: "/monthly-sales", isOnSidebar: true },
          ],
        },
        { name: "Audit Logs", path: "/audit-logs", isOnSidebar: true },
      ]),
    ).toBe("/monthly-sales");
  });

  it("ignores group-only routes when selecting the main page", () => {
    expect(
      getPreferredLandingPath([
        {
          name: "Reports",
          isOnSidebar: true,
          isMainPage: true,
          children: [
            { name: "Monthly Sales", path: "/monthly-sales", isOnSidebar: true },
          ],
        },
      ]),
    ).toBe("/monthly-sales");
  });
});
