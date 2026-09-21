import { describe, expect, it, vi } from "vitest";
import { invalidateDynamicMutationQueries } from "./dynamic";

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
