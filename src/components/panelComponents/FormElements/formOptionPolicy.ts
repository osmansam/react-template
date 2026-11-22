import type { FormElementsState, OptionType } from "../../../types";
import type { GenericInputType } from "../shared/types";
import { evaluateRowCondition } from "../../../utils/genericPageHelpers";
export const resolveOptionFilterCondition = (
  condition: string | undefined,
  formElements: FormElementsState,
): string => {
  if (!condition?.trim()) return "";
  return condition.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const value = formElements[key.trim()];
    if (value === undefined || value === null || value === "") return '""';
    return typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(String(value));
  });
};

export const getFilteredOptions = (
  input: GenericInputType,
  formElements: FormElementsState,
): OptionType[] => {
  const options = input.options || [];
  if (!input.sourceFilterCondition?.trim()) return options;

  const resolvedCondition = resolveOptionFilterCondition(
    input.sourceFilterCondition,
    formElements,
  );

  return options.filter((option) => {
    const sourceItem = option.sourceItem;
    if (!sourceItem) return true;
    return evaluateRowCondition(
      sourceItem as Record<string, unknown> & { _id: string },
      resolvedCondition,
    );
  });
};

export const normalizeCondition = (condition: string) =>
  condition
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&");

export const evaluateFormCondition = (
  condition: string | undefined,
  formElements: FormElementsState,
) =>
  Boolean(
    condition?.trim() &&
      evaluateRowCondition(
        formElements as Record<string, unknown> & { _id: string },
        normalizeCondition(condition),
      ),
  );
