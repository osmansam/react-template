import { describe, expect, it, vi } from "vitest";
import {
  invalidateDynamicMutationQueries,
  shouldInvalidateAfterDynamicUpdate,
} from "./dynamic";

describe("invalidateDynamicMutationQueries", () => {
  it("invalidates a schema once after a mutation", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);

    await invalidateDynamicMutationQueries(
      { invalidateQueries },
      "category",
    );

    expect(invalidateQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dynamic", "category"],
    });
  });
});

describe("shouldInvalidateAfterDynamicUpdate", () => {
  it("leaves successful update refreshes to the WebSocket", () => {
    expect(shouldInvalidateAfterDynamicUpdate(null)).toBe(false);
  });

  it("allows a fallback refresh when an update fails", () => {
    expect(shouldInvalidateAfterDynamicUpdate(new Error("failed"))).toBe(true);
  });
});
