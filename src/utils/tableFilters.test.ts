import { describe, expect, it } from "vitest";
import { InputTypes } from "../components/panelComponents/shared/types";
import type { TableFilterPanelInputConfig } from "../types/page";
import {
  buildConfiguredFilterInputs,
  getFilterDefaultValues,
} from "./tableFilters";

describe("configured relation-matrix filter inputs", () => {
  it("builds text and schema-backed select inputs with configured fields", () => {
    const fields: TableFilterPanelInputConfig[] = [
      { formKey: "name", type: "text", label: "Product" },
      {
        formKey: "category",
        type: "select",
        label: "Category",
        optionsSource: "schema",
        sourceValueField: "code",
        sourceLabelField: "title",
      },
    ];
    const selectionData = new Map([
      ["filterPanel:category", [{ _id: "cat-1", code: "tea", title: "Tea" }]],
    ]);

    expect(buildConfiguredFilterInputs(fields, [], selectionData)).toEqual([
      expect.objectContaining({
        type: InputTypes.TEXT,
        formKey: "name",
        label: "Product",
      }),
      expect.objectContaining({
        type: InputTypes.SELECT,
        formKey: "category",
        options: [{
          value: "tea",
          label: "Tea",
          sourceItem: { _id: "cat-1", code: "tea", title: "Tea" },
        }],
      }),
    ]);
  });

  it("returns configured literal default values", () => {
    expect(getFilterDefaultValues([
      { formKey: "status", type: "select", defaultValue: "active" },
      { formKey: "minimum", type: "number", defaultValue: 0 },
      { formKey: "empty", type: "text" },
    ])).toEqual({ status: "active", minimum: 0 });
  });
});
