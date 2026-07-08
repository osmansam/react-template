import { describe, expect, it, vi } from "vitest";
import {
  getPostGoogleLoginRedirectPath,
  redirectAfterGoogleLogin,
  refreshAfterGoogleLogin,
} from "./googleCallbackAuth";

describe("refreshAfterGoogleLogin", () => {
  it("refreshes cached queries before Google login redirects", async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await refreshAfterGoogleLogin(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledOnce();
  });

  it("redirects Google popup login to tenant root so fresh routes choose the main page", () => {
    expect(
      getPostGoogleLoginRedirectPath((path) => `/t/acme/p/sales${path}`),
    ).toBe("/t/acme/p/sales/");
  });

  it("uses a full-page redirect after Google login", () => {
    const redirect = vi.fn();

    redirectAfterGoogleLogin((path) => `/t/acme/p/sales${path}`, redirect);

    expect(redirect).toHaveBeenCalledWith("/t/acme/p/sales/");
  });
});
