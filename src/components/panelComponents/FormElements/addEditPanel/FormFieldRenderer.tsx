import React from "react";
import { useTranslation } from "react-i18next";
import { ActionMeta, MultiValue, SingleValue } from "react-select";
import { FormElementsState, OptionType } from "../../../../types";
import { hasDependentSelectFilters } from "../../../../utils/selectFilters";
import { GenericInputType, InputTypes } from "../../shared/types";
import DateInput from "../DateInput";
import { evaluateFormCondition, getFilteredOptions } from "../formOptionPolicy";
import HourInput from "../HourInput";
import MonthYearInput from "../MonthYearInput";
import SelectInput from "../SelectInput";
import TabInput from "../TabInput";
import TextInput from "../TextInput";
import { TextareaField } from "./TextareaField";

type FormFieldRendererProps = {
  input: GenericInputType;
  formElements: FormElementsState;
  setFormElements: React.Dispatch<React.SetStateAction<FormElementsState>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setForm?: (item: any) => void;
  resetTextInput: boolean;
  attemptedSubmit: boolean;
  fieldErrors: Record<string, string>;
  openFor: string | null;
  setOpenFor: React.Dispatch<React.SetStateAction<string | null>>;
  isValueEmpty: (value: unknown) => boolean;
  onFieldChange: (key: string) => (value: string) => void;
  onSelectChange: (
    key: string,
  ) => (
    selectedValue: SingleValue<OptionType> | MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>,
  ) => void;
  onInputClear: (input: GenericInputType) => void;
};

export const FormFieldRenderer = ({
  input,
  formElements,
  setFormElements,
  setForm,
  resetTextInput,
  attemptedSubmit,
  fieldErrors,
  openFor,
  setOpenFor,
  isValueEmpty,
  onFieldChange,
  onSelectChange,
  onInputClear,
}: FormFieldRendererProps) => {
  const { t } = useTranslation();

  // Default boolean fields to false if undefined/null
  const rawValue = formElements[input.formKey];
  const value =
    input.type === InputTypes.CHECKBOX &&
    (rawValue === undefined || rawValue === null)
      ? false
      : rawValue;
  const inputOptions = getFilteredOptions(input, formElements);
  const isConditionDisabled = evaluateFormCondition(
    input.disabledCondition,
    formElements,
  );
  const isConditionRequired = evaluateFormCondition(
    input.requiredCondition,
    formElements,
  );
  const isInputRequired = input.required || isConditionRequired;

  if (
    input.type === InputTypes.SELECT &&
    !input?.required &&
    input?.options?.length === 0 &&
    !hasDependentSelectFilters(input) &&
    !input.selectionStatus
  ) {
    return null;
  }

  const isInputDisabled = input.isDisabled || isConditionDisabled || false;
  if (isInputDisabled) {
    return null;
  }

  const showError =
    attemptedSubmit &&
    isInputRequired &&
    isValueEmpty(formElements[input.formKey]);

  const fieldLabel =
    isInputRequired && input.label ? input.label : (input.label ?? "");

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col gap-1"
    >
      {input.type === InputTypes.DATE && (
        <DateInput
          key={input.formKey + resetTextInput}
          value={value as string | null}
          label={fieldLabel}
          placeholder={input.placeholder ?? ""}
          onChange={(val) => onFieldChange(input.formKey)(val ?? "")}
          isArrowsEnabled={input.isArrowsEnabled ?? false}
          requiredField={isInputRequired}
          isOnClearActive={input?.isOnClearActive ?? true}
          isDateInitiallyOpen={input.isDateInitiallyOpen ?? false}
          isTopFlexRow={input.isTopFlexRow ?? false}
          disabled={isInputDisabled}
          isReadOnly={input.isReadOnly ?? false}
          onClear={() => {
            onInputClear(input);
          }}
        />
      )}
      {(input.type === InputTypes.TEXT ||
        input.type === InputTypes.NUMBER ||
        input.type === InputTypes.TIME ||
        input.type === InputTypes.COLOR ||
        input.type === InputTypes.CHECKBOX ||
        input.type === InputTypes.PASSWORD) && (
        <TextInput
          key={input.formKey + resetTextInput}
          type={input.type}
          value={value}
          label={fieldLabel}
          placeholder={input.placeholder ?? ""}
          onChange={onFieldChange(input.formKey)}
          requiredField={isInputRequired}
          isOnClearActive={input?.isOnClearActive ?? true}
          isNumberButtonsActive={input?.isNumberButtonsActive ?? false}
          isDateInitiallyOpen={input.isDateInitiallyOpen ?? false}
          isTopFlexRow={input.isTopFlexRow ?? false}
          minNumber={input?.min ?? input?.minNumber ?? 0}
          maxNumber={input?.max}
          isDebounce={input?.isDebounce ?? false}
          disabled={isInputDisabled}
          isReadOnly={input.isReadOnly ?? false}
          isMinNumber={input?.isMinNumber ?? true}
          error={fieldErrors[input.formKey]}
          onClear={() => {
            onInputClear(input);
          }}
        />
      )}
      {input.type === InputTypes.HOUR && (
        <HourInput
          key={input.formKey}
          value={value as string | undefined}
          label={fieldLabel}
          onChange={onFieldChange(input.formKey)}
          requiredField={isInputRequired}
          isReadOnly={input.isReadOnly || isInputDisabled || false}
        />
      )}
      {input.type === InputTypes.MONTHYEAR && (
        <MonthYearInput
          key={input.formKey}
          value={value as string | undefined}
          label={fieldLabel}
          onChange={onFieldChange(input.formKey)}
          requiredField={isInputRequired}
          isReadOnly={input.isReadOnly || isInputDisabled || false}
        />
      )}
      {input.type === InputTypes.SELECT && (
        <SelectInput
          key={
            input.isMultiple
              ? input.formKey
              : input.formKey + formElements[input.formKey]
          }
          value={
            (input.isMultiple
              ? inputOptions.filter((option) => {
                  const currentVal = formElements[input.formKey];
                  return (
                    (Array.isArray(currentVal) ||
                      typeof currentVal === "string") &&
                    (currentVal as (string | number)[]).includes(option.value)
                  );
                })
              : inputOptions.find(
                  (option) => option?.value === formElements[input.formKey],
                )) ?? null
          }
          label={fieldLabel}
          suggestedOption={input?.suggestedOption}
          isSortDisabled={input.isSortDisabled ?? false}
          isAutoFill={input?.isAutoFill}
          options={inputOptions}
          placeholder={input.placeholder ?? ""}
          isMultiple={input.isMultiple ?? false}
          requiredField={isInputRequired}
          onChange={onSelectChange(input.formKey)}
          isTopFlexRow={input.isTopFlexRow ?? false}
          onChangeTrigger={
            input?.onChangeTrigger
              ? (val) => {
                  if (Array.isArray(val)) {
                    input.onChangeTrigger?.(val.map((v) => v.value));
                  } else if (val && !Array.isArray(val)) {
                    input.onChangeTrigger?.((val as OptionType).value);
                  } else {
                    input.onChangeTrigger?.(null);
                  }
                }
              : undefined
          }
          isOnClearActive={input?.isOnClearActive ?? true}
          isReadOnly={input.isReadOnly || isInputDisabled || false}
          selectionStatus={input.selectionStatus}
          selectionMessage={input.selectionMessage}
          retrySelection={input.retrySelection}
          onClear={() => {
            onInputClear(input);
          }}
        />
      )}
      {input.type === InputTypes.TAB && (
        <TabInput
          key={input.formKey + formElements[input.formKey]}
          value={
            inputOptions.find(
              (option) => option?.value === formElements[input.formKey],
            ) ?? null
          }
          label={fieldLabel}
          suggestedOption={input?.suggestedOption || null}
          formKey={input.formKey}
          options={inputOptions}
          placeholder={input.placeholder ?? ""}
          invalidateKeys={input.invalidateKeys}
          requiredField={isInputRequired}
          setFormElements={setFormElements}
          setForm={setForm}
          formElements={formElements}
          isTopFlexRow={input.isTopFlexRow ?? false}
          isReadOnly={input.isReadOnly || isInputDisabled || false}
          onClear={() => {
            onInputClear(input);
          }}
        />
      )}
      {input.type === InputTypes.TEXTAREA && (
        <TextareaField
          input={input}
          value={formElements[input.formKey] as string}
          isInputRequired={isInputRequired}
          isInputDisabled={isInputDisabled}
          openFor={openFor}
          setOpenFor={setOpenFor}
          onChange={onFieldChange(input.formKey)}
        />
      )}
      {showError && (
        <span className="text-xs text-red-600">
          {t("This field is required")}
        </span>
      )}
    </div>
  );
};
