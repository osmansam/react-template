import { type Field, Types } from "../../../../utils/api/container";
import {
  fieldToInput,
  getFieldLabel,
  isComputedField,
} from "../../../../utils/genericPageHelpers";
import {
  isFieldRequired,
  parseValidationRules,
} from "../../../../utils/validationHelper";
import { InputTypes, type GenericInputType } from "../../shared/types";
import { isArrayFieldType, type TranslateFn } from "./tableHelpers";

export type SelectionDataMap = Map<string, Array<Record<string, unknown>>>;
export type FormKeyItem = { key: string; type: string };

const mapInvalidateKeys = (field: Field) =>
  field.frontend?.invalidateKeys?.map((key) => ({
    key: String(key),
    defaultValue: undefined,
  })) ?? [];

export const isPopulatedRefType = (fieldType: string) =>
  fieldType === Types.ObjectId ||
  fieldType === Types.AutoIncrementId ||
  fieldType === Types.ObjectIdArray;

export const buildFormInputsAndKeys = ({
  displayFields,
  constantFilter,
  selectionDataMap,
  t,
}: {
  displayFields: Field[];
  constantFilter?: Record<string, unknown>;
  selectionDataMap: SelectionDataMap;
  t: TranslateFn;
}): {
  inputs: GenericInputType[];
  formKeys: FormKeyItem[];
  constantFilterKeys: string[];
} => {
  const constantFilterKeys = constantFilter ? Object.keys(constantFilter) : [];

  const inputs = displayFields
    .map((f): GenericInputType | null => {
      if (isComputedField(f)) return null;

      const m = fieldToInput(f);
      const label = t(getFieldLabel(f));
      const fieldType = (f.type || "").toLowerCase();

      const validationRules = parseValidationRules(f.tag);
      const isRequired = isFieldRequired(f.tag);

      if (
        isPopulatedRefType(fieldType) &&
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
          required: isRequired,
          isMultiple: fieldType === Types.ObjectIdArray,
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
          invalidateKeys: mapInvalidateKeys(f),
        };
      }

      if (f.enumList && f.enumList.length > 0) {
        return {
          type: InputTypes.SELECT,
          formKey: f.name,
          label,
          placeholder: label,
          required: isRequired,
          isMultiple: isArrayFieldType(f),
          options: f.enumList.map((item) => ({
            value: item,
            label: String(item),
          })),
          invalidateKeys: mapInvalidateKeys(f),
        };
      }

      return {
        type: m.inputType,
        formKey: f.name,
        label,
        placeholder: label,
        required: isRequired,
        minLength: validationRules.minlength,
        maxLength: validationRules.maxlength,
        min: validationRules.min,
        max: validationRules.max,
        pattern: validationRules.pattern,
        invalidateKeys: mapInvalidateKeys(f),
      };
    })
    .filter((i): i is GenericInputType => i !== null);

  const formKeys = displayFields
    .map((f): FormKeyItem | null => {
      if (isComputedField(f)) return null;
      const m = fieldToInput(f);
      return { key: f.name, type: m.formKeyType };
    })
    .filter((k): k is FormKeyItem => k !== null);

  return { inputs, formKeys, constantFilterKeys };
};

export const buildDefaultFilterPanelInputs = ({
  displayFields,
  constantFilter,
  selectionDataMap,
  t,
}: {
  displayFields: Field[];
  constantFilter?: Record<string, unknown>;
  selectionDataMap: SelectionDataMap;
  t: TranslateFn;
}): GenericInputType[] => {
  const constantFilterKeys = constantFilter ? Object.keys(constantFilter) : [];

  return displayFields
    .filter((f) => {
      const fieldType = (f.type || "").toLowerCase();
      return (
        !["_id", "id"].includes(f.name) &&
        fieldType !== Types.Image &&
        fieldType !== "img" &&
        !constantFilterKeys.includes(f.name)
      );
    })
    .map((f): GenericInputType => {
      const m = fieldToInput(f);
      const label = t(getFieldLabel(f));
      const fieldType = (f.type || "").toLowerCase();

      if (
        isPopulatedRefType(fieldType) &&
        f.populationSettings &&
        f.populationSettings.inputSelectionField &&
        selectionDataMap.has(f.name)
      ) {
        const selectionOptions = selectionDataMap.get(f.name) || [];
        return {
          type: InputTypes.SELECT,
          formKey: f.name,
          label,
          placeholder: label,
          required: false,
          isMultiple: fieldType === Types.ObjectIdArray,
          optionsSource: "schema" as const,
          sourceSchemaName: f.objectSchemaName,
          sourceValueField: "_id",
          sourceLabelField: f.populationSettings.inputSelectionField,
          options: selectionOptions.map((item) => ({
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
        return {
          type: InputTypes.SELECT,
          formKey: f.name,
          label,
          placeholder: label,
          required: false,
          isMultiple: isArrayFieldType(f),
          options: f.enumList.map((item) => ({
            value: item,
            label: String(item),
          })),
        };
      }

      if (m.inputType === InputTypes.CHECKBOX) {
        return {
          type: InputTypes.SELECT,
          formKey: f.name,
          label,
          placeholder: label,
          required: false,
          options: [
            { value: "true", label: t("True") },
            { value: "false", label: t("False") },
          ],
        };
      }

      return {
        type: m.inputType,
        formKey: f.name,
        label,
        placeholder: label,
        required: false,
      };
    });
};
