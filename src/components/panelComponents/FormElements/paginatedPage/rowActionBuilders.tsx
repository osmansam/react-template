import React from "react";
import type { TableActionConfig } from "../../../../types/page";
import {
  applyHiddenActionValues,
  partitionActionConstantValues,
} from "../../../../utils/actionConstantValues";
import type { UpdatePayload } from "../../../../utils/api";
import type { Field } from "../../../../utils/api/container";
import { getIconByName } from "../../../../utils/menuIcons";
import { getTableActionRowState } from "../../../../utils/tableActions";
import type { GenericInputType } from "../../shared/types";
import {
  type ActionSelectDataMap,
  type GenericItem,
  buildActionFormKeys,
  buildActionInputs,
  getActionDefaultValues,
  getActionId,
  parseActionConstantValues,
  resolveActionTemplate,
} from "../tableActionForm";
import {
  CustomActionModal,
  DeleteRowDialog,
  EditItemModal,
} from "./ActionModals";
import type { FormKeyItem } from "./formInputBuilders";
import { type TranslateFn, normalizeRowForEdit } from "./tableHelpers";

export type RowActionBuilderContext = {
  t: TranslateFn;
  rowToAction: GenericItem | null;
  setRowToAction: React.Dispatch<React.SetStateAction<GenericItem | null>>;
  isDeleteOpen: boolean;
  setIsDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEditOpen: boolean;
  setIsEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCustomActionOpen: boolean;
  setIsCustomActionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeCustomAction: TableActionConfig | null;
  setActiveCustomAction: React.Dispatch<
    React.SetStateAction<TableActionConfig | null>
  >;
  deleteTableRow: (row: GenericItem) => Promise<void>;
  updateDynamicItem: (
    id: string | number,
    updates: Partial<GenericItem>,
  ) => void;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
  handleSubmitItem: (
    item: GenericItem | UpdatePayload<GenericItem>,
  ) => Promise<void>;
  displayFields: Field[];
  inputs: GenericInputType[];
  formKeys: FormKeyItem[];
  actionSelectionDataMap: ActionSelectDataMap;
};

export const buildDeleteRowAction = (
  ctx: RowActionBuilderContext,
  deleteActionConfig?: TableActionConfig,
) => {
  const DeleteIcon = getIconByName(
    deleteActionConfig?.icon || "HiOutlineTrash",
  );
  return {
    name: deleteActionConfig?.label || ctx.t("Delete"),
    isHidden: (row: GenericItem) =>
      deleteActionConfig
        ? getTableActionRowState(deleteActionConfig, row).hidden
        : false,
    isDisabled: (row: GenericItem) =>
      deleteActionConfig
        ? getTableActionRowState(deleteActionConfig, row).disabled
        : false,
    icon: <DeleteIcon />,
    setRow: ctx.setRowToAction as (value: GenericItem) => void,
    modal: ctx.rowToAction ? (
      <DeleteRowDialog
        isOpen={ctx.isDeleteOpen}
        close={() => ctx.setIsDeleteOpen(false)}
        onConfirm={() => {
          if (ctx.rowToAction) {
            void ctx.deleteTableRow(ctx.rowToAction);
          }
          ctx.setIsDeleteOpen(false);
        }}
        deleteActionConfig={deleteActionConfig}
        t={ctx.t}
      />
    ) : null,
    className:
      deleteActionConfig?.className || "text-red-500 cursor-pointer text-2xl ",
    isModal: true,
    isModalOpen: ctx.isDeleteOpen,
    setIsModal: ctx.setIsDeleteOpen,
    isPath: false,
  };
};

export const buildEditRowAction = (
  ctx: RowActionBuilderContext,
  editActionConfig?: TableActionConfig,
) => {
  const EditIcon = getIconByName(editActionConfig?.icon || "FiEdit");
  const editActionId = editActionConfig
    ? getActionId(editActionConfig, 0)
    : "edit-0";
  const editDefaultValues = editActionConfig
    ? getActionDefaultValues(editActionConfig)
    : {};
  const editWorkflowSubmit = editActionConfig?.submit;
  const isEditWorkflowAction = Boolean(
    editWorkflowSubmit?.workflowName && editWorkflowSubmit?.workflowSchema,
  );
  const editInputs = buildActionInputs(
    editActionConfig || { kind: "edit" },
    ctx.inputs,
    editActionId,
    ctx.actionSelectionDataMap,
  );
  const editInputKeys = new Set(editInputs.map((input) => input.formKey));
  const editFormKeys =
    editActionConfig?.formFields !== undefined
      ? buildActionFormKeys(editActionConfig, editInputs)
      : ctx.formKeys.filter((formKey) => editInputKeys.has(formKey.key));
  const editConstantValues = partitionActionConstantValues(
    editActionConfig ? parseActionConstantValues(editActionConfig) : {},
    editFormKeys.map((formKey) => formKey.key),
  );
  return {
    name: editActionConfig?.label || ctx.t("Edit"),
    isHidden: (row: GenericItem) =>
      editActionConfig
        ? getTableActionRowState(editActionConfig, row).hidden
        : false,
    isDisabled: (row: GenericItem) =>
      editActionConfig
        ? getTableActionRowState(editActionConfig, row).disabled
        : false,
    icon: <EditIcon />,
    className:
      editActionConfig?.className || "text-blue-500 cursor-pointer text-xl ",
    isModal: true,
    setRow: ctx.setRowToAction as (value: GenericItem) => void,
    modal: ctx.rowToAction ? (
      <EditItemModal
        isOpen={ctx.isEditOpen}
        close={() => ctx.setIsEditOpen(false)}
        rowToAction={ctx.rowToAction}
        normalizedUpdates={normalizeRowForEdit(
          ctx.rowToAction,
          ctx.displayFields,
        )}
        editActionConfig={editActionConfig}
        inputs={editInputs}
        formKeys={editFormKeys}
        defaults={editDefaultValues}
        constants={editConstantValues}
        isWorkflowAction={isEditWorkflowAction}
        executeWorkflow={ctx.executeWorkflow}
        handleSubmitItem={ctx.handleSubmitItem}
        t={ctx.t}
      />
    ) : null,
    isModalOpen: ctx.isEditOpen,
    setIsModal: ctx.setIsEditOpen,
    isPath: false,
  };
};

export const buildCustomRowAction = (
  ctx: RowActionBuilderContext,
  action: TableActionConfig,
  index: number,
) => {
  const actionId = getActionId(action, index);
  const ActionIcon = getIconByName(action.icon || "FiCheck");
  const defaultValues = getActionDefaultValues(action);
  const actionInputs = buildActionInputs(
    action,
    ctx.inputs,
    actionId,
    ctx.actionSelectionDataMap,
  );
  const actionFormKeys = buildActionFormKeys(action, actionInputs);
  const constantValues = partitionActionConstantValues(
    parseActionConstantValues(action),
    actionFormKeys.map((formKey) => formKey.key),
  );
  const workflowSubmit = action.submit;
  const isWorkflowAction = Boolean(
    workflowSubmit?.workflowName && workflowSubmit?.workflowSchema,
  );
  const isFormAction = action.modalType === "form";
  const isActiveAction =
    ctx.activeCustomAction &&
    getActionId(ctx.activeCustomAction, index) === actionId;

  return {
    name: action.label || ctx.t("Action"),
    isHidden: (row: GenericItem) => getTableActionRowState(action, row).hidden,
    isDisabled: (row: GenericItem) =>
      getTableActionRowState(action, row).disabled,
    icon: <ActionIcon />,
    className: action.className || "text-emerald-600 cursor-pointer text-xl ",
    isButton: action.isButton,
    buttonClassName: action.buttonClassName,
    setRow: ctx.setRowToAction as (value: GenericItem) => void,
    onClick: (row: GenericItem) => {
      ctx.setActiveCustomAction(action);
      if (isFormAction) return;

      if (action.kind === "link") {
        const path = resolveActionTemplate(
          action.linkTemplate || action.path,
          row,
        );
        if (path) window.location.href = path;
        return;
      }

      if (action.kind === "update") {
        if (isWorkflowAction) {
          ctx.executeWorkflow({
            workflowName: workflowSubmit?.workflowName || "",
            workflowSchema: workflowSubmit?.workflowSchema,
            record: applyHiddenActionValues(row, constantValues.hiddenValues),
            oldRecord: row,
          });
          return;
        }
        ctx.updateDynamicItem(
          row._id,
          constantValues.hiddenValues as Partial<GenericItem>,
        );
      }
    },
    modal:
      isFormAction && ctx.rowToAction && isActiveAction ? (
        <CustomActionModal
          isOpen={ctx.isCustomActionOpen}
          close={() => ctx.setIsCustomActionOpen(false)}
          rowToAction={ctx.rowToAction}
          action={action}
          inputs={actionInputs}
          formKeys={actionFormKeys}
          defaults={defaultValues}
          constants={constantValues}
          isWorkflowAction={isWorkflowAction}
          executeWorkflow={ctx.executeWorkflow}
          updateDynamicItem={ctx.updateDynamicItem}
          t={ctx.t}
        />
      ) : null,
    isModal: isFormAction,
    isModalOpen: ctx.isCustomActionOpen,
    setIsModal: ctx.setIsCustomActionOpen,
    isPath: false,
  };
};
