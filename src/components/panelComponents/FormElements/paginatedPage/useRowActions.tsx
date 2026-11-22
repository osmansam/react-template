import { useCallback, useMemo, useState } from "react";
import type { useTenantProject } from "../../../../hooks/useTenantProject";
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
import {
  addDynamicArrayRow,
  deleteDynamicArrayRow,
  updateDynamicArrayRow,
} from "../../../../utils/api/dynamicArray";
import { getArraySourceMutationTarget } from "../../../../utils/tableConfig";
import type { GenericInputType } from "../../shared/types";
import {
  type GenericItem,
  buildActionFormKeys,
  buildActionInputs,
  getActionDefaultValues,
  getActionId,
  parseActionConstantValues,
} from "../tableActionForm";
import { useActionFormSelectionData } from "../useActionFormSelectionData";
import { AddItemModal } from "./ActionModals";
import type { FormKeyItem } from "./formInputBuilders";
import {
  type RowActionBuilderContext,
  buildCustomRowAction,
  buildDeleteRowAction,
  buildEditRowAction,
} from "./rowActionBuilders";
import type { TranslateFn } from "./tableHelpers";

type TenantRequestConfig = ReturnType<typeof useTenantProject>["requestConfig"];

export type UseRowActionsParams = {
  schemaName: string;
  tableConfig?: TableComponentConfig;
  actionsEnabled: boolean;
  schemaActionsEnabled: boolean;
  isActionsActive: boolean;
  constantFilter?: Record<string, unknown>;
  constantFilterKeys: string[];
  displayFields: Field[];
  inputs: GenericInputType[];
  formKeys: FormKeyItem[];
  rows: GenericItem[];
  requestConfig: TenantRequestConfig;
  createDynamicItem: (item: GenericItem) => void;
  updateDynamicItem: (
    id: string | number,
    updates: Partial<GenericItem>,
  ) => void;
  deleteDynamicItem: (id: string | number) => void;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
  t: TranslateFn;
};

export function useRowActions({
  schemaName,
  tableConfig,
  actionsEnabled,
  schemaActionsEnabled,
  isActionsActive,
  constantFilter,
  constantFilterKeys,
  displayFields,
  inputs,
  formKeys,
  rows,
  requestConfig,
  createDynamicItem,
  updateDynamicItem,
  deleteDynamicItem,
  executeWorkflow,
  t,
}: UseRowActionsParams) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCustomActionOpen, setIsCustomActionOpen] = useState(false);
  const [activeCustomAction, setActiveCustomAction] =
    useState<TableActionConfig | null>(null);
  const [rowToAction, setRowToAction] = useState<GenericItem | null>(null);

  const configuredAddButtonAction =
    tableConfig?.addButton !== undefined
      ? tableConfig.addButton.enabled !== false
        ? tableConfig.addButton
        : undefined
      : tableConfig?.actions?.find(
          (action) => action.kind === "create" && action.enabled !== false,
        );

  const addButtonActionId = configuredAddButtonAction
    ? getActionId(configuredAddButtonAction, 0)
    : "create";

  const actionSelectionDataMap = useActionFormSelectionData([
    ...(configuredAddButtonAction ? [configuredAddButtonAction] : []),
    ...(tableConfig?.actions || []).filter(
      (action) => action.kind !== "create",
    ),
  ]);

  const addButtonDefaults = useMemo(
    () =>
      configuredAddButtonAction
        ? getActionDefaultValues(configuredAddButtonAction)
        : {},
    [configuredAddButtonAction],
  );
  const addButtonWorkflowSubmit = configuredAddButtonAction?.submit;
  const isAddButtonWorkflowAction = Boolean(
    addButtonWorkflowSubmit?.workflowName &&
    addButtonWorkflowSubmit?.workflowSchema,
  );
  const addButtonInputs = configuredAddButtonAction
    ? buildActionInputs(
        configuredAddButtonAction,
        inputs,
        addButtonActionId,
        actionSelectionDataMap,
      )
    : inputs;
  const addButtonFormKeys =
    configuredAddButtonAction?.formFields !== undefined
      ? buildActionFormKeys(configuredAddButtonAction, addButtonInputs)
      : formKeys.filter((formKey) =>
          new Set(addButtonInputs.map((input) => input.formKey)).has(
            formKey.key,
          ),
        );
  const addButtonConstants = partitionActionConstantValues(
    configuredAddButtonAction
      ? parseActionConstantValues(configuredAddButtonAction)
      : {},
    addButtonFormKeys.map((formKey) => formKey.key),
  );

  const handleSubmitItem = useCallback(
    async (item: GenericItem | UpdatePayload<GenericItem>) => {
      if ("id" in item && "updates" in item) {
        const updates = item.updates as Record<string, unknown>;
        const filteredUpdates = constantFilter
          ? Object.fromEntries(
              Object.entries(updates).filter(
                ([key]) => !constantFilterKeys.includes(key),
              ),
            )
          : updates;
        const target = getArraySourceMutationTarget(rowToAction || undefined);
        if (target) {
          await updateDynamicArrayRow({
            ...requestConfig,
            schemaName,
            parentId: target.parentId,
            arrayField: target.arrayField,
            rowIdentityField: target.rowIdentityField,
            rowIdentity: target.rowIdentity,
            updates: filteredUpdates,
          });
          return;
        }
        updateDynamicItem(
          item.id as string | number,
          filteredUpdates as Partial<GenericItem>,
        );
      } else {
        const configuredCreateValues = applyHiddenActionValues(
          {
            ...addButtonDefaults,
            ...(item as Record<string, unknown>),
          },
          addButtonConstants.hiddenValues,
        );
        const mergedItem = constantFilter
          ? { ...configuredCreateValues, ...constantFilter }
          : configuredCreateValues;
        if (isAddButtonWorkflowAction) {
          executeWorkflow({
            workflowName: addButtonWorkflowSubmit?.workflowName || "",
            workflowSchema: addButtonWorkflowSubmit?.workflowSchema,
            record: mergedItem,
          });
          return;
        }
        const source = tableConfig?.arraySource;
        const parentId = getArraySourceMutationTarget(rows[0])?.parentId;
        if (
          source?.enabled &&
          source.field &&
          source.rowIdentityField &&
          parentId != null
        ) {
          await addDynamicArrayRow({
            ...requestConfig,
            schemaName,
            parentId,
            arrayField: source.field,
            rowIdentityField: source.rowIdentityField,
            item: mergedItem,
          });
          return;
        }
        createDynamicItem(mergedItem as GenericItem);
      }
    },
    [
      requestConfig,
      updateDynamicItem,
      createDynamicItem,
      constantFilter,
      constantFilterKeys,
      addButtonDefaults,
      addButtonConstants,
      addButtonWorkflowSubmit,
      isAddButtonWorkflowAction,
      executeWorkflow,
      rowToAction,
      schemaName,
      tableConfig?.arraySource,
      rows,
    ],
  );

  const deleteTableRow = useCallback(
    async (row: GenericItem) => {
      const target = getArraySourceMutationTarget(row);
      if (target) {
        await deleteDynamicArrayRow({
          ...requestConfig,
          schemaName,
          parentId: target.parentId,
          arrayField: target.arrayField,
          rowIdentityField: target.rowIdentityField,
          rowIdentity: target.rowIdentity,
        });
        return;
      }
      deleteDynamicItem(row._id);
    },
    [deleteDynamicItem, schemaName, requestConfig],
  );

  const addButton = useMemo(() => {
    if (!actionsEnabled) return undefined;
    if (!configuredAddButtonAction) {
      if (!schemaActionsEnabled || tableConfig?.addButton?.enabled === false) {
        return undefined;
      }
    }

    const actionConfig = configuredAddButtonAction || {
      kind: "create" as const,
    };

    return {
      name: actionConfig.label || t("Add"),
      isModal: true,
      modal: (
        <AddItemModal
          isOpen={isAddOpen}
          close={() => setIsAddOpen(false)}
          actionConfig={actionConfig}
          inputs={addButtonInputs}
          formKeys={addButtonFormKeys}
          submitItem={handleSubmitItem}
          constantFilter={constantFilter}
          defaults={addButtonDefaults}
          constants={addButtonConstants}
        />
      ),
      isModalOpen: isAddOpen,
      setIsModal: setIsAddOpen,
      isPath: false,
      icon: null,
      className:
        actionConfig.buttonClassName ||
        actionConfig.className ||
        "bg-blue-500 hover:text-blue-500 hover:border-blue-500",
    };
  }, [
    t,
    actionsEnabled,
    schemaActionsEnabled,
    configuredAddButtonAction,
    tableConfig?.addButton?.enabled,
    isAddOpen,
    addButtonInputs,
    addButtonFormKeys,
    handleSubmitItem,
    constantFilter,
    addButtonDefaults,
    addButtonConstants,
  ]);

  const actions = useMemo(() => {
    if (!isActionsActive) return [];

    const configuredActions = (tableConfig?.actions || [])
      .filter((action) => action.kind !== "create")
      .filter((action) => action.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const hasConfiguredActions = Array.isArray(tableConfig?.actions);
    const hasConfiguredDeleteAction = configuredActions.some(
      (action) => action.kind === "delete",
    );
    const hasConfiguredEditAction = configuredActions.some(
      (action) => action.kind === "edit",
    );

    const ctx: RowActionBuilderContext = {
      t,
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
      displayFields,
      inputs,
      formKeys,
      actionSelectionDataMap,
    };

    if (!hasConfiguredActions || configuredActions.length === 0) {
      if (!schemaActionsEnabled) return [];
      return [buildDeleteRowAction(ctx), buildEditRowAction(ctx)];
    }

    return configuredActions
      .flatMap((action, index) => {
        if (action.kind === "defaults") {
          return [
            !hasConfiguredDeleteAction ? buildDeleteRowAction(ctx) : null,
            !hasConfiguredEditAction ? buildEditRowAction(ctx) : null,
          ];
        }
        if (action.kind === "delete") return buildDeleteRowAction(ctx, action);
        if (action.kind === "edit") return buildEditRowAction(ctx, action);
        return buildCustomRowAction(ctx, action, index);
      })
      .filter((action): action is NonNullable<typeof action> =>
        Boolean(action),
      );
  }, [
    t,
    rowToAction,
    isDeleteOpen,
    isEditOpen,
    isCustomActionOpen,
    activeCustomAction,
    deleteTableRow,
    updateDynamicItem,
    executeWorkflow,
    handleSubmitItem,
    formKeys,
    schemaActionsEnabled,
    isActionsActive,
    displayFields,
    inputs,
    tableConfig?.actions,
    actionSelectionDataMap,
  ]);

  return { addButton, actions };
}
