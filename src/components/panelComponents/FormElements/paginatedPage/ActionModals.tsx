import React from "react";
import { ConfirmationDialog } from "../../../../common/ConfirmationDialog";
import type { TableActionConfig } from "../../../../types/page";
import type { UpdatePayload } from "../../../../utils/api";
import {
  applyHiddenActionValues,
  buildActionInitialValues,
} from "../../../../utils/actionConstantValues";
import { resolveTableActionFormLayout } from "../../../../utils/tableActionFormLayout";
import type { GenericInputType } from "../../shared/types";
import GenericAddEditPanel from "../GenericAddEditPanel";
import type { GenericItem } from "../tableActionForm";
import type { FormKeyItem } from "./formInputBuilders";
import type { TranslateFn } from "./tableHelpers";

type PartitionedConstants = {
  visibleDefaults: Record<string, unknown>;
  hiddenValues: Record<string, unknown>;
};

export function TableResetDefaultsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="mb-2 text-sm text-blue-700 underline"
      onClick={onClick}
    >
      Reset to shared defaults
    </button>
  );
}

export function AddItemModal({
  isOpen,
  close,
  actionConfig,
  inputs,
  formKeys,
  submitItem,
  constantFilter,
  defaults,
  constants,
}: {
  isOpen: boolean;
  close: () => void;
  actionConfig: TableActionConfig;
  inputs: GenericInputType[];
  formKeys: FormKeyItem[];
  submitItem: (item: GenericItem | UpdatePayload<GenericItem>) => Promise<void>;
  constantFilter?: Record<string, unknown>;
  defaults: Record<string, unknown>;
  constants: PartitionedConstants;
}) {
  const hasInitialValues =
    Boolean(constantFilter) ||
    Object.keys(defaults).length > 0 ||
    Object.keys(constants.visibleDefaults).length > 0 ||
    Object.keys(constants.hiddenValues).length > 0;

  return (
    <GenericAddEditPanel
      isOpen={isOpen}
      close={close}
      inputs={inputs}
      formKeys={formKeys}
      submitItem={submitItem}
      buttonName={actionConfig.buttonName || actionConfig.label || undefined}
      {...resolveTableActionFormLayout(actionConfig, {
        topClassName: "flex flex-col gap-2",
      })}
      itemToEdit={
        hasInitialValues
          ? {
              id: "",
              updates: {
                ...buildActionInitialValues(
                  defaults,
                  constants.visibleDefaults,
                ),
                ...(constantFilter || {}),
                _id: "",
              } as GenericItem,
            }
          : undefined
      }
    />
  );
}

export function DeleteRowDialog({
  isOpen,
  close,
  onConfirm,
  deleteActionConfig,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  onConfirm: () => void;
  deleteActionConfig?: TableActionConfig;
  t: TranslateFn;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      close={close}
      confirm={onConfirm}
      title={deleteActionConfig?.confirmTitle || t("Delete")}
      text={deleteActionConfig?.confirmText || t("GeneralDeleteMessage")}
    />
  );
}

export function EditItemModal({
  isOpen,
  close,
  rowToAction,
  normalizedUpdates,
  editActionConfig,
  inputs,
  formKeys,
  defaults,
  constants,
  isWorkflowAction,
  executeWorkflow,
  handleSubmitItem,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  rowToAction: GenericItem;
  normalizedUpdates: GenericItem;
  editActionConfig?: TableActionConfig;
  inputs: GenericInputType[];
  formKeys: FormKeyItem[];
  defaults: Record<string, unknown>;
  constants: PartitionedConstants;
  isWorkflowAction: boolean;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
  handleSubmitItem: (item: GenericItem | UpdatePayload<GenericItem>) => Promise<void>;
  t: TranslateFn;
}) {
  const editWorkflowSubmit = editActionConfig?.submit;
  return (
    <GenericAddEditPanel
      isOpen={isOpen}
      close={close}
      inputs={inputs}
      formKeys={formKeys}
      submitItem={(item) => {
        if ("id" in item && "updates" in item) {
          const record = applyHiddenActionValues(
            {
              ...rowToAction,
              ...(item.updates as Record<string, unknown>),
            },
            constants.hiddenValues,
          );
          if (isWorkflowAction) {
            executeWorkflow({
              workflowName: editWorkflowSubmit?.workflowName || "",
              workflowSchema: editWorkflowSubmit?.workflowSchema,
              record,
              oldRecord: rowToAction,
            });
          } else {
            handleSubmitItem({
              id: item.id as string | number,
              updates: record as Partial<GenericItem>,
            });
          }
        }
        close();
      }}
      isEditMode
      buttonName={editActionConfig?.buttonName || t("Edit")}
      {...resolveTableActionFormLayout(editActionConfig, {
        topClassName: "flex flex-col gap-2",
      })}
      itemToEdit={{
        id: rowToAction._id,
        updates: buildActionInitialValues(
          defaults,
          constants.visibleDefaults,
          normalizedUpdates,
        ) as GenericItem,
      }}
    />
  );
}

export function CustomActionModal({
  isOpen,
  close,
  rowToAction,
  action,
  inputs,
  formKeys,
  defaults,
  constants,
  isWorkflowAction,
  executeWorkflow,
  updateDynamicItem,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  rowToAction: GenericItem;
  action: TableActionConfig;
  inputs: GenericInputType[];
  formKeys: FormKeyItem[];
  defaults: Record<string, unknown>;
  constants: PartitionedConstants;
  isWorkflowAction: boolean;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
  updateDynamicItem: (
    id: string | number,
    updates: Partial<GenericItem>,
  ) => void;
  t: TranslateFn;
}) {
  const workflowSubmit = action.submit;
  return (
    <GenericAddEditPanel
      isOpen={isOpen}
      close={close}
      inputs={inputs}
      formKeys={formKeys}
      submitItem={(item) => {
        if ("id" in item && "updates" in item) {
          const record = applyHiddenActionValues(
            {
              ...rowToAction,
              ...(item.updates as Record<string, unknown>),
            },
            constants.hiddenValues,
          );
          if (isWorkflowAction) {
            executeWorkflow({
              workflowName: workflowSubmit?.workflowName || "",
              workflowSchema: workflowSubmit?.workflowSchema,
              record,
              oldRecord: rowToAction,
            });
          } else {
            updateDynamicItem(
              item.id as string | number,
              record as Partial<GenericItem>,
            );
          }
        }
        close();
      }}
      isEditMode
      buttonName={action.buttonName || action.label || t("Update")}
      {...resolveTableActionFormLayout(action, {
        topClassName: "flex flex-col gap-2",
      })}
      itemToEdit={{
        id: rowToAction._id,
        updates: buildActionInitialValues(
          defaults,
          constants.visibleDefaults,
          rowToAction,
        ) as GenericItem,
      }}
    />
  );
}

export function BulkDeleteDialog({
  isOpen,
  close,
  confirm,
  bulkDeleteActionConfig,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  confirm: () => void;
  bulkDeleteActionConfig: TableActionConfig;
  t: TranslateFn;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      close={close}
      confirm={confirm}
      title={t(
        bulkDeleteActionConfig.confirmTitle ||
          bulkDeleteActionConfig.label ||
          "Delete Selected",
      )}
      text={t(
        bulkDeleteActionConfig.confirmText ||
          "Are you sure you want to delete the selected items?",
      )}
    />
  );
}

export function BulkEditModal({
  isOpen,
  close,
  inputs,
  formKeys,
  onFormChange,
  bulkEditActionConfig,
  isBulkStepTwo,
  onSubmit,
  onBackOrForward,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  inputs: GenericInputType[];
  formKeys: FormKeyItem[];
  onFormChange: (f: Record<string, unknown>) => void;
  bulkEditActionConfig: TableActionConfig;
  isBulkStepTwo: boolean;
  onSubmit: () => void;
  onBackOrForward: () => void;
  t: TranslateFn;
}) {
  return (
    <GenericAddEditPanel
      isOpen={isOpen}
      close={close}
      inputs={inputs}
      formKeys={formKeys}
      setForm={onFormChange}
      submitItem={() => {}}
      isEditMode={false}
      {...resolveTableActionFormLayout(bulkEditActionConfig, {
        topClassName: "flex flex-col gap-2",
        generalClassName: "overflow-visible",
      })}
      buttonName={t(
        bulkEditActionConfig.buttonName ||
          bulkEditActionConfig.label ||
          "Edit",
      )}
      isSubmitButtonActive={isBulkStepTwo}
      submitFunction={onSubmit}
      additionalButtons={[
        {
          label: isBulkStepTwo ? t("Back") : t("Forward"),
          onClick: onBackOrForward,
        },
      ]}
    />
  );
}
