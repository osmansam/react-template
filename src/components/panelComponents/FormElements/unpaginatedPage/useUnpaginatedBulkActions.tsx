import { useCallback, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import type { TableComponentConfig } from "../../../../types/page";
import {
  applyHiddenActionValues,
  partitionActionConstantValues,
} from "../../../../utils/actionConstantValues";
import type { Field } from "../../../../utils/api/container";
import {
  type GenericItem,
  parseActionConstantValues,
} from "../tableActionForm";
import { useActionFormSelectionData } from "../useActionFormSelectionData";
import {
  buildBulkEditInputs,
  buildBulkFieldOptions,
  buildBulkFormKeys,
  coerceBulkUpdates,
  computeInitialBulkValues,
} from "./bulkFormBuilders";
import { BulkDeleteModal, BulkEditModal } from "./TableActionModals";

export function useUnpaginatedBulkActions({
  t,
  schemaName,
  tableConfig,
  actionsEnabled,
  displayFields,
  selectionDataMap,
  selectedRows,
  setSelectedRows,
  setIsSelectionActive,
  executeWorkflow,
  updateMultipleDynamicItem,
  deleteMultipleDynamicItem,
}: {
  t: TFunction;
  schemaName: string;
  tableConfig?: TableComponentConfig;
  actionsEnabled: boolean;
  displayFields: Field[];
  selectionDataMap: Map<string, Record<string, unknown>[]>;
  selectedRows: GenericItem[];
  setSelectedRows: React.Dispatch<React.SetStateAction<GenericItem[]>>;
  setIsSelectionActive: React.Dispatch<React.SetStateAction<boolean>>;
  executeWorkflow: (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => void;
  updateMultipleDynamicItem: (
    items: Array<{ _id: string | number; updates: Partial<GenericItem> }>,
  ) => void;
  deleteMultipleDynamicItem: (items: Array<{ _id: string | number }>) => void;
}) {
  const bulkEditActionConfig = tableConfig?.bulkActions?.edit;
  const bulkDeleteActionConfig = tableConfig?.bulkActions?.delete;
  const isBulkSelectionEnabled = Boolean(
    (bulkEditActionConfig && bulkEditActionConfig.enabled !== false) ||
      (bulkDeleteActionConfig && bulkDeleteActionConfig.enabled !== false),
  );
  const configuredBulkEditFields = useMemo(
    () => bulkEditActionConfig?.formFields || [],
    [bulkEditActionConfig?.formFields],
  );
  const bulkActionSelectionDataMap = useActionFormSelectionData(
    bulkEditActionConfig ? [bulkEditActionConfig] : [],
  );

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkStepTwo, setIsBulkStepTwo] = useState(false);
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState<Record<string, unknown>>({});

  const bulkFieldOptions = useMemo(
    () =>
      buildBulkFieldOptions({
        configuredBulkEditFields,
        displayFields,
        t,
      }),
    [configuredBulkEditFields, displayFields, t],
  );

  const bulkFormKeys = useMemo(
    () =>
      buildBulkFormKeys({
        isBulkStepTwo,
        configuredBulkEditFields,
        bulkEditActionConfig,
        displayFields,
        bulkSelectedKeys,
      }),
    [
      bulkEditActionConfig,
      configuredBulkEditFields,
      displayFields,
      bulkSelectedKeys,
      isBulkStepTwo,
    ],
  );

  const bulkEditInputs = useMemo(
    () =>
      buildBulkEditInputs({
        t,
        bulkFieldOptions,
        isBulkStepTwo,
        displayFields,
        bulkSelectedKeys,
        configuredBulkEditFields,
        bulkEditActionConfig,
        bulkActionSelectionDataMap,
        selectionDataMap,
      }),
    [
      t,
      bulkFieldOptions,
      isBulkStepTwo,
      displayFields,
      bulkSelectedKeys,
      configuredBulkEditFields,
      bulkEditActionConfig,
      bulkActionSelectionDataMap,
      selectionDataMap,
    ],
  );

  const handleBulkEditSubmit = useCallback(() => {
    if (!isBulkStepTwo) return;

    const updates = coerceBulkUpdates({
      bulkForm,
      bulkSelectedKeys,
      bulkFormKeys,
    });

    const bulkConstants = partitionActionConstantValues(
      bulkEditActionConfig
        ? parseActionConstantValues(bulkEditActionConfig)
        : {},
      bulkSelectedKeys,
    );
    const submittedUpdates = applyHiddenActionValues(
      updates,
      bulkConstants.hiddenValues,
    );
    const items = (selectedRows as GenericItem[]).map((r) => ({
      _id: r._id,
      updates: submittedUpdates,
    }));
    if (bulkEditActionConfig?.submit?.workflowName) {
      executeWorkflow({
        workflowName: bulkEditActionConfig.submit.workflowName,
        workflowSchema:
          bulkEditActionConfig.submit.workflowSchema || schemaName,
        record: {
          selectedIds: (selectedRows as GenericItem[]).map((r) => r._id),
          updates: submittedUpdates,
          items,
          functionName: bulkEditActionConfig.submit.functionName,
        },
      });
    } else {
      updateMultipleDynamicItem(items);
    }
    setSelectedRows([]);
    setIsSelectionActive(false);
    setIsBulkStepTwo(false);
    setBulkSelectedKeys([]);
    setBulkForm({});
    setIsBulkEditOpen(false);
  }, [
    isBulkStepTwo,
    bulkForm,
    bulkSelectedKeys,
    bulkFormKeys,
    bulkEditActionConfig,
    selectedRows,
    schemaName,
    executeWorkflow,
    updateMultipleDynamicItem,
    setSelectedRows,
    setIsSelectionActive,
  ]);

  const handleBulkEditClose = useCallback(() => {
    setIsBulkEditOpen(false);
    setIsBulkStepTwo(false);
    setBulkSelectedKeys([]);
    setBulkForm({});
  }, []);

  const handleBulkFormChange = useCallback((f: Record<string, unknown>) => {
    setBulkForm((prev) => ({ ...prev, ...f }));
  }, []);

  const handleBulkEditBackOrForward = useCallback(() => {
    if (isBulkStepTwo) {
      setIsBulkStepTwo(false);
    } else {
      const selectedKeys = Array.isArray(bulkForm.bulkSelectedKeys)
        ? (bulkForm.bulkSelectedKeys as string[])
        : [];
      if (selectedKeys.length > 0) {
        setBulkSelectedKeys(selectedKeys);

        const initialBulkValues = computeInitialBulkValues({
          selectedKeys,
          configuredBulkEditFields,
          bulkEditActionConfig,
          displayFields,
        });

        const bulkConstants = partitionActionConstantValues(
          bulkEditActionConfig
            ? parseActionConstantValues(bulkEditActionConfig)
            : {},
          selectedKeys,
        );
        setBulkForm((prev) => ({
          ...prev,
          ...initialBulkValues,
          ...bulkConstants.visibleDefaults,
        }));
        setIsBulkStepTwo(true);
      }
    }
  }, [
    isBulkStepTwo,
    bulkForm,
    bulkEditActionConfig,
    configuredBulkEditFields,
    displayFields,
  ]);

  const handleBulkDeleteConfirm = useCallback(() => {
    const items = selectedRows.map((r) => ({ _id: (r as GenericItem)._id }));
    if (bulkDeleteActionConfig?.submit?.workflowName) {
      executeWorkflow({
        workflowName: bulkDeleteActionConfig.submit.workflowName,
        workflowSchema:
          bulkDeleteActionConfig.submit.workflowSchema || schemaName,
        record: {
          selectedIds: items.map((item) => item._id),
          items,
          functionName: bulkDeleteActionConfig.submit.functionName,
        },
      });
    } else {
      deleteMultipleDynamicItem(items);
    }
    setSelectedRows([]);
    setIsSelectionActive(false);
    setIsBulkDeleteOpen(false);
  }, [
    selectedRows,
    bulkDeleteActionConfig,
    schemaName,
    executeWorkflow,
    deleteMultipleDynamicItem,
    setSelectedRows,
    setIsSelectionActive,
  ]);

  const selectionActions = useMemo(
    () => [
      ...(bulkDeleteActionConfig && bulkDeleteActionConfig.enabled !== false
        ? [
            {
              name: t(bulkDeleteActionConfig?.label || "Delete Selected"),
              isButton: true,
              buttonClassName:
                bulkDeleteActionConfig?.buttonClassName ||
                "px-2 bg-red-500 hover:text-red-500 hover:border-red-500 sm:px-3 py-1 h-fit w-fit  text-white  hover:bg-white  transition-transform  border  rounded-md cursor-pointer",
              isModal: true,
              className: "cursor-pointer",
              isDisabled: !actionsEnabled || !selectedRows?.length,
              modal:
                selectedRows?.length > 0 ? (
                  <BulkDeleteModal
                    isOpen={isBulkDeleteOpen}
                    close={() => setIsBulkDeleteOpen(false)}
                    confirm={handleBulkDeleteConfirm}
                    bulkDeleteActionConfig={bulkDeleteActionConfig}
                    t={t}
                  />
                ) : null,
              isModalOpen: isBulkDeleteOpen,
              setIsModal: setIsBulkDeleteOpen,
              isPath: false,
            },
          ]
        : []),
      ...(bulkEditActionConfig && bulkEditActionConfig.enabled !== false
        ? [
            {
              name: t(bulkEditActionConfig?.label || "Edit Selected"),
              isButton: true,
              buttonClassName:
                bulkEditActionConfig?.buttonClassName ||
                "px-2  bg-blue-500 hover:text-blue-500 hover:border-blue-500 sm:px-3 py-1 h-fit w-fit text-white hover:bg-white transition-transform border rounded-md cursor-pointer",
              isModal: true,
              className: "cursor-pointer",
              modal: isBulkEditOpen ? (
                <BulkEditModal
                  isOpen={isBulkEditOpen}
                  close={handleBulkEditClose}
                  inputs={bulkEditInputs}
                  formKeys={bulkFormKeys}
                  onFormChange={handleBulkFormChange}
                  isStepTwo={isBulkStepTwo}
                  onSubmit={handleBulkEditSubmit}
                  onBackOrForward={handleBulkEditBackOrForward}
                  bulkEditActionConfig={bulkEditActionConfig}
                  t={t}
                />
              ) : null,
              isModalOpen: isBulkEditOpen,
              setIsModal: setIsBulkEditOpen,
              isPath: false,
              isDisabled: !actionsEnabled || !selectedRows?.length,
            },
          ]
        : []),
    ],
    [
      t,
      actionsEnabled,
      selectedRows,
      bulkDeleteActionConfig,
      isBulkDeleteOpen,
      handleBulkDeleteConfirm,
      bulkEditActionConfig,
      isBulkEditOpen,
      handleBulkEditClose,
      handleBulkFormChange,
      bulkEditInputs,
      bulkFormKeys,
      isBulkStepTwo,
      handleBulkEditSubmit,
      handleBulkEditBackOrForward,
    ],
  );

  return {
    isBulkSelectionEnabled,
    selectionActions,
  };
}
