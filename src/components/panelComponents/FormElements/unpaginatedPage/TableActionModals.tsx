import type { TFunction } from "i18next";
import { ConfirmationDialog } from "../../../../common/ConfirmationDialog";
import type { TableActionConfig, TableComponentConfig } from "../../../../types/page";
import type { UpdatePayload } from "../../../../utils/api";
import {
  applyHiddenActionValues,
  buildActionInitialValues,
} from "../../../../utils/actionConstantValues";
import type { Field } from "../../../../utils/api/container";
import { resolveTableActionFormLayout } from "../../../../utils/tableActionFormLayout";
import type { GenericInputType } from "../../shared/types";
import GenericAddEditPanel from "../GenericAddEditPanel";
import type { GenericItem } from "../tableActionForm";
import type { FormKeyDef } from "./formInputBuilders";
import { normalizeRowForEdit } from "./pageHelpers";

export function AddItemModal({
  isOpen,
  close,
  inputs,
  formKeys,
  submitItem,
  visibleDefaults,
  addButtonConfig,
}: {
  isOpen: boolean;
  close: () => void;
  inputs: GenericInputType[];
  formKeys: FormKeyDef[];
  submitItem: (item: GenericItem | UpdatePayload<GenericItem>) => void | Promise<void>;
  visibleDefaults: Record<string, unknown>;
  addButtonConfig?: TableComponentConfig["addButton"];
}) {
  return (
    <GenericAddEditPanel
      isOpen={isOpen}
      close={close}
      inputs={inputs}
      formKeys={formKeys}
      submitItem={submitItem}
      itemToEdit={
        Object.keys(visibleDefaults).length
          ? {
              id: "",
              updates: {
                ...visibleDefaults,
                _id: "",
              } as GenericItem,
            }
          : undefined
      }
      {...resolveTableActionFormLayout(addButtonConfig, {
        topClassName: "flex flex-col gap-2",
      })}
    />
  );
}

export function DeleteItemModal({
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
  t: TFunction;
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
  displayFields,
  editInputs,
  editFormKeys,
  editDefaultValues,
  editConstantValues,
  editActionConfig,
  handleSubmitItem,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  rowToAction: GenericItem;
  displayFields: Field[];
  editInputs: GenericInputType[];
  editFormKeys: FormKeyDef[];
  editDefaultValues: Record<string, unknown>;
  editConstantValues: {
    visibleDefaults: Record<string, unknown>;
    hiddenValues: Record<string, unknown>;
  };
  editActionConfig?: TableActionConfig;
  handleSubmitItem: (item: GenericItem | UpdatePayload<GenericItem>) => void | Promise<void>;
  t: TFunction;
}) {
  const normalizedUpdates = normalizeRowForEdit(rowToAction, displayFields);

  return (
    <GenericAddEditPanel
      isOpen={isOpen}
      close={close}
      inputs={editInputs}
      formKeys={editFormKeys}
      submitItem={(item) => {
        if ("id" in item && "updates" in item) {
          void handleSubmitItem({
            id: item.id as string | number,
            updates: applyHiddenActionValues(
              item.updates as Record<string, unknown>,
              editConstantValues.hiddenValues,
            ) as Partial<GenericItem>,
          });
        }
      }}
      isEditMode
      buttonName={editActionConfig?.buttonName || t("Edit")}
      {...resolveTableActionFormLayout(editActionConfig, {
        topClassName: "flex flex-col gap-2",
      })}
      itemToEdit={{
        id: rowToAction._id,
        updates: buildActionInitialValues(
          editDefaultValues,
          editConstantValues.visibleDefaults,
          normalizedUpdates,
        ) as GenericItem,
      }}
    />
  );
}

export function CustomActionModal({
  isOpen,
  close,
  action,
  rowToAction,
  actionInputs,
  actionFormKeys,
  defaultValues,
  constantValues,
  isWorkflowAction,
  executeWorkflow,
  updateDynamicItem,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  action: TableActionConfig;
  rowToAction: GenericItem;
  actionInputs: GenericInputType[];
  actionFormKeys: FormKeyDef[];
  defaultValues: Record<string, unknown>;
  constantValues: {
    visibleDefaults: Record<string, unknown>;
    hiddenValues: Record<string, unknown>;
  };
  isWorkflowAction: boolean;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
  updateDynamicItem: (id: string | number, updates: Partial<GenericItem>) => void;
  t: TFunction;
}) {
  const workflowSubmit = action.submit;

  return (
    <GenericAddEditPanel
      isOpen={isOpen}
      close={close}
      inputs={actionInputs}
      formKeys={actionFormKeys}
      submitItem={(item) => {
        if ("id" in item && "updates" in item) {
          const record = applyHiddenActionValues(
            {
              ...rowToAction,
              ...(item.updates as Record<string, unknown>),
            },
            constantValues.hiddenValues,
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
          defaultValues,
          constantValues.visibleDefaults,
          rowToAction,
        ) as GenericItem,
      }}
    />
  );
}

export function BulkDeleteModal({
  isOpen,
  close,
  confirm,
  bulkDeleteActionConfig,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  confirm: () => void;
  bulkDeleteActionConfig?: TableActionConfig;
  t: TFunction;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      close={close}
      confirm={confirm}
      title={t(
        bulkDeleteActionConfig?.confirmTitle ||
          bulkDeleteActionConfig?.label ||
          "Delete Selected",
      )}
      text={t(
        bulkDeleteActionConfig?.confirmText ||
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
  isStepTwo,
  onSubmit,
  onBackOrForward,
  bulkEditActionConfig,
  t,
}: {
  isOpen: boolean;
  close: () => void;
  inputs: GenericInputType[];
  formKeys: FormKeyDef[];
  onFormChange: (form: Record<string, unknown>) => void;
  isStepTwo: boolean;
  onSubmit: () => void;
  onBackOrForward: () => void;
  bulkEditActionConfig?: TableActionConfig;
  t: TFunction;
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
        bulkEditActionConfig?.buttonName ||
          bulkEditActionConfig?.label ||
          "Edit",
      )}
      isSubmitButtonActive={isStepTwo}
      submitFunction={onSubmit}
      additionalButtons={[
        {
          label: isStepTwo ? t("Back") : t("Forward"),
          onClick: onBackOrForward,
        },
      ]}
    />
  );
}
