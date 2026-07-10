import { describe, expect, it, vi } from "vitest";
import { redirectAfterAuth } from "./authRedirect";

describe("redirectAfterAuth", () => {
  it("uses a full page redirect to the tenant project root", () => {
    const redirect = vi.fn();

    redirectAfterAuth((path) => `/t/acme/p/retailer${path}`, redirect);

    expect(redirect).toHaveBeenCalledWith("/t/acme/p/retailer/");
  });
});
