import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionMeta, MultiValue, SingleValue } from "react-select";
import { toast } from "react-toastify";
import { useGeneralContext } from "../../../../context/General.context";
import { OptionType } from "../../../../types";
import { UpdatePayload } from "../../../../utils/api";
import { useDependentSelectInputs } from "../../../forms/useDependentSelectInputs";
import { FormKeyType, GenericInputType, InputTypes } from "../../shared/types";
import {
  applyClearInput,
  applyFieldValueChange,
  areAllRequiredFieldsFilled,
  buildInitialFormElements,
  buildInitialFormState,
  convertFormElementsForSubmit,
  extractSelectNextValue,
  getPreservedFormValues,
  hasBlockedDependentSelectInput,
  hasFailedPhoneValidation,
  isFormValueEmpty,
  validateAllFormInputs,
  validateInputFieldValue,
} from "./formHelpers";
import { AdditionalButtonProps } from "./types";

type UseAddEditFormParams<T> = {
  isOpen: boolean;
  close?: () => void;
  inputs: GenericInputType[];
  formKeys: FormKeyType[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constantValues?: { [key: string]: any };
  isEditMode: boolean;
  itemToEdit?: {
    id: number | string;
    updates: T;
  };
  handleUpdate?: () => void;
  optionalCreateButtonActive?: boolean;
  allowOptionalSubmitForActivityTable?: boolean;
  submitFunction?: () => void;
  additionalSubmitFunction?: () => void;
  additionalCancelFunction?: () => void;
  isCreateCloseActive: boolean;
  isConfirmationDialogRequired?: () => boolean;
  setForm?: (item: T) => void;
  submitItem: (item: T | UpdatePayload<T>) => void | Promise<void>;
};

export function useAddEditForm<T>({
  isOpen,
  close,
  inputs,
  formKeys,
  constantValues,
  isEditMode,
  itemToEdit,
  handleUpdate,
  optionalCreateButtonActive,
  allowOptionalSubmitForActivityTable,
  submitFunction,
  additionalSubmitFunction,
  additionalCancelFunction,
  isCreateCloseActive,
  isConfirmationDialogRequired,
  setForm,
  submitItem,
}: UseAddEditFormParams<T>) {
  const { t } = useTranslation();
  const { isTabInputScreenOpen, tabInputScreenOptions } = useGeneralContext();
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);
  const [resetTextInput, setResetTextInput] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [isCancelConfirmationDialogOpen, setIsCancelConfirmationDialogOpen] =
    useState(false);
  const [confirmationDialogFunction, setConfirmationDialogFunction] = useState<
    (() => void) | null
  >(null);
  const { setIsExtraModalOpen } = useGeneralContext();
  const [isCreateConfirmationDialogOpen, setIsCreateConfirmationDialogOpen] =
    useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  const formKeysSignature = JSON.stringify(formKeys);
  const constantValuesSignature = JSON.stringify(constantValues ?? null);
  const itemToEditSignature = JSON.stringify(itemToEdit ?? null);

  const initialState = useMemo(
    () => buildInitialFormState(formKeys),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formKeysSignature],
  );
  const mergedInitialState = useMemo(
    () => ({ ...initialState, ...constantValues }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialState, constantValuesSignature],
  );
  const buildInitialElements = useCallback(
    () =>
      buildInitialFormElements(
        formKeys,
        inputs,
        initialState,
        mergedInitialState,
        constantValues,
        itemToEdit,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      constantValuesSignature,
      formKeysSignature,
      initialState,
      itemToEditSignature,
      mergedInitialState,
    ],
  );

  const [formElements, setFormElements] = useState(buildInitialElements);
  const resolvedInputs = useDependentSelectInputs(inputs, formElements, {
    enabled: isOpen,
    defaultSlotPrefix: "actionOptions",
    initialRecord:
      (itemToEdit?.updates as Record<string, unknown> | undefined) ||
      constantValues,
  });

  const imageInputs = resolvedInputs.filter(
    (input) => input.type === InputTypes.IMAGE,
  );
  const nonImageInputs = resolvedInputs.filter(
    (input) => input.type !== InputTypes.IMAGE,
  );

  const hasBlockedDependentSelect = useMemo(
    () => hasBlockedDependentSelectInput(nonImageInputs, formElements),
    [nonImageInputs, formElements],
  );

  useEffect(() => {
    if (isOpen) {
      setFormElements(buildInitialElements());
      setFieldErrors({});
      setAttemptedSubmit(false);
    }
  }, [buildInitialElements, isOpen]);

  const handleClose = useCallback(() => {
    setIsExtraModalOpen?.(false);
    close?.();
  }, [setIsExtraModalOpen, close]);

  const isValueEmpty = useCallback((value: unknown) => {
    return isFormValueEmpty(value);
  }, []);

  const validateFieldValue = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input: GenericInputType, value: any) => {
      return validateInputFieldValue(input, value, formKeys);
    },
    [formKeys],
  );

  const allRequiredFilled = useMemo(
    () => areAllRequiredFieldsFilled(resolvedInputs, formElements),
    [resolvedInputs, formElements],
  );

  useEffect(() => {
    setForm?.(formElements as T);
  }, [formElements, setForm]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isEditMode) {
          additionalCancelFunction?.();
        }
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditMode, additionalCancelFunction, handleClose]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, input: GenericInputType) => {
      if (event.target.files?.[0]) {
        const file = event.target.files[0];
        // Store the File object directly in formElements
        setFormElements((prev) => ({ ...prev, [input.formKey]: file }));
      }
    },
    [],
  );

  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalSubmitFunction = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const convertedFormElements = convertFormElementsForSubmit(
        formElements,
        formKeys,
      );
      if (isEditMode && itemToEdit) {
        await submitItem({
          id: itemToEdit.id,
          updates: convertedFormElements as T,
        });
      } else if (isEditMode && handleUpdate) {
        await handleUpdate();
      } else {
        if (submitFunction) {
          await submitFunction();
        } else {
          await submitItem(convertedFormElements as T);
        }
      }
      await additionalSubmitFunction?.();
      setFormElements(mergedInitialState);
      setResetTextInput((prev) => !prev);
      setAttemptedSubmit(false);
      isCreateCloseActive && close?.();
    } catch (error) {
      console.error("Failed to execute submit item:", error);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isConfirmationDialogRequired?.()) {
      setConfirmationDialogFunction(() => finalSubmitFunction);
      setIsConfirmationDialogOpen(true);
    } else {
      finalSubmitFunction();
    }
  };

  const handleInputClear = (input: GenericInputType) => {
    setFormElements((prev) =>
      applyClearInput(resolvedInputs, prev, input, initialState),
    );
  };

  const handleFieldChange = (key: string) => (value: string) => {
    const changedInput = resolvedInputs.find((input) => input.formKey === key);
    setFormElements((prev) =>
      applyFieldValueChange(
        resolvedInputs,
        prev,
        key,
        value,
        initialState,
        changedInput,
      ),
    );

    // Validate the field
    if (changedInput) {
      const error = validateFieldValue(changedInput, value);
      setFieldErrors((prev) => ({
        ...prev,
        [key]: error || "",
      }));
    }
  };

  const handleSelectChange =
    (key: string) =>
    (
      selectedValue: SingleValue<OptionType> | MultiValue<OptionType>,
      actionMeta: ActionMeta<OptionType>,
    ) => {
      const changedInput = resolvedInputs.find(
        (input) => input.formKey === key,
      );
      if (
        actionMeta?.action === "select-option" ||
        actionMeta?.action === "remove-value" ||
        actionMeta?.action === "clear"
      ) {
        const nextValue = extractSelectNextValue(selectedValue);
        setFormElements((prev) =>
          applyFieldValueChange(
            resolvedInputs,
            prev,
            key,
            nextValue,
            initialState,
            changedInput,
          ),
        );
      } else if (changedInput?.invalidateKeys) {
        changedInput.invalidateKeys.forEach((invKey) => {
          setFormElements((prev) => ({
            ...prev,
            [invKey.key]: initialState[invKey.key] ?? "",
          }));
        });
      }
    };

  const handleCancelButtonClick = () => {
    additionalCancelFunction?.();
    handleClose();
  };

  const handleCreateButtonClick = () => {
    setAttemptedSubmit(true);

    if (hasBlockedDependentSelect) {
      toast.error(t("Please fix the errors in the form"));
      return;
    }

    // Validate all fields
    const errors = validateAllFormInputs(
      resolvedInputs,
      formElements,
      formKeys,
    );
    setFieldErrors(errors);

    // If there are validation errors, show error and return
    if (Object.keys(errors).length > 0) {
      toast.error(t("Please fix the errors in the form"));
      return;
    }

    if (!allRequiredFilled && !optionalCreateButtonActive) {
      toast.error(t("Please fill all required fields"));
      return;
    } else if (allRequiredFilled) {
      if (hasFailedPhoneValidation(resolvedInputs, formElements)) {
        toast.error(t("Check phone number."));
        return;
      }
      handleSubmit();
    } else if (optionalCreateButtonActive) {
      if (allowOptionalSubmitForActivityTable) {
        handleSubmit();
      } else {
        if (
          JSON.stringify(formElements) !== JSON.stringify(mergedInitialState) &&
          !allRequiredFilled
        ) {
          toast.error(t("Please fill all required fields"));
          return;
        }
        handleSubmit();
      }
    }
  };

  const handleAdditionalButtonClick = (button: AdditionalButtonProps) => {
    if (button.isInputRequirementCheck && !allRequiredFilled) {
      setAttemptedSubmit(true);
      toast.error(t("Please fill all required fields"));
      return;
    }

    const executeButtonAction = () => {
      const preservedValues = getPreservedFormValues(
        formElements,
        button.preservedKeys,
      );

      button.onClick();

      if (button?.isInputNeedToBeReset) {
        setFormElements({
          ...(constantValues
            ? { ...initialState, ...constantValues }
            : initialState),
          ...preservedValues,
        });
        setResetTextInput((prev) => !prev);
        setAttemptedSubmit(false);
      }
    };

    if (isConfirmationDialogRequired?.()) {
      setConfirmationDialogFunction(() => executeButtonAction);
      setIsConfirmationDialogOpen(true);
    } else {
      executeButtonAction();
    }
  };

  const hasValidationErrors = Object.values(fieldErrors).some(
    (error) => !!error,
  );

  return {
    t,
    isTabInputScreenOpen,
    tabInputScreenOptions,
    modalRef,
    formElements,
    setFormElements,
    imageInputs,
    nonImageInputs,
    resetTextInput,
    openFor,
    setOpenFor,
    attemptedSubmit,
    fieldErrors,
    isSubmitting,
    allRequiredFilled,
    hasBlockedDependentSelect,
    hasValidationErrors,
    isValueEmpty,
    isConfirmationDialogOpen,
    setIsConfirmationDialogOpen,
    confirmationDialogFunction,
    setConfirmationDialogFunction,
    isCancelConfirmationDialogOpen,
    setIsCancelConfirmationDialogOpen,
    isCreateConfirmationDialogOpen,
    setIsCreateConfirmationDialogOpen,
    handleFileChange,
    handleInputClear,
    handleFieldChange,
    handleSelectChange,
    handleCancelButtonClick,
    handleCreateButtonClick,
    handleAdditionalButtonClick,
  };
}
