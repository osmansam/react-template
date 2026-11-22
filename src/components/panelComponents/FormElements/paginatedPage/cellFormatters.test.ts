import { describe, expect, it } from "vitest";
import { type Field, Types } from "../../../../utils/api/container";
import {
  formatObjectIdArrayContent,
  formatPopulatedObjectContent,
} from "./cellFormatters";

describe("cellFormatters", () => {
  describe("formatPopulatedObjectContent", () => {
    it("joins displayFields and falls back to _id or primitive string", () => {
      expect(
        formatPopulatedObjectContent(
          { _id: "1", first: "Ada", last: "Lovelace" },
          ["first", "last"],
        ),
      ).toBe("Ada - Lovelace");
      expect(formatPopulatedObjectContent({ _id: "1" }, ["first"])).toBe("1");
      expect(formatPopulatedObjectContent("raw-id", ["first"])).toBe("raw-id");
    });
  });

  describe("formatObjectIdArrayContent", () => {
    const field: Field = {
      name: "tags",
      type: Types.ObjectIdArray,
      populationSettings: {
        fieldName: "tags",
        populatedFields: ["name"],
        displayFields: ["name"],
        displayLabel: "Tags",
        inputSelectionField: "name",
      },
    };

    it("resolves string ids via selectionDataMap and formats populated objects", () => {
      const selectionDataMap = new Map<string, Array<Record<string, unknown>>>([
        [
          "tags",
          [
            { _id: "t1", name: "Alpha" },
            { _id: "t2", name: "Beta" },
          ],
        ],
      ]);

      expect(
        formatObjectIdArrayContent(["t1", "t2", "unknown"], field, selectionDataMap),
      ).toBe("Alpha, Beta, unknown");

      expect(
        formatObjectIdArrayContent(
          [{ _id: "t1", name: "Alpha" }],
          field,
          selectionDataMap,
        ),
      ).toBe("Alpha");

      expect(formatObjectIdArrayContent([], field, selectionDataMap)).toBe("");
    });
  });
});
