import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  invalidateDynamicMutationQueries,
  shouldInvalidateAfterDynamicUpdate,
} from "./dynamic";

describe("invalidateDynamicMutationQueries", () => {
  it("invalidates records and selection options for the originating project and schema", async () => {
    const client = new QueryClient();
    const orders = ["dynamic", "team", "alpha", "orders", "all"];
    const options = ["dynamic", "team", "alpha", "selection", "orders", "name"];
    const otherSchema = ["dynamic", "team", "alpha", "users", "all"];
    const otherProject = ["dynamic", "team", "beta", "orders", "all"];
    for (const key of [orders, options, otherSchema, otherProject]) client.setQueryData(key, []);
    await invalidateDynamicMutationQueries(client, "orders", undefined, { tenant: "team", project: "alpha" });
    expect(client.getQueryState(orders)?.isInvalidated).toBe(true);
    expect(client.getQueryState(options)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherSchema)?.isInvalidated).toBe(false);
    expect(client.getQueryState(otherProject)?.isInvalidated).toBe(false);
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
