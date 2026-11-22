import { useCallback, useMemo, useState } from "react";
import type { TFunction } from "i18next";
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
import {
  mergeTableConstantValues,
  omitTableConstantKeys,
} from "../../../../utils/tableConstantValues";
import type { GenericInputType } from "../../shared/types";
import type { GenericItem } from "../tableActionForm";
import { useActionFormSelectionData } from "../useActionFormSelectionData";
import { buildRowActions } from "./buildRowActions";
import type { FormKeyDef } from "./formInputBuilders";
import { AddItemModal } from "./TableActionModals";

type RequestConfig = ReturnType<typeof useTenantProject>["requestConfig"];

export function useUnpaginatedRowActions({
  t,
  schemaName,
  requestConfig,
  tableConfig,
  constantFilter,
  actionsEnabled,
  items,
  displayFields,
  inputs,
  formKeys,
  createDynamicItem,
  updateDynamicItem,
  deleteDynamicItem,
  executeWorkflow,
}: {
  t: TFunction;
  schemaName: string;
  requestConfig: RequestConfig;
  tableConfig?: TableComponentConfig;
  constantFilter?: Record<string, unknown>;
  actionsEnabled: boolean;
  items: GenericItem[] | undefined;
  displayFields: Field[];
  inputs: GenericInputType[];
  formKeys: FormKeyDef[];
  createDynamicItem: (item: GenericItem) => void;
  updateDynamicItem: (id: string | number, updates: Partial<GenericItem>) => void;
  deleteDynamicItem: (id: string | number) => void;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCustomActionOpen, setIsCustomActionOpen] = useState(false);
  const [activeCustomAction, setActiveCustomAction] =
    useState<TableActionConfig | null>(null);
  const [rowToAction, setRowToAction] = useState<GenericItem | null>(null);

  const handleSubmitItem = useCallback(
    async (item: GenericItem | UpdatePayload<GenericItem>) => {
      if ("id" in item && "updates" in item) {
        const target = getArraySourceMutationTarget(rowToAction || undefined);
        if (target) {
          await updateDynamicArrayRow({
            ...requestConfig,
            schemaName,
            parentId: target.parentId,
            arrayField: target.arrayField,
            rowIdentityField: target.rowIdentityField,
            rowIdentity: target.rowIdentity,
            updates: item.updates as Record<string, unknown>,
          });
          return;
        }
        updateDynamicItem(
          item.id as string | number,
          omitTableConstantKeys(
            item.updates as GenericItem,
            tableConfig?.constantFilters,
            constantFilter,
          ) as Partial<GenericItem>,
        );
      } else {
        const addConstants = partitionActionConstantValues(
          tableConfig?.addButton?.constantValues,
          formKeys.map((formKey) => formKey.key),
        );
        const nextItem = mergeTableConstantValues(
          applyHiddenActionValues(
            item as GenericItem,
            addConstants.hiddenValues,
          ) as GenericItem,
          undefined,
          tableConfig?.constantFilters,
          constantFilter,
        );
        const source = tableConfig?.arraySource;
        const parentId = items?.[0]?._id;
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
            item: nextItem as Record<string, unknown>,
          });
          return;
        }
        createDynamicItem(nextItem);
      }
    },
    [
      requestConfig,
      updateDynamicItem,
      createDynamicItem,
      tableConfig,
      constantFilter,
      formKeys,
      rowToAction,
      schemaName,
      items,
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
    const addConstants = partitionActionConstantValues(
      tableConfig?.addButton?.constantValues,
      formKeys.map((formKey) => formKey.key),
    );
    return {
      name: t("Add"),
      isModal: true,
      modal: (
        <AddItemModal
          isOpen={isAddOpen}
          close={() => setIsAddOpen(false)}
          inputs={inputs}
          formKeys={formKeys}
          submitItem={handleSubmitItem}
          visibleDefaults={addConstants.visibleDefaults}
          addButtonConfig={tableConfig?.addButton}
        />
      ),
      isModalOpen: isAddOpen,
      setIsModal: setIsAddOpen,
      isPath: false,
      icon: null,
      className: "bg-blue-500 hover:text-blue-500 hover:border-blue-500",
    };
  }, [
    t,
    isAddOpen,
    inputs,
    formKeys,
    handleSubmitItem,
    tableConfig?.addButton,
  ]);

  const actionSelectionDataMap = useActionFormSelectionData(
    tableConfig?.actions || [],
  );

  const actions = useMemo(
    () =>
      buildRowActions({
        t,
        actionsEnabled,
        tableActions: tableConfig?.actions,
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
      }),
    [
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
      inputs,
      formKeys,
      actionsEnabled,
      displayFields,
      tableConfig?.actions,
      actionSelectionDataMap,
    ],
  );

  return {
    addButton,
    actions,
  };
}
