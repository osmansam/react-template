import type React from "react";
import type { TFunction } from "i18next";
import type {
  TableActionConfig,
  TableComponentConfig,
} from "../../../../types/page";
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
import type { FormKeyDef } from "./formInputBuilders";
import {
  CustomActionModal,
  DeleteItemModal,
  EditItemModal,
} from "./TableActionModals";

export const buildRowActions = ({
  t,
  actionsEnabled,
  tableActions,
  rowToAction,
  setRowToAction,
  isDeleteOpen,
  setIsDeleteOpen,
  isEditOpen,
  setIsEditOpen,
  isCustomActionOpen,
  setIsCustomActionOpen,
  activeCustomAction,
  setActiveCustomAction,
  deleteTableRow,
  updateDynamicItem,
  executeWorkflow,
  handleSubmitItem,
  inputs,
  formKeys,
  displayFields,
  actionSelectionDataMap,
}: {
  t: TFunction;
  actionsEnabled: boolean;
  tableActions?: TableComponentConfig["actions"];
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
  updateDynamicItem: (id: string | number, updates: Partial<GenericItem>) => void;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
  handleSubmitItem: (
    item: GenericItem | UpdatePayload<GenericItem>,
  ) => Promise<void>;
  inputs: GenericInputType[];
  formKeys: FormKeyDef[];
  displayFields: Field[];
  actionSelectionDataMap: ActionSelectDataMap;
}) => {
  if (!actionsEnabled) return [];

  const configuredActions = (tableActions || [])
    .filter((action) => action.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasConfiguredActions = Array.isArray(tableActions);
  const hasConfiguredDeleteAction = configuredActions.some(
    (action) => action.kind === "delete",
  );
  const hasConfiguredEditAction = configuredActions.some(
    (action) => action.kind === "edit",
  );

  const buildDeleteAction = (deleteActionConfig?: TableActionConfig) => {
    const DeleteIcon = getIconByName(
      deleteActionConfig?.icon || "HiOutlineTrash",
    );
    return {
      name: deleteActionConfig?.label || t("Delete"),
      isHidden: (row: GenericItem) =>
        deleteActionConfig
          ? getTableActionRowState(deleteActionConfig, row).hidden
          : false,
      isDisabled: (row: GenericItem) =>
        deleteActionConfig
          ? getTableActionRowState(deleteActionConfig, row).disabled
          : false,
      icon: <DeleteIcon />,
      setRow: setRowToAction as (value: GenericItem) => void,
      modal: rowToAction ? (
        <DeleteItemModal
          isOpen={isDeleteOpen}
          close={() => setIsDeleteOpen(false)}
          onConfirm={() => {
            void deleteTableRow(rowToAction);
            setIsDeleteOpen(false);
          }}
          deleteActionConfig={deleteActionConfig}
          t={t}
        />
      ) : null,
      className:
        deleteActionConfig?.className ||
        "text-red-500 cursor-pointer text-2xl ",
      isModal: true,
      isModalOpen: isDeleteOpen,
      setIsModal: setIsDeleteOpen,
      isPath: false,
    };
  };

  const buildEditAction = (editActionConfig?: TableActionConfig) => {
    const EditIcon = getIconByName(editActionConfig?.icon || "FiEdit");
    const editActionId = editActionConfig
      ? getActionId(editActionConfig, 0)
      : "edit-0";
    const editDefaultValues = editActionConfig
      ? getActionDefaultValues(editActionConfig)
      : {};
    const editInputs = buildActionInputs(
      editActionConfig || { kind: "edit" },
      inputs,
      editActionId,
      actionSelectionDataMap,
    );
    const editInputKeys = new Set(editInputs.map((input) => input.formKey));
    const editFormKeys =
      editActionConfig?.formFields !== undefined
        ? buildActionFormKeys(editActionConfig, editInputs)
        : formKeys.filter((formKey) => editInputKeys.has(formKey.key));
    const editConstantValues = partitionActionConstantValues(
      editActionConfig ? parseActionConstantValues(editActionConfig) : {},
      editFormKeys.map((formKey) => formKey.key),
    );
    return {
      name: editActionConfig?.label || t("Edit"),
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
        editActionConfig?.className || "text-blue-500 cursor-pointer text-xl",
      isModal: true,
      setRow: setRowToAction as (value: GenericItem) => void,
      modal: rowToAction ? (
        <EditItemModal
          isOpen={isEditOpen}
          close={() => setIsEditOpen(false)}
          rowToAction={rowToAction}
          displayFields={displayFields}
          editInputs={editInputs}
          editFormKeys={editFormKeys}
          editDefaultValues={editDefaultValues}
          editConstantValues={editConstantValues}
          editActionConfig={editActionConfig}
          handleSubmitItem={handleSubmitItem}
          t={t}
        />
      ) : null,
      isModalOpen: isEditOpen,
      setIsModal: setIsEditOpen,
      isPath: false,
    };
  };

  const buildCustomAction = (action: TableActionConfig, index: number) => {
    const actionId = getActionId(action, index);
    const ActionIcon = getIconByName(action.icon || "FiCheck");
    const defaultValues = getActionDefaultValues(action);
    const actionInputs = buildActionInputs(
      action,
      inputs,
      actionId,
      actionSelectionDataMap,
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
      activeCustomAction &&
      getActionId(activeCustomAction, index) === actionId;

    return {
      name: action.label || t("Action"),
      isHidden: (row: GenericItem) =>
        getTableActionRowState(action, row).hidden,
      isDisabled: (row: GenericItem) =>
        getTableActionRowState(action, row).disabled,
      icon: <ActionIcon />,
      className:
        action.className || "text-emerald-600 cursor-pointer text-xl ",
      isButton: action.isButton,
      buttonClassName: action.buttonClassName,
      setRow: setRowToAction as (value: GenericItem) => void,
      onClick: (row: GenericItem) => {
        setActiveCustomAction(action);
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
            executeWorkflow({
              workflowName: workflowSubmit?.workflowName || "",
              workflowSchema: workflowSubmit?.workflowSchema,
              record: applyHiddenActionValues(
                row,
                constantValues.hiddenValues,
              ),
              oldRecord: row,
            });
            return;
          }
          updateDynamicItem(
            row._id,
            constantValues.hiddenValues as Partial<GenericItem>,
          );
        }
      },
      modal:
        isFormAction && rowToAction && isActiveAction ? (
          <CustomActionModal
            isOpen={isCustomActionOpen}
            close={() => setIsCustomActionOpen(false)}
            action={action}
            rowToAction={rowToAction}
            actionInputs={actionInputs}
            actionFormKeys={actionFormKeys}
            defaultValues={defaultValues}
            constantValues={constantValues}
            isWorkflowAction={isWorkflowAction}
            executeWorkflow={executeWorkflow}
            updateDynamicItem={updateDynamicItem}
            t={t}
          />
        ) : null,
      isModal: isFormAction,
      isModalOpen: isCustomActionOpen,
      setIsModal: setIsCustomActionOpen,
      isPath: false,
    };
  };

  if (!hasConfiguredActions) {
    return [buildDeleteAction(), buildEditAction()];
  }

  return configuredActions
    .flatMap((action, index) => {
      if (action.kind === "defaults") {
        return [
          !hasConfiguredDeleteAction ? buildDeleteAction() : null,
          !hasConfiguredEditAction ? buildEditAction() : null,
        ];
      }
      if (action.kind === "delete") return buildDeleteAction(action);
      if (action.kind === "edit") return buildEditAction(action);
      return buildCustomAction(action, index);
    })
    .filter((action): action is NonNullable<typeof action> => Boolean(action));
};
