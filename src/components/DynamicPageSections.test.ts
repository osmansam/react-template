import { describe, expect, it } from "vitest";
import { getTableConfig } from "../utils/dynamicPageTableConfig";

describe("getTableConfig", () => {
  it("treats bulkActions-only props as table config", () => {
    const config = getTableConfig(undefined, {
      bulkActions: {
        edit: { kind: "update", label: "Edit Selected" },
      },
    });

    expect(config?.bulkActions?.edit?.label).toBe("Edit Selected");
  });

  it("merges bulkActions from props when component table config exists", () => {
    const config = getTableConfig(
      {
        columns: [{ field: "name", displayName: "Name" }],
      },
      {
        bulkActions: {
          delete: { kind: "delete", label: "Delete Selected" },
        },
      },
    );

    expect(config?.columns?.[0]?.field).toBe("name");
    expect(config?.bulkActions?.delete?.label).toBe("Delete Selected");
  });
});
