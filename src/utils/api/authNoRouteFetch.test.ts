import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("auth hooks", () => {
  it("do not load dynamic pages while rendering login/register hooks", () => {
    const source = readFileSync(resolve(__dirname, "auth.ts"), "utf8");

    expect(source).not.toContain("useFilteredRoutes");
    expect(source).not.toContain("useDynamicPages");
  });
});
