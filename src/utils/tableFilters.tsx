import { useQueries } from "@tanstack/react-query";
import {
  FormElementsState,
  GenericInputType,
  InputTypes,
  OptionType,
} from "../components/panelComponents/shared/types";
import { usePageSelectionOptions } from "../pageRuntime/requests/selectionOptions";
import { TableFilterPanelInputConfig } from "../types/page";
import { get } from "./api";
import { evaluateRowCondition } from "./genericPageHelpers";
import { referencedSelectRecordFields } from "./selectFilters";
import {
  hasDependentSelectFilters,
  referencedSelectRecordFields,
} from "./selectFilters";
import { getSelectionQueryConfig } from "./selectionQuery";

type GenericItem = Record<string, unknown> & { _id: string };
type FilterSelectDataMap = Map<string, Array<Record<string, unknown>>>;

const getSelectionFieldName = (field: TableFilterPanelInputConfig) =>
  field.sourceLabelField || field.sourceValueField || "_id";

const filterInputTypeMap: Record<string, InputTypes> = {
  text: InputTypes.TEXT,
  date: InputTypes.DATE,
  number: InputTypes.NUMBER,
  select: InputTypes.SELECT,
  textarea: InputTypes.TEXTAREA,
  image: InputTypes.IMAGE,
  password: InputTypes.PASSWORD,
  time: InputTypes.TIME,
  color: InputTypes.COLOR,
  checkbox: InputTypes.CHECKBOX,
  hour: InputTypes.HOUR,
  monthYear: InputTypes.MONTHYEAR,
};

const isDefaultFilterMarker = (field: TableFilterPanelInputConfig) =>
  field.type === "defaults" || field.formKey === "__defaults";

export const useFilterPanelSelectionData = (
  inputs: TableFilterPanelInputConfig[] = [],
): FilterSelectDataMap => {
  const pageOptions = usePageSelectionOptions();
  const schemaSelectFields = inputs.filter(
    (field) =>
      field.type === "select" &&
      !field.sourceFilterBindings?.length &&
      !hasDependentSelectFilters(field) &&
      ((field.optionsSource === "schema" && field.sourceSchemaName) ||
        pageOptions.connected(`filterOptions:${field.id || field.formKey}`)),
  );

  const queryResults = useQueries({
    queries: schemaSelectFields.map((field) => {
      const fieldName = getSelectionFieldName(field);
      const valueField = field.sourceValueField || "_id";
      const dataFields = Array.from(
        new Set([
          ...(field.sourceDataFields || []),
          ...referencedSelectRecordFields(inputs, field.formKey),
        ]),
      ).filter((name) => name !== fieldName && name !== valueField);
      const { path, queryKey } = getSelectionQueryConfig({
        schemaName: field.sourceSchemaName || "",
        fieldName,
        valueField,
        dataFields,
        filterParams: field.sourceRequestFilters,
      });
      return pageOptions(
        `filterOptions:${field.id || field.formKey}`,
        path,
        {
          queryKey,
          queryFn: () =>
            get<Array<Record<string, unknown>>>({
              path,
            }),
          enabled: Boolean(field.sourceSchemaName && fieldName),
          staleTime: Infinity,
        },
        { dataFields },
      );
    }),
  });

  return schemaSelectFields.reduce<FilterSelectDataMap>((map, field, index) => {
    map.set(`filterPanel:${field.formKey}`, queryResults[index]?.data || []);
    return map;
  }, new Map());
};

const parseStaticOptions = (
  field: TableFilterPanelInputConfig,
): OptionType[] => {
  if (field.staticOptions?.length) {
    return field.staticOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }
  if (!field.staticOptionsJson?.trim()) return [];

  try {
    const parsed = JSON.parse(field.staticOptionsJson);
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && item.value !== undefined)
          .map((item) => ({
            value: item.value,
            label: String(item.label ?? item.value),
          }))
      : [];
  } catch {
    return [];
  }
};

const getFilterOptions = (
  field: TableFilterPanelInputConfig,
  selectDataMap: FilterSelectDataMap,
): OptionType[] => {
  if (field.type !== "select") return [];
  if (
    field.optionsSource !== "schema" &&
    !selectDataMap.has(`filterPanel:${field.formKey}`)
  )
    return parseStaticOptions(field);

  const valueField = field.sourceValueField || "_id";
  const labelField = field.sourceLabelField || valueField;
  return (selectDataMap.get(`filterPanel:${field.formKey}`) || [])
    .filter((item) =>
      field.sourceFilterCondition?.trim()
        ? evaluateRowCondition(item as GenericItem, field.sourceFilterCondition)
        : true,
    )
    .map((item) => ({
      value: String(item[valueField] ?? item._id ?? ""),
      label: String(item[labelField] ?? item[valueField] ?? item._id ?? ""),
      sourceItem: item,
    }));
};

export const buildConfiguredFilterInputs = (
  fields: TableFilterPanelInputConfig[] | undefined,
  fallbackInputs: GenericInputType[],
  selectDataMap: FilterSelectDataMap,
): GenericInputType[] => {
  if (fields === undefined) return fallbackInputs;

  return fields
    .filter((field) => field.formKey || isDefaultFilterMarker(field))
    .flatMap((field) => {
      if (isDefaultFilterMarker(field)) return fallbackInputs;

      const fallback = fallbackInputs.find(
        (input) => input.formKey === field.formKey,
      );
      return [
        {
          ...(fallback || {}),
          type: filterInputTypeMap[field.type] || InputTypes.TEXT,
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
          options: getFilterOptions(field, selectDataMap),
          optionsSource: field.optionsSource ?? fallback?.optionsSource,
          sourceSchemaName:
            field.sourceSchemaName ?? fallback?.sourceSchemaName,
          sourceValueField:
            field.sourceValueField ?? fallback?.sourceValueField,
          sourceLabelField:
            field.sourceLabelField ?? fallback?.sourceLabelField,
          sourceDataFields:
            field.type === "select"
              ? Array.from(
                  new Set([
                    ...(field.sourceDataFields || []),
                    ...(fallback?.sourceDataFields || []),
                    ...referencedSelectRecordFields(fields, field.formKey),
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
              ? `filterOptions:${field.id || field.formKey}`
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
        },
      ];
    });
};

export const getFilterDefaultValues = (
  fields: TableFilterPanelInputConfig[] | undefined,
): FormElementsState =>
  (fields || []).reduce<FormElementsState>((values, field) => {
    if (field.formKey && field.defaultValue !== undefined) {
      values[field.formKey] = field.defaultValue;
    }
    return values;
  }, {});
