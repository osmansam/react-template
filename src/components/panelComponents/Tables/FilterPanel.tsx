import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { ActionMeta, MultiValue, SingleValue } from "react-select";
import { useGeneralContext } from "../../../context/General.context";
import { FormElementsState, FormElementValue } from "../../../types";
import { OptionType } from "../../panelComponents/shared/types";
import DateInput from "../FormElements/DateInput";
import { GenericButton } from "../FormElements/GenericButton";
import HourInput from "../FormElements/HourInput";
import MonthYearInput from "../FormElements/MonthYearInput";
import SelectInput from "../FormElements/SelectInput";
import TextInput from "../FormElements/TextInput";
import { H4, H6 } from "../Typography";
import { InputTypes, PanelFilterType } from "../shared/types";

const numberFilterPrefixPattern = /^(gte-|gt-|lte-|lt-)/;

type NumberRangeBound = "min" | "max";

type NumberRangeValues = {
  min: string;
  max: string;
};

type NumberRangeLimits = {
  min: number;
  max: number;
};

const toNumberFilterItems = (value: FormElementValue): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null && item !== "")
      .map(String);
  }

  if (value === undefined || value === null || value === "") return [];

  return [String(value)];
};

const getNumberRangeValues = (value: FormElementValue): NumberRangeValues => {
  return toNumberFilterItems(value).reduce<NumberRangeValues>(
    (range, item) => {
      const rawValue = item.replace(numberFilterPrefixPattern, "");

      if (item.startsWith("lte-") || item.startsWith("lt-")) {
        return { ...range, max: rawValue };
      }

      return { ...range, min: rawValue };
    },
    { min: "", max: "" },
  );
};

const buildNumberRangeFilterValue = (
  currentValue: FormElementValue,
  bound: NumberRangeBound,
  nextRawValue: FormElementValue,
): FormElementValue => {
  const currentRange = getNumberRangeValues(currentValue);
  const nextRange = {
    ...currentRange,
    [bound]:
      nextRawValue === undefined || nextRawValue === null
        ? ""
        : String(nextRawValue).trim(),
  };

  const nextValues = [
    nextRange.min !== "" ? `gte-${nextRange.min}` : "",
    nextRange.max !== "" ? `lte-${nextRange.max}` : "",
  ].filter(Boolean);

  return nextValues.length > 0 ? nextValues : "";
};

const toFiniteNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const FilterPanel = ({
  inputs,
  formElements,
  setFormElements,
  closeFilters,
  isApplyButtonActive = false,
  isCloseButtonActive = true,
  isFilterPanelCoverTable = false,
  additionalFilterCleanFunction,
}: PanelFilterType) => {
  const { t } = useTranslation();
  const { setCurrentPage } = useGeneralContext();
  const [tempFormElements, setTempFormElements] =
    useState<FormElementsState>(formElements);

  // Sync tempFormElements with formElements when not in apply button mode
  useEffect(() => {
    if (!isApplyButtonActive) {
      setTempFormElements(formElements);
    }
  }, [formElements, isApplyButtonActive]);
  const applyFilters = () => {
    setFormElements(tempFormElements);
    setCurrentPage(1); // Reset to the first page after applying filters
  };
  const handleClearAllFilters = () => {
    const clearedFormElements: FormElementsState = {};
    inputs.forEach((input) => {
      clearedFormElements[input.formKey] = "";
    });

    setFormElements(clearedFormElements);
    setTempFormElements(clearedFormElements);
    additionalFilterCleanFunction?.();
    setCurrentPage(1);
  };
  const buttons = [
    {
      label: "Clear All Filters",
      onClick: handleClearAllFilters,
      isDisabled: false,
    },
    {
      label: "Apply",
      onClick: applyFilters,
      isDisabled: !isApplyButtonActive,
    },
  ];

  const updateNumberRangeFilter = (
    fieldKey: string,
    bound: NumberRangeBound,
    nextRawValue: FormElementValue,
  ) => {
    const setNextValue = (prev: FormElementsState) => ({
      ...prev,
      [fieldKey]: buildNumberRangeFilterValue(
        prev[fieldKey] ?? "",
        bound,
        nextRawValue,
      ),
    });

    isApplyButtonActive
      ? setTempFormElements(setNextValue)
      : setFormElements(setNextValue);

    if (!isApplyButtonActive) {
      setCurrentPage(1);
    }
  };

  const clearNumberRangeFilter = (fieldKey: string) => {
    isApplyButtonActive
      ? setTempFormElements((prev) => ({ ...prev, [fieldKey]: "" }))
      : setFormElements((prev) => ({ ...prev, [fieldKey]: "" }));

    if (!isApplyButtonActive) {
      setCurrentPage(1);
    }
  };

  const renderNumberRangeSlider = (
    fieldKey: string,
    value: FormElementValue,
    limits: NumberRangeLimits,
    isOnClearActive = true,
  ) => {
    const safeLimits =
      limits.max > limits.min
        ? limits
        : {
            min: limits.min,
            max: limits.min + 1000,
          };
    const currentRange = getNumberRangeValues(value);
    const minValue = clamp(
      toFiniteNumber(currentRange.min, safeLimits.min),
      safeLimits.min,
      safeLimits.max,
    );
    const maxValue = clamp(
      toFiniteNumber(currentRange.max, safeLimits.max),
      safeLimits.min,
      safeLimits.max,
    );
    const safeMinValue = Math.min(minValue, maxValue);
    const safeMaxValue = Math.max(minValue, maxValue);
    const rangeSize = safeLimits.max - safeLimits.min || 1;
    const leftPercent = ((safeMinValue - safeLimits.min) / rangeSize) * 100;
    const rightPercent = ((safeMaxValue - safeLimits.min) / rangeSize) * 100;
    const minLabelPercent = clamp(leftPercent, 8, 92);
    const maxLabelPercent = clamp(rightPercent, 8, 92);

    const handleRangeChange =
      (bound: NumberRangeBound) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(event.target.value);

        if (bound === "min") {
          updateNumberRangeFilter(
            fieldKey,
            "min",
            Math.min(nextValue, safeMaxValue),
          );
          return;
        }

        updateNumberRangeFilter(
          fieldKey,
          "max",
          Math.max(nextValue, safeMinValue),
        );
      };

    return (
      <div className="flex flex-col gap-2">
        <div className="relative h-16 pt-6">
          {isOnClearActive && (
            <GenericButton
              onClick={() => clearNumberRangeFilter(fieldKey)}
              variant="icon"
              className="absolute right-0 top-0 z-20 h-6 w-6 text-lg text-neutral-400 hover:text-neutral-600"
            >
              <IoIosClose size={20} />
            </GenericButton>
          )}
          <span
            className="pointer-events-none absolute top-0 z-2 -translate-x-1/2 rounded bg-neutral-900 px-2 py-0.5 text-xs text-white shadow-sm"
            style={{ left: `${minLabelPercent}%` }}
          >
            {safeMinValue}
          </span>
          <span
            className="pointer-events-none absolute bottom-0 z-2 -translate-x-1/2 rounded bg-neutral-900 px-2 py-0.5 text-xs text-white shadow-sm"
            style={{ left: `${maxLabelPercent}%` }}
          >
            {safeMaxValue}
          </span>
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded bg-gray-200" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-neutral-900"
            style={{
              left: `${leftPercent}%`,
              right: `${100 - rightPercent}%`,
            }}
          />
          <input
            type="range"
            min={safeLimits.min}
            max={safeLimits.max}
            step={1}
            value={safeMinValue}
            onChange={handleRangeChange("min")}
            className="pointer-events-none absolute left-0 top-1/2 h-8 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900"
          />
          <input
            type="range"
            min={safeLimits.min}
            max={safeLimits.max}
            step={1}
            value={safeMaxValue}
            onChange={handleRangeChange("max")}
            className="pointer-events-none absolute left-0 top-1/2 h-8 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{safeLimits.min}</span>
          <span>{safeLimits.max}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col gap-3 __className_a182b8 bg-white min-w-full ${
        isFilterPanelCoverTable ? "" : "sm:min-w-[20rem]"
      } border h-fit pb-8 border-gray-200 rounded-md py-2 px-3 focus:outline-none `}
    >
      <div className="flex flex-row justify-between">
        <H4 className="my-1">{t("Filters")}</H4>
        {isCloseButtonActive && (
          <GenericButton onClick={closeFilters} variant="icon">
            <IoIosClose className="w-8 h-8 mx-auto p-1 cursor-pointer  hover:bg-gray-50 hover:rounded-full" />
          </GenericButton>
        )}
      </div>
      {inputs.map((input) => {
        const value = tempFormElements[input.formKey] ?? "";
        const handleChange = (key: string) => (value: FormElementValue) => {
          const changedInput = inputs.find((input) => input.formKey === key);
          if (changedInput?.invalidateKeys) {
            changedInput.invalidateKeys.forEach((key) => {
              if (isApplyButtonActive) {
                setTempFormElements((prev) => ({
                  ...prev,
                  [key.key]: key.defaultValue,
                }));
              } else {
                setFormElements((prev) => ({
                  ...prev,
                  [key.key]: key.defaultValue,
                }));
              }
            });
          }

          isApplyButtonActive
            ? setTempFormElements((prev) => ({ ...prev, [key]: value }))
            : setFormElements((prev) => ({ ...prev, [key]: value }));
          setCurrentPage(1);
        };

        const handleChangeForSelect =
          (key: string) =>
          (
            selectedValue: SingleValue<OptionType> | MultiValue<OptionType>,
            actionMeta: ActionMeta<OptionType>,
          ) => {
            if (
              actionMeta.action === "select-option" ||
              actionMeta.action === "remove-value" ||
              actionMeta.action === "clear"
            ) {
              if (Array.isArray(selectedValue)) {
                const values = selectedValue.map((option) => option.value);
                isApplyButtonActive
                  ? setTempFormElements((prev) => ({ ...prev, [key]: values }))
                  : setFormElements((prev) => ({ ...prev, [key]: values }));
              } else if (selectedValue) {
                isApplyButtonActive
                  ? setTempFormElements((prev) => ({
                      ...prev,
                      [key]: (selectedValue as OptionType)?.value,
                    }))
                  : setFormElements((prev) => ({
                      ...prev,
                      [key]: (selectedValue as OptionType)?.value,
                    }));
              } else {
                isApplyButtonActive
                  ? setTempFormElements((prev) => ({
                      ...prev,
                      [key]: "",
                    }))
                  : setFormElements((prev) => ({
                      ...prev,
                      [key]: "",
                    }));
              }
            }
            const changedInput = inputs.find((input) => input.formKey === key);
            if (changedInput?.invalidateKeys) {
              changedInput.invalidateKeys.forEach((key) => {
                isApplyButtonActive
                  ? setTempFormElements((prev) => ({
                      ...prev,
                      [key.key]: key.defaultValue,
                    }))
                  : setFormElements((prev) => ({
                      ...prev,
                      [key.key]: key.defaultValue,
                    }));
              });
            }
            if (changedInput?.additionalOnChange) {
              // Extract the actual value for additionalOnChange
              let valueForCallback: string | string[] = "";
              if (Array.isArray(selectedValue)) {
                valueForCallback = selectedValue.map((option) =>
                  String(option.value),
                );
              } else if (selectedValue && !Array.isArray(selectedValue)) {
                valueForCallback = String((selectedValue as OptionType).value);
              }
              changedInput.additionalOnChange(valueForCallback);
            }
            setCurrentPage(1);
          };
        if (input.isDisabled) return null;
        return (
          <div key={input.formKey} className="flex flex-col gap-2">
            {input.type === InputTypes.NUMBER && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {input.label}
                </label>
                {renderNumberRangeSlider(
                  input.formKey,
                  value,
                  {
                    min: input.min ?? input.minNumber ?? 0,
                    max: input.max ?? 1000,
                  },
                  input?.isOnClearActive ?? true,
                )}
              </div>
            )}
            {(input.type === InputTypes.TEXT ||
              input.type === InputTypes.TIME ||
              input.type === InputTypes.COLOR ||
              input.type === InputTypes.PASSWORD) && (
              <TextInput
                key={input.formKey}
                type={input.type}
                value={String(value)}
                label={input.label ?? ""}
                placeholder={input.placeholder ?? ""}
                onChange={handleChange(input.formKey)}
                isDatePicker={input.isDatePicker ?? false}
                isOnClearActive={input?.isOnClearActive}
                isDebounce={input?.isDebounce ?? false}
                onClear={() =>
                  isApplyButtonActive
                    ? setTempFormElements((prev) => ({
                        ...prev,
                        [input.formKey]: "",
                      }))
                    : setFormElements((prev) => ({
                        ...prev,
                        [input.formKey]: "",
                      }))
                }
              />
            )}
            {input.type === InputTypes.DATE && (
              <DateInput
                key={input.formKey}
                value={String(value)}
                label={
                  input.required && input.label
                    ? input.label
                    : (input.label ?? "")
                }
                placeholder={input.placeholder ?? ""}
                onChange={(val) => handleChange(input.formKey)(val ?? "")}
                isArrowsEnabled={input.isArrowsEnabled ?? false}
                requiredField={input.required}
                isOnClearActive={input?.isOnClearActive ?? true}
                isDateInitiallyOpen={input.isDateInitiallyOpen ?? false}
                isTopFlexRow={input.isTopFlexRow ?? false}
                isDebounce={input.isDebounce ?? true}
                isReadOnly={input.isReadOnly ?? false}
              />
            )}
            {input.type === InputTypes.SELECT && !input.isDisabled && (
              <SelectInput
                key={
                  input.isMultiple
                    ? input.formKey
                    : input.formKey + tempFormElements[input.formKey]
                }
                value={
                  input.isMultiple
                    ? input.options?.filter((option) => {
                        const formValue = tempFormElements[input.formKey];
                        return (
                          Array.isArray(formValue) &&
                          (formValue as (string | number)[]).includes(
                            option.value,
                          )
                        );
                      }) || []
                    : input.options?.find(
                        (option) =>
                          option.value === tempFormElements[input.formKey],
                      ) || null
                }
                label={input.label ?? ""}
                options={input.options ?? []}
                placeholder={input.placeholder ?? ""}
                isMultiple={input.isMultiple ?? false}
                onChange={handleChangeForSelect(input.formKey)}
                isOnClearActive={input?.isOnClearActive ?? true}
                onClear={() => {
                  isApplyButtonActive
                    ? setTempFormElements((prev) => ({
                        ...prev,
                        [input.formKey]: input.isMultiple ? [] : "",
                      }))
                    : setFormElements((prev) => ({
                        ...prev,
                        [input.formKey]: input.isMultiple ? [] : "",
                      }));
                }}
              />
            )}
            {input.type === InputTypes.MONTHYEAR && (
              <MonthYearInput
                key={input.formKey}
                value={String(value)}
                label={
                  input.required && input.label
                    ? input.label
                    : (input.label ?? "")
                }
                onChange={handleChange(input.formKey)}
                requiredField={input.required}
                isReadOnly={input.isReadOnly ?? false}
              />
            )}
            {input.type === InputTypes.TEXTAREA && (
              <div className="flex flex-col gap-2" key={input.formKey}>
                <H6>{input.label}</H6>
                <textarea
                  id={"textarea-input"}
                  value={String(value)}
                  onChange={(e) => {
                    handleChange(input.formKey)(e.target.value);
                  }}
                  placeholder={input.placeholder ?? ""}
                  className="border text-sm border-gray-300 rounded-md p-2"
                />
              </div>
            )}
            {input.type === InputTypes.HOUR && (
              <HourInput
                key={input.formKey}
                value={String(value)}
                label={
                  input.required && input.label
                    ? input.label
                    : (input.label ?? "")
                }
                onChange={handleChange(input.formKey)}
                requiredField={input.required}
                isReadOnly={input.isReadOnly ?? false}
              />
            )}
          </div>
        );
      })}
      <div className="flex flex-row w-fit gap-2 ml-auto">
        {buttons
          .filter((button) => !button.isDisabled)
          .map((button) => {
            return (
              <GenericButton
                key={button.label}
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={button.onClick}
              >
                {t(button.label)}
              </GenericButton>
            );
          })}
      </div>
    </div>
  );
};

export default FilterPanel;
