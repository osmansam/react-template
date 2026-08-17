import { describe, expect, it } from "vitest";
import { formatPopulatedArrayValue } from "./populatedArrayDisplay";

describe("formatPopulatedArrayValue", () => {
  it("uses the configured display field", () => {
    expect(formatPopulatedArrayValue(
      [{ _id: "role-1", name: "admin" }],
      ["name"],
    )).toBe("admin");
  });

  it("falls back to name instead of rendering object Object", () => {
    expect(formatPopulatedArrayValue(
      [{ _id: "role-1", name: "admin" }],
      [],
    )).toBe("admin");
  });
});
