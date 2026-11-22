import type { TFunction } from "i18next";
import { Field, Types } from "../../../../utils/api/container";
import {
  fieldToInput,
  getFieldLabel,
  isComputedField,
} from "../../../../utils/genericPageHelpers";
import {
  isFieldRequired,
  parseValidationRules,
} from "../../../../utils/validationHelper";
import {
  FormKeyTypeEnum,
  InputTypes,
  type GenericInputType,
} from "../../shared/types";
import { isArrayFieldType } from "./pageHelpers";

export type FormKeyDef = {
  key: string;
  type: FormKeyTypeEnum | string;
};

export const buildAddEditFormConfig = ({
  displayFields,
  selectionDataMap,
  t,
}: {
  displayFields: Field[];
  selectionDataMap: Map<string, Record<string, unknown>[]>;
  t: TFunction;
}): { inputs: GenericInputType[]; formKeys: FormKeyDef[] } => {
  const ins = displayFields
    .map((f): GenericInputType | null => {
      if (isComputedField(f)) return null;

      const m = fieldToInput(f);
      const label = t(getFieldLabel(f));
      const fieldType = (f.type || "").toLowerCase();

      const validationRules = parseValidationRules(f.tag);
      const isRequired = isFieldRequired(f.tag);

      if (
        (fieldType === Types.ObjectId ||
          fieldType === Types.AutoIncrementId ||
          fieldType === Types.ObjectIdArray) &&
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
          invalidateKeys:
            f.frontend?.invalidateKeys?.map((key) => ({
              key: String(key),
              defaultValue: undefined,
            })) ?? [],
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
          required: isRequired,
          isMultiple: isArrayType,
          options: f.enumList.map((item) => ({
            value: item,
            label: String(item),
          })),
          invalidateKeys:
            f.frontend?.invalidateKeys?.map((key) => ({
              key: String(key),
              defaultValue: undefined,
            })) ?? [],
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
        invalidateKeys:
          f.frontend?.invalidateKeys?.map((key) => ({
            key: String(key),
            defaultValue: undefined,
          })) ?? [],
      };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const fks = displayFields
    .map((f) => {
      if (isComputedField(f)) return null;
      const m = fieldToInput(f);
      return { key: f.name, type: m.formKeyType };
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);

  return { inputs: ins, formKeys: fks };
};

export const buildDefaultFilterPanelInputs = ({
  displayFields,
  selectionDataMap,
  t,
}: {
  displayFields: Field[];
  selectionDataMap: Map<string, Record<string, unknown>[]>;
  t: TFunction;
}): GenericInputType[] =>
  displayFields
    .filter((f) => {
      const fieldType = (f.type || "").toLowerCase();
      return (
        !["_id", "id"].includes(f.name) &&
        fieldType !== "image" &&
        fieldType !== "img"
      );
    })
    .map((f): GenericInputType => {
      const m = fieldToInput(f);
      const label = t(getFieldLabel(f));
      const fieldType = (f.type || "").toLowerCase();

      if (
        (fieldType === Types.ObjectId ||
          fieldType === Types.AutoIncrementId ||
          fieldType === Types.ObjectIdArray) &&
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
