import { describe, expect, it } from "vitest";
import type { ComponentOutputDefinition, InfoBlockItemConfig } from "../types/page";
import {
  resolveInfoBlockOutput,
  toggleInfoBlockSelection,
} from "./infoBlockOutputAdapter";

const item = (clickValues?: Record<string, unknown>): InfoBlockItemConfig => ({
  title: "Stock",
  clickValues,
});

const output = (valueKey: string, type: ComponentOutputDefinition["type"] = "number"):
  ComponentOutputDefinition => ({
  id: `out_${valueKey}`,
  key: valueKey,
  type,
  source: { kind: "infoBlockSelection", valueKey },
});

describe("toggleInfoBlockSelection", () => {
  it("selects a clickable block and clears it when clicked again", () => {
    expect(toggleInfoBlockSelection(null, 1, item({ min: 3 }))).toBe(1);
    expect(toggleInfoBlockSelection(1, 1, item({ min: 3 }))).toBeNull();
  });

  it("treats a block without click values as a clear action", () => {
    expect(toggleInfoBlockSelection(1, 3, item())).toBeNull();
    expect(toggleInfoBlockSelection(1, 3, item({}))).toBeNull();
  });
});

describe("resolveInfoBlockOutput", () => {
  it("publishes a configured value for the selected block", () => {
    expect(
      resolveInfoBlockOutput(output("minimum"), item({ minimum: 6 }), true),
    ).toEqual({ status: "available", value: 6 });
  });

  it("publishes null when no block is selected so consumers clear their filter", () => {
    expect(resolveInfoBlockOutput(output("minimum"), item({ minimum: 6 }), false))
      .toEqual({ status: "available", value: null });
  });

  it("makes omitted and incorrectly typed selected values unavailable", () => {
    expect(resolveInfoBlockOutput(output("maximum"), item({ minimum: 6 }), true))
      .toEqual({ status: "unavailable" });
    expect(resolveInfoBlockOutput(output("minimum"), item({ minimum: "six" }), true))
      .toEqual({ status: "unavailable" });
  });
});
