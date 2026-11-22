import { describe, expect, it } from "vitest";
import {
  formatArrayCellValue,
  formatCurrencyCellValue,
  formatGrowthPercentageCellValue,
  formatNumberCellValue,
  formatPercentageCellValue,
  formatPopulatedObjectArrayCellValue,
  formatPopulatedObjectCellValue,
} from "./cellFormatters";

describe("cellFormatters", () => {
  it("formats number, currency, and percentage cell values", () => {
    expect(formatNumberCellValue(undefined)).toBeNull();
    expect(formatNumberCellValue("")).toBeNull();
    expect(formatNumberCellValue("abc")).toBe("abc");
    expect(formatNumberCellValue(42)).toBe((42).toLocaleString());

    expect(formatCurrencyCellValue(null)).toBeNull();
    expect(formatCurrencyCellValue("n/a")).toBe("n/a");
    expect(formatCurrencyCellValue(12.5)).toBe(
      (12.5).toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );

    expect(formatPercentageCellValue(undefined)).toBeNull();
    expect(formatPercentageCellValue(25)).toBe(`${(25).toLocaleString()}%`);
    expect(formatPercentageCellValue("bad")).toBe("bad");
  });

  it("formats growth percentage presentation for positive, negative, zero, empty, and non-numeric values", () => {
    expect(formatGrowthPercentageCellValue("")).toEqual({ kind: "empty" });
    expect(formatGrowthPercentageCellValue("oops")).toEqual({
      kind: "raw",
      text: "oops",
    });
    expect(formatGrowthPercentageCellValue(10)).toEqual({
      kind: "formatted",
      arrow: "↑",
      sign: "+",
      formattedNumber: (10).toLocaleString(),
      color: "#2e7d32",
    });
    expect(formatGrowthPercentageCellValue(-5)).toEqual({
      kind: "formatted",
      arrow: "↓",
      sign: "",
      formattedNumber: (-5).toLocaleString(),
      color: "#c62828",
    });
    expect(formatGrowthPercentageCellValue(0)).toEqual({
      kind: "formatted",
      arrow: "→",
      sign: "",
      formattedNumber: (0).toLocaleString(),
      color: "#827717",
    });
  });

  it("formats array, populated object, and populated object array cell values", () => {
    expect(formatArrayCellValue(["a", "b"])).toBe("a, b");
    expect(formatArrayCellValue("")).toBe("");

    expect(
      formatPopulatedObjectCellValue({ _id: "1", first: "Ada", last: "Lovelace" }, [
        "first",
        "last",
      ]),
    ).toBe("Ada - Lovelace");
    expect(formatPopulatedObjectCellValue({ _id: "1" }, ["missing"])).toBe("1");
    expect(formatPopulatedObjectCellValue("raw-id", ["name"])).toBe("raw-id");

    expect(
      formatPopulatedObjectArrayCellValue(
        [{ _id: "1", name: "Alpha" }, "2", "3"],
        ["name"],
        "label",
        [{ _id: "2", label: "Beta" }],
      ),
    ).toBe("Alpha, Beta, 3");
  });
});
