import { describe, expect, it } from "vitest";
import { getLoginConfigFieldLabel } from "./auth";

describe("login config metadata", () => {
  it("uses projected display labels without requiring container frontend metadata", () => {
    expect(
      getLoginConfigFieldLabel({
        name: "email",
        type: "email",
        displayName: "Email Address",
      }),
    ).toBe("Email Address");
  });

  it("falls back to the field name", () => {
    expect(getLoginConfigFieldLabel({ name: "password", type: "text" })).toBe(
      "password",
    );
  });
});
