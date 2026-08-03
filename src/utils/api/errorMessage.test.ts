import { describe, expect, it } from "vitest";
import { getApiErrorMessage, notifyApiError } from "./errorMessage";

describe("getApiErrorMessage", () => {
  it("returns the backend message for failed login and validation responses", () => {
    expect(
      getApiErrorMessage({
        response: {
          data: {
            status: 400,
            message: "Email Address should be a valid email address",
            data: null,
          },
        },
      }),
    ).toBe("Email Address should be a valid email address");
  });

  it("uses a safe fallback when the response has no usable message", () => {
    expect(getApiErrorMessage(new Error("Network Error"))).toBe(
      "Network Error",
    );
    expect(getApiErrorMessage({})).toBe("An unexpected error occurred");
  });
});

describe("notifyApiError", () => {
  it("shows the translated backend login message exactly once", () => {
    const shown: string[] = [];

    notifyApiError(
      { response: { data: { message: "Invalid login credentials." } } },
      (message) => `translated:${message}`,
      (message) => shown.push(message),
      "Login failed",
    );

    expect(shown).toEqual(["translated:Invalid login credentials."]);
  });
});
