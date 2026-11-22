import { describe, expect, it } from "vitest";
import { convertValueByType, parseExcelRows } from "./excelUtils";

describe("convertValueByType", () => {
  it("returns null, undefined, and empty string as-is", () => {
    expect(convertValueByType(null, "number")).toBeNull();
    expect(convertValueByType(undefined, "int")).toBeUndefined();
    expect(convertValueByType("", "boolean")).toBe("");
  });

  it("converts stringArray from comma-separated string and arrays", () => {
    expect(convertValueByType("a, b , ,c", "stringArray")).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(convertValueByType(["x", "y"], "string[]")).toEqual(["x", "y"]);
    expect(convertValueByType(123, "array<string>")).toEqual([]);
  });

  it("converts intArray and numberArray", () => {
    expect(convertValueByType("1, 2, bad, 3", "intArray")).toEqual([1, 2, 3]);
    expect(convertValueByType(["4", 5, "x"], "int[]")).toEqual([4, 5]);
    expect(convertValueByType("1.5, 2.25, nan", "numberArray")).toEqual([
      1.5, 2.25,
    ]);
    expect(convertValueByType(["3.5", 4], "number[]")).toEqual([3.5, 4]);
  });

  it("converts numeric, boolean, and date types", () => {
    expect(convertValueByType("42.5", "float")).toBe(42.5);
    expect(convertValueByType("not-a-num", "number")).toBe("not-a-num");
    expect(convertValueByType("true", "boolean")).toBe(true);
    expect(convertValueByType("1", "bool")).toBe(true);
    expect(convertValueByType("false", "boolean")).toBe(false);
    expect(convertValueByType(false, "boolean")).toBe(false);

    const parsedDate = convertValueByType("2025-01-15T00:00:00.000Z", "date");
    expect(parsedDate).toBeInstanceOf(Date);
    expect((parsedDate as Date).toISOString()).toBe("2025-01-15T00:00:00.000Z");
    expect(convertValueByType("invalid-date", "datetime")).toBe("invalid-date");
  });

  it("returns value unchanged for unknown field types", () => {
    expect(convertValueByType("hello", "custom")).toBe("hello");
  });
});

describe("parseExcelRows", () => {
  it("maps headers using correspondingKey and converts values via containerFields", () => {
    const data = [
      ["Name", "Count", "Active", "Ignored"],
      ["Item A", "10", "true", "skip"],
      ["Item B", "25", "0", "skip2"],
    ];
    const usedColumns = [
      { key: "Name", isActive: true, isSortable: false, correspondingKey: "name" },
      { key: "Count", isActive: true, isSortable: false, correspondingKey: "count" },
      { key: "Active", isActive: true, isSortable: false, correspondingKey: "active" },
      { key: "Ignored", isActive: true, isSortable: false },
    ];
    const usedRowKeys = [
      { key: "name" },
      { key: "count" },
      { key: "active" },
      { key: "ignored" },
    ];
    const containerFields = [
      { name: "count", type: "int" },
      { name: "active", type: "boolean" },
    ];

    expect(
      parseExcelRows(data, usedColumns, usedRowKeys, containerFields),
    ).toEqual([
      { name: "Item A", count: 10, active: true },
      { name: "Item B", count: 25, active: false },
    ]);
  });
});
