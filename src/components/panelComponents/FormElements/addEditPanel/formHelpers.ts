import { MultiValue, SingleValue } from "react-select";
import { FormElementsState, OptionType } from "../../../../types";
import { prepareFormEditValues } from "../../../../utils/formEditValues";
import { clearDependentSelectValues } from "../../../../utils/selectFilters";
import {
  validateField,
  ValidationRules,
} from "../../../../utils/validationHelper";
import {
  FormKeyType,
  FormKeyTypeEnum,
  GenericInputType,
  InputTypes,
} from "../../shared/types";
import { evaluateFormCondition } from "../formOptionPolicy";

export function buildInitialFormState(
  formKeys: FormKeyType[],
): FormElementsState {
  return formKeys.reduce<FormElementsState>((acc, { key, type }) => {
    let defaultValue;
    switch (type) {
      case FormKeyTypeEnum.STRING:
        defaultValue = "";
        break;
      case FormKeyTypeEnum.COLOR:
        defaultValue = "#ffffff";
        break;
      case FormKeyTypeEnum.NUMBER:
        defaultValue = null;
        break;
      case FormKeyTypeEnum.BOOLEAN:
        defaultValue = false;
        break;
      case FormKeyTypeEnum.DATE:
        defaultValue = "";
        break;
      case FormKeyTypeEnum.STRING_ARRAY:
      case FormKeyTypeEnum.INT_ARRAY:
      case FormKeyTypeEnum.NUMBER_ARRAY:
        defaultValue = "";
        break;
      default:
        defaultValue = null;
    }
    acc[key] = defaultValue;
    return acc;
  }, {});
}

export function buildInitialFormElements<T>(
  formKeys: FormKeyType[],
  inputs: GenericInputType[],
  initialState: FormElementsState,
  mergedInitialState: FormElementsState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constantValues?: { [key: string]: any },
  itemToEdit?: { id: number | string; updates: T },
): FormElementsState {
  if (itemToEdit) {
    const updates = itemToEdit.updates as unknown as FormElementsState;

    const processedUpdates = prepareFormEditValues(
      updates,
      formKeys,
      inputs,
    ) as FormElementsState;

    // Merge with initialState to ensure boolean fields default to false if not present
    return {
      ...initialState,
      ...constantValues,
      ...processedUpdates,
    };
  }
  return mergedInitialState;
}

export function isFormValueEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || value === "";
}

export function buildFieldValidationRules(
  input: GenericInputType,
): ValidationRules {
  const rules: ValidationRules = {};

  if (input.required) rules.required = true;
  if (input.minLength) rules.minlength = input.minLength;
  if (input.maxLength) rules.maxlength = input.maxLength;
  if (input.min !== undefined) rules.min = input.min;
  if (input.max !== undefined) rules.max = input.max;
  if (input.pattern) rules.pattern = input.pattern;

  // Check if it's an email field based on additionalType or formKey
  if (
    input.additionalType === "email" ||
    input.formKey.toLowerCase().includes("email")
  ) {
    rules.email = true;
  }

  // Check if it's a phone field
  if (
    input.additionalType === "phone" ||
    input.formKey.toLowerCase().includes("phone")
  ) {
    rules.phone = true;
  }

  // Check if it's a url field
  if (
    input.additionalType === "url" ||
    input.formKey.toLowerCase().includes("url")
  ) {
    rules.url = true;
  }

  return rules;
}

export function validateInputFieldValue(
  input: GenericInputType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  formKeys: FormKeyType[],
): string | null {
  const fieldType =
    formKeys.find((fk) => fk.key === input.formKey)?.type || "string";
  const rules = buildFieldValidationRules(input);
  return validateField(value, rules, fieldType);
}

export function validateAllFormInputs(
  inputs: GenericInputType[],
  formElements: FormElementsState,
  formKeys: FormKeyType[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  inputs.forEach((input) => {
    const value = formElements[input.formKey];
    const error = validateInputFieldValue(input, value, formKeys);
    if (error) {
      errors[input.formKey] = error;
    }
  });
  return errors;
}

export function areAllRequiredFieldsFilled(
  inputs: GenericInputType[],
  formElements: FormElementsState,
): boolean {
  return inputs.every((input) => {
    if (!input.required) return true;
    return !isFormValueEmpty(formElements[input.formKey]);
  });
}

export function hasBlockedDependentSelectInput(
  nonImageInputs: GenericInputType[],
  formElements: FormElementsState,
): boolean {
  return nonImageInputs.some((input) => {
    const isConditionDisabled = evaluateFormCondition(
      input.disabledCondition,
      formElements,
    );
    if (input.isDisabled || isConditionDisabled) return false;
    return Boolean(input.selectionStatus);
  });
}

export function hasFailedPhoneValidation(
  inputs: GenericInputType[],
  formElements: FormElementsState,
): boolean {
  return inputs
    .filter((input) => input.additionalType === "phone")
    .some((input) => {
      const inputValue = formElements[input.formKey];
      return !String(inputValue ?? "").match(/^[0-9]{11}$/);
    });
}

export function convertFormElementsForSubmit(
  formElements: FormElementsState,
  formKeys: FormKeyType[],
): FormElementsState {
  const convertedFormElements = { ...formElements };

  // Ensure ALL formKeys are present with proper defaults
  formKeys.forEach((formKey) => {
    const value = convertedFormElements[formKey.key];

    // Convert boolean values - ensure false default for undefined/null
    if (formKey.type === FormKeyTypeEnum.BOOLEAN) {
      if (value === undefined || value === null || value === "") {
        convertedFormElements[formKey.key] = false;
      } else if (typeof value === "string") {
        convertedFormElements[formKey.key] = value === "true";
      } else if (typeof value === "boolean") {
        convertedFormElements[formKey.key] = value;
      } else {
        // Fallback for any other unexpected type
        convertedFormElements[formKey.key] = false;
      }
    }

    // Convert number values from string to actual number
    if (formKey.type === FormKeyTypeEnum.NUMBER) {
      if (typeof value === "string" && value !== "") {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          convertedFormElements[formKey.key] = numValue;
        }
      }
    }

    // Convert string array - split comma-separated values into array
    if (formKey.type === FormKeyTypeEnum.STRING_ARRAY) {
      if (typeof value === "string" && value !== "") {
        // Split by comma and trim whitespace from each item
        convertedFormElements[formKey.key] = value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== "");
      } else if (Array.isArray(value)) {
        convertedFormElements[formKey.key] = value;
      } else {
        convertedFormElements[formKey.key] = [];
      }
    }

    // Convert int array - split comma-separated values and parse to integers
    if (formKey.type === FormKeyTypeEnum.INT_ARRAY) {
      if (typeof value === "string" && value !== "") {
        convertedFormElements[formKey.key] = value
          .split(",")
          .map((item) => parseInt(item.trim(), 10))
          .filter((item) => !isNaN(item));
      } else if (Array.isArray(value)) {
        convertedFormElements[formKey.key] = value.map((item) =>
          typeof item === "string" ? parseInt(item, 10) : Number(item),
        );
      } else {
        convertedFormElements[formKey.key] = [];
      }
    }

    // Convert number array - split comma-separated values and parse to numbers
    if (formKey.type === FormKeyTypeEnum.NUMBER_ARRAY) {
      if (typeof value === "string" && value !== "") {
        convertedFormElements[formKey.key] = value
          .split(",")
          .map((item) => parseFloat(item.trim()))
          .filter((item) => !isNaN(item));
      } else if (Array.isArray(value)) {
        convertedFormElements[formKey.key] = value.map((item) =>
          typeof item === "string" ? parseFloat(item) : Number(item),
        );
      } else {
        convertedFormElements[formKey.key] = [];
      }
    }
  });

  return convertedFormElements;
}

export function applyClearInput(
  resolvedInputs: GenericInputType[],
  prev: FormElementsState,
  input: GenericInputType,
  initialState: FormElementsState,
): FormElementsState {
  const next = clearDependentSelectValues(resolvedInputs, prev, {
    ...prev,
    [input.formKey]:
      input.type === InputTypes.SELECT && input.isMultiple
        ? []
        : (initialState[input.formKey] ?? ""),
  });
  if (input.invalidateKeys) {
    input.invalidateKeys.forEach((key) => {
      next[key.key] = initialState[key.key] ?? "";
    });
  }
  return next;
}

export function applyFieldValueChange(
  resolvedInputs: GenericInputType[],
  prev: FormElementsState,
  key: string,
  value: FormElementsState[string],
  initialState: FormElementsState,
  changedInput?: GenericInputType,
): FormElementsState {
  const next = clearDependentSelectValues(resolvedInputs, prev, {
    ...prev,
    [key]: value,
  });
  if (changedInput?.invalidateKeys) {
    changedInput.invalidateKeys.forEach((invKey) => {
      next[invKey.key] = initialState[invKey.key] ?? "";
    });
  }
  return next;
}

export function extractSelectNextValue(
  selectedValue: SingleValue<OptionType> | MultiValue<OptionType>,
): FormElementsState[string] {
  if (Array.isArray(selectedValue)) {
    return selectedValue.map((option) => option.value) as FormElementsState[string];
  }
  return selectedValue ? (selectedValue as OptionType)?.value : "";
}

export function getPreservedFormValues(
  formElements: FormElementsState,
  preservedKeys?: string[],
): Partial<FormElementsState> | undefined {
  return preservedKeys?.reduce<Partial<FormElementsState>>((acc, key) => {
    acc[key] = formElements[key];
    return acc;
  }, {});
}
