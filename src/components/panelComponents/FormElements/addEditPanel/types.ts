import React from "react";
import { UpdatePayload } from "../../../../utils/api";
import { FormKeyType, GenericInputType } from "../../shared/types";

export type AdditionalButtonProps = {
  onClick: () => void;
  label: string;
  isInputRequirementCheck?: boolean;
  isInputNeedToBeReset?: boolean;
  preservedKeys?: string[];
};

export type GenericAddEditPanelProps<T> = {
  isOpen: boolean;
  close?: () => void;
  inputs: GenericInputType[];
  formKeys: FormKeyType[];
  topClassName?: string;
  nonImageInputsClassName?: string;
  onOpenTriggerTabInputFormKey?: string;
  generalClassName?: string;
  submitItem: (item: T | UpdatePayload<T>) => void | Promise<void>;
  setForm?: (item: T) => void;
  handleUpdate?: () => void;
  submitFunction?: () => void;
  additionalSubmitFunction?: () => void;
  additionalCancelFunction?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constantValues?: { [key: string]: any };
  isCancelConfirmationDialogExist?: boolean;
  isCreateConfirmationDialogExist?: boolean;
  isCreateCloseActive?: boolean;
  optionalCreateButtonActive?: boolean;
  allowOptionalSubmitForActivityTable?: boolean;
  isEditMode?: boolean;
  folderName?: string;
  buttonName?: string;
  cancelButtonLabel?: string;
  anotherPanel?: React.ReactNode;
  anotherPanelTopClassName?: string;
  createConfirmationDialogText?: string;
  createConfirmationDialogHeader?: string;
  isConfirmationDialogRequired?: () => boolean;
  confirmationDialogHeader?: string;
  confirmationDialogText?: string;
  isSubmitButtonActive?: boolean;
  upperMessage?: string[];
  additionalButtons?: AdditionalButtonProps[];
  itemToEdit?: {
    id: number | string;
    updates: T;
  };
};
