import type {
  TableActionConfig,
  TableActionFormFieldConfig,
} from "../../../types/page";
import {
  FormKeyTypeEnum,
  InputTypes,
  type GenericInputType,
} from "../shared/types";
import { referencedSelectRecordFields } from "../../../utils/selectFilters";
export type GenericItem = Record<string, unknown> & { _id: string };

export const isTruthyBooleanValue = (value: unknown): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

export const getActionId = (action: TableActionConfig, index: number) =>
  action.id || action.key || `${action.kind}-${index}`;

export type ActionSelectDataMap = Map<string, GenericItem[]>;

export const getSelectionFieldName = (field: TableActionFormFieldConfig) =>
  field.sourceLabelField || field.sourceValueField || "_id";

export const parseActionConstantValues = (
  action: TableActionConfig,
): Record<string, unknown> => {
  if (action.constantValues) return action.constantValues;
  if (!action.constantValuesJson?.trim()) return {};

  try {
    const parsed = JSON.parse(action.constantValuesJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

export const actionInputType = (type: string | undefined): InputTypes => {
  const normalized = (type || "text").toLowerCase();
  if (normalized === "number") return InputTypes.NUMBER;
  if (normalized === "select") return InputTypes.SELECT;
  if (normalized === "textarea") return InputTypes.TEXTAREA;
  if (normalized === "checkbox" || normalized === "boolean")
    return InputTypes.CHECKBOX;
  if (normalized === "date") return InputTypes.DATE;
  if (normalized === "time") return InputTypes.TIME;
  if (normalized === "color") return InputTypes.COLOR;
  return InputTypes.TEXT;
};

export const actionFormKeyType = (
  field: TableActionFormFieldConfig,
): string => {
  if (field.formKeyType) return field.formKeyType;
  if (field.isMultiple) return FormKeyTypeEnum.STRING_ARRAY;
  if (field.type === "number") return FormKeyTypeEnum.NUMBER;
  if (field.type === "checkbox") return FormKeyTypeEnum.BOOLEAN;
  return FormKeyTypeEnum.STRING;
};

export const getStaticActionOptions = (field: TableActionFormFieldConfig) => {
  if (field.staticOptions?.length) return field.staticOptions;
  if (!field.staticOptionsJson?.trim()) return [];

  try {
    const parsed = JSON.parse(field.staticOptionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getActionFieldOptions = (
  actionId: string,
  field: TableActionFormFieldConfig,
  selectDataMap: ActionSelectDataMap,
) => {
  if (field.type !== "select") return [];
  if (field.optionsSource !== "schema") return getStaticActionOptions(field);

  const valueField = field.sourceValueField || "_id";
  const labelField = field.sourceLabelField || valueField;
  return (selectDataMap.get(`${actionId}:${field.formKey}`) || []).map(
    (item) => ({
      value: String(item[valueField] ?? item._id ?? ""),
      label: String(item[labelField] ?? item[valueField] ?? item._id ?? ""),
      sourceItem: item,
    }),
  );
};
export const buildActionInputs = (
  action: TableActionConfig,
  fallbackInputs: GenericInputType[],
  actionId: string,
  selectDataMap: ActionSelectDataMap,
): GenericInputType[] => {
  if (action.formFields !== undefined) {
    const allFields = action.formFields;
    return allFields.map((field) => {
      const fallback = fallbackInputs.find(
        (input) => input.formKey === field.formKey,
      );
      return {
        ...(fallback || {}),
        type: actionInputType(field.type),
        formKey: field.formKey,
        label: field.label || fallback?.label || field.formKey,
        placeholder:
          field.placeholder ||
          fallback?.placeholder ||
          field.label ||
          field.formKey,
        required: field.required ?? fallback?.required ?? false,
        requiredCondition: field.requiredCondition,
        disabledCondition: field.disabledCondition,
        isDisabled: field.isDisabled ?? fallback?.isDisabled,
        isMultiple: field.isMultiple ?? fallback?.isMultiple,
        isNumberButtonsActive:
          field.isNumberButtonsActive ?? fallback?.isNumberButtonsActive,
        options: getActionFieldOptions(actionId, field, selectDataMap),
        optionsSource: field.optionsSource ?? fallback?.optionsSource,
        sourceSchemaName: field.sourceSchemaName ?? fallback?.sourceSchemaName,
        sourceValueField: field.sourceValueField ?? fallback?.sourceValueField,
        sourceLabelField: field.sourceLabelField ?? fallback?.sourceLabelField,
        sourceDataFields:
          field.type === "select"
            ? Array.from(
                new Set([
                  ...(field.sourceDataFields ||
                    fallback?.sourceDataFields ||
                    []),
                  ...referencedSelectRecordFields(allFields, field.formKey),
                ]),
              )
            : (field.sourceDataFields ?? fallback?.sourceDataFields),
        optionDisplay: field.optionDisplay ?? fallback?.optionDisplay,
        sourceRequestFilters:
          field.sourceRequestFilters ?? fallback?.sourceRequestFilters,
        sourceFilterBindings:
          field.sourceFilterBindings ?? fallback?.sourceFilterBindings,
        selectionRequestSlot:
          field.type === "select"
            ? `actionOptions:${actionId}:${field.formKey}`
            : fallback?.selectionRequestSlot,
        sourceFilterCondition: field.sourceFilterCondition,
        invalidateKeys: field.invalidateKeys?.map((key) => ({
          key,
          defaultValue: "",
        })),
        min: field.min ?? fallback?.min,
        max: field.max ?? fallback?.max,
        minLength: field.minLength ?? fallback?.minLength,
        maxLength: field.maxLength ?? fallback?.maxLength,
        pattern: field.pattern ?? fallback?.pattern,
        validationMessage:
          field.validationMessage ?? fallback?.validationMessage,
      };
    });
  }

  return fallbackInputs;
};

export const buildActionFormKeys = (
  action: TableActionConfig,
  actionInputs: GenericInputType[],
) => {
  if (action.formFields !== undefined) {
    return action.formFields.map((field) => ({
      key: field.formKey,
      type: actionFormKeyType(field),
    }));
  }

  return actionInputs.map((input) => ({
    key: input.formKey,
    type:
      input.type === InputTypes.NUMBER
        ? FormKeyTypeEnum.NUMBER
        : FormKeyTypeEnum.STRING,
  }));
};

export const getActionDefaultValues = (
  action: TableActionConfig,
): Record<string, unknown> =>
  (action.formFields || []).reduce<Record<string, unknown>>((values, field) => {
    if (field.formKey && field.defaultValue !== undefined) {
      values[field.formKey] = field.defaultValue;
    }
    return values;
  }, {});

export const resolveActionTemplate = (
  template: string | undefined,
  row: GenericItem | null,
): string => {
  if (!template || !row) return template || "";
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const value = row[key.trim()];
    return value === null || value === undefined ? "" : String(value);
  });
};
