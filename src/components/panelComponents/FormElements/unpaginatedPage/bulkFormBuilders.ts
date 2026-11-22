import type { TFunction } from "i18next";
import type {
  TableActionConfig,
  TableActionFormFieldConfig,
} from "../../../../types/page";
import { Field, Types } from "../../../../utils/api/container";
import {
  fieldToInput,
  getFieldLabel,
  isComputedField,
} from "../../../../utils/genericPageHelpers";
import {
  FormKeyTypeEnum,
  InputTypes,
  type GenericInputType,
} from "../../shared/types";
import {
  type ActionSelectDataMap,
  type GenericItem,
  buildActionFormKeys,
  buildActionInputs,
  getActionId,
} from "../tableActionForm";
import type { FormKeyDef } from "./formInputBuilders";
import { isArrayFieldType } from "./pageHelpers";

export const buildBulkFieldOptions = ({
  configuredBulkEditFields,
  displayFields,
  t,
}: {
  configuredBulkEditFields: TableActionFormFieldConfig[];
  displayFields: Field[];
  t: TFunction;
}): Array<{ value: string; label: string }> => {
  if (configuredBulkEditFields.length) {
    return configuredBulkEditFields
      .filter((field) => field.formKey)
      .map((field) => ({
        value: field.formKey,
        label: t(field.label || field.formKey),
      }));
  }

  return displayFields
    .filter((f) => {
      const fieldType = (f.type || "").toLowerCase();
      return fieldType !== Types.Image && !isComputedField(f);
    })
    .map((f) => ({
      value: f.name,
      label: t(getFieldLabel(f)),
    }));
};

export const buildBulkFormKeys = ({
  isBulkStepTwo,
  configuredBulkEditFields,
  bulkEditActionConfig,
  displayFields,
  bulkSelectedKeys,
}: {
  isBulkStepTwo: boolean;
  configuredBulkEditFields: TableActionFormFieldConfig[];
  bulkEditActionConfig?: TableActionConfig;
  displayFields: Field[];
  bulkSelectedKeys: string[];
}): FormKeyDef[] => {
  if (isBulkStepTwo) {
    if (configuredBulkEditFields.length) {
      const action = {
        ...(bulkEditActionConfig || { kind: "update" }),
        formFields: configuredBulkEditFields.filter((field) =>
          bulkSelectedKeys.includes(field.formKey),
        ),
      } as TableActionConfig;
      return buildActionFormKeys(action, []);
    }

    return displayFields
      .filter((f) => bulkSelectedKeys.includes(f.name))
      .map((f) => {
        const m = fieldToInput(f);
        return { key: f.name, type: m.formKeyType };
      });
  }

  return [{ key: "bulkSelectedKeys", type: FormKeyTypeEnum.STRING }];
};

export const buildBulkEditInputs = ({
  t,
  bulkFieldOptions,
  isBulkStepTwo,
  displayFields,
  bulkSelectedKeys,
  configuredBulkEditFields,
  bulkEditActionConfig,
  bulkActionSelectionDataMap,
  selectionDataMap,
}: {
  t: TFunction;
  bulkFieldOptions: Array<{ value: string; label: string }>;
  isBulkStepTwo: boolean;
  displayFields: Field[];
  bulkSelectedKeys: string[];
  configuredBulkEditFields: TableActionFormFieldConfig[];
  bulkEditActionConfig?: TableActionConfig;
  bulkActionSelectionDataMap: ActionSelectDataMap;
  selectionDataMap: Map<string, Record<string, unknown>[]>;
}): GenericInputType[] => {
  const selectInput: GenericInputType = {
    type: InputTypes.SELECT,
    formKey: "bulkSelectedKeys",
    label: t("Edit Option Selection"),
    options: bulkFieldOptions,
    placeholder: t("Select fields to edit"),
    isMultiple: true,
    required: !isBulkStepTwo,
    isDisabled: isBulkStepTwo,
  };

  const chosen = new Set(bulkSelectedKeys);
  if (configuredBulkEditFields.length) {
    const action = {
      ...(bulkEditActionConfig || { kind: "update" }),
      formFields: configuredBulkEditFields.filter((field) =>
        chosen.has(field.formKey),
      ),
    } as TableActionConfig;
    const valueInputs = buildActionInputs(
      action,
      [],
      getActionId(bulkEditActionConfig || { kind: "update" }, 0),
      bulkActionSelectionDataMap,
    ).map((input) => ({
      ...input,
      required: false,
      isDisabled: !isBulkStepTwo,
    }));

    return [selectInput, ...valueInputs];
  }

  const valueInputs: GenericInputType[] = displayFields
    .filter((f) => chosen.has(f.name))
    .map((f) => {
      const m = fieldToInput(f);
      const label = t(getFieldLabel(f));
      const fieldType = (f.type || "").toLowerCase();

      if (
        (fieldType === "objectid" ||
          fieldType === "autoincrementid" ||
          fieldType === "objectidarray") &&
        f.populationSettings &&
        f.objectSchemaName
      ) {
        const selectionData = selectionDataMap.get(f.name) || [];
        const displayLabel = f.populationSettings.displayLabel || label;

        return {
          type: InputTypes.SELECT,
          formKey: f.name,
          label: t(displayLabel),
          placeholder: t(displayLabel),
          required: false,
          isDisabled: !isBulkStepTwo,
          isMultiple: fieldType === "objectidarray",
          optionsSource: "schema" as const,
          sourceSchemaName: f.objectSchemaName,
          sourceValueField: "_id",
          sourceLabelField: f.populationSettings.inputSelectionField,
          options: selectionData.map((item) => ({
            value: String(item._id || ""),
            label: String(
              item[f.populationSettings!.inputSelectionField] ||
                item._id ||
                "",
            ),
            sourceItem: item,
          })),
        };
      }

      if (f.enumList && f.enumList.length > 0) {
        const originalType = f.type || "";
        const isArrayType = isArrayFieldType(fieldType, originalType);

        return {
          type: InputTypes.SELECT,
          formKey: f.name,
          label,
          placeholder: label,
          required: false,
          isDisabled: !isBulkStepTwo,
          isMultiple: isArrayType,
          options: f.enumList.map((item) => ({
            value: item,
            label: String(item),
          })),
        };
      }

      return {
        type: m.inputType,
        formKey: f.name,
        label,
        placeholder: label,
        required: false,
        isDisabled: !isBulkStepTwo,
      };
    });

  return [selectInput, ...valueInputs];
};

export const coerceBulkUpdates = ({
  bulkForm,
  bulkSelectedKeys,
  bulkFormKeys,
}: {
  bulkForm: Record<string, unknown>;
  bulkSelectedKeys: string[];
  bulkFormKeys: FormKeyDef[];
}): Partial<GenericItem> => {
  const chosen = new Set(bulkSelectedKeys);
  const updates: Partial<GenericItem> = {};

  for (const k of Object.keys(bulkForm)) {
    if (chosen.has(k)) {
      const formKey = bulkFormKeys.find((fk) => fk.key === k);
      let value = bulkForm[k];

      if (formKey?.type === FormKeyTypeEnum.BOOLEAN) {
        if (value === undefined || value === null || value === "") {
          value = false;
        } else if (typeof value === "string") {
          value = value === "true";
        } else if (typeof value !== "boolean") {
          value = false;
        }
      }

      if (formKey?.type === FormKeyTypeEnum.NUMBER) {
        if (typeof value === "string" && value !== "") {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            value = numValue;
          }
        }
      }

      if (formKey?.type === FormKeyTypeEnum.STRING_ARRAY) {
        if (typeof value === "string" && value !== "") {
          value = value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item !== "");
        } else if (!Array.isArray(value)) {
          value = [];
        }
      }

      if (formKey?.type === FormKeyTypeEnum.INT_ARRAY) {
        if (typeof value === "string" && value !== "") {
          value = value
            .split(",")
            .map((item) => parseInt(item.trim(), 10))
            .filter((item) => !isNaN(item));
        } else if (Array.isArray(value)) {
          value = value.map((item) =>
            typeof item === "string" ? parseInt(item, 10) : item,
          );
        } else {
          value = [];
        }
      }

      if (formKey?.type === FormKeyTypeEnum.NUMBER_ARRAY) {
        if (typeof value === "string" && value !== "") {
          value = value
            .split(",")
            .map((item) => parseFloat(item.trim()))
            .filter((item) => !isNaN(item));
        } else if (Array.isArray(value)) {
          value = value.map((item) =>
            typeof item === "string" ? parseFloat(item) : item,
          );
        } else {
          value = [];
        }
      }

      updates[k] = value;
    }
  }

  return updates;
};

export const computeInitialBulkValues = ({
  selectedKeys,
  configuredBulkEditFields,
  bulkEditActionConfig,
  displayFields,
}: {
  selectedKeys: string[];
  configuredBulkEditFields: TableActionFormFieldConfig[];
  bulkEditActionConfig?: TableActionConfig;
  displayFields: Field[];
}): Record<string, unknown> => {
  const initialBulkValues: Record<string, unknown> = {};
  if (configuredBulkEditFields.length) {
    const action = {
      ...(bulkEditActionConfig || { kind: "update" }),
      formFields: configuredBulkEditFields.filter((field) =>
        selectedKeys.includes(field.formKey),
      ),
    } as TableActionConfig;
    buildActionFormKeys(action, []).forEach((fieldKey) => {
      if (fieldKey.type === FormKeyTypeEnum.BOOLEAN) {
        initialBulkValues[fieldKey.key] = false;
      }
    });
  } else {
    displayFields
      .filter((f) => selectedKeys.includes(f.name))
      .forEach((f) => {
        const m = fieldToInput(f);
        if (m.formKeyType === FormKeyTypeEnum.BOOLEAN) {
          initialBulkValues[f.name] = false;
        }
      });
  }
  return initialBulkValues;
};
