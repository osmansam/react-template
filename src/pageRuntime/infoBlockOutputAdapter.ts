import type {
  ComponentOutputDefinition,
  InfoBlockItemConfig,
} from "../types/page";
import { matchesRuntimeValueType } from "./pageParameterResolver";
import type { RuntimeValue } from "./types";

const isInfoBlockOutput = (
  output: ComponentOutputDefinition,
): output is ComponentOutputDefinition & {
  source: { kind: "infoBlockSelection"; valueKey: string };
} =>
  output.source?.kind === "infoBlockSelection" &&
  typeof output.source.valueKey === "string" &&
  output.source.valueKey.length > 0;

export const toggleInfoBlockSelection = (
  selectedIndex: number | null,
  clickedIndex: number,
  item: InfoBlockItemConfig,
): number | null => {
  if (!item.clickValues || Object.keys(item.clickValues).length === 0) return null;
  return selectedIndex === clickedIndex ? null : clickedIndex;
};

export const resolveInfoBlockOutput = (
  output: ComponentOutputDefinition,
  item: InfoBlockItemConfig | undefined,
  selected: boolean,
): RuntimeValue => {
  if (!isInfoBlockOutput(output)) {
    return { status: "unavailable" };
  }
  if (!selected) {
    return { status: "available", value: null };
  }
  if (!item?.clickValues) {
    return { status: "unavailable" };
  }
  const value = item.clickValues[output.source.valueKey];
  if (
    value === undefined ||
    !matchesRuntimeValueType(value, output.type)
  ) {
    return { status: "unavailable" };
  }
  return { status: "available", value };
};
