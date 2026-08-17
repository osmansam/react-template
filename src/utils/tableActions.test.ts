import { describe, expect, it } from "vitest";
import {
  canUseConfiguredBulkSchemaActions,
  getTableActionRowState,
} from "./tableActions";

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

describe("getTableActionRowState", () => {
  it("hides an action when its hidden condition matches the row", () => {
    expect(
      getTableActionRowState(
        { hiddenCondition: "status == 'INACTIVE'" },
        { _id: "row-1", status: "INACTIVE" },
      ),
    ).toEqual({ hidden: true, disabled: false });
  });
});
