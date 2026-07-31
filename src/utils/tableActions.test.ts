import { describe, expect, it } from "vitest";
import { canUseConfiguredBulkSchemaActions } from "./tableActions";

describe("canUseConfiguredBulkSchemaActions", () => {
  it("allows configured bulk actions for workflow-backed tables with a target schema", () => {
    expect(
      canUseConfiguredBulkSchemaActions(true, {
        kind: "workflow",
        schemaName: "product",
        workflowName: "products-with-external-prices",
      }),
    ).toBe(true);
  });

  it("does not allow configured bulk actions when actions are disabled", () => {
    expect(
      canUseConfiguredBulkSchemaActions(false, {
        kind: "workflow",
        schemaName: "product",
        workflowName: "products-with-external-prices",
      }),
    ).toBe(false);
  });
});
