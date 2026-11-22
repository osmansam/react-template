import { useCallback, useMemo, useState } from "react";
import type { TableActionConfig } from "../../../../types/page";
import {
  applyHiddenActionValues,
  partitionActionConstantValues,
} from "../../../../utils/actionConstantValues";
import type { Field } from "../../../../utils/api/container";
import { type GenericItem, parseActionConstantValues } from "../tableActionForm";
import { useActionFormSelectionData } from "../useActionFormSelectionData";
import { BulkDeleteDialog, BulkEditModal } from "./ActionModals";
import {
  buildBulkEditInputs,
  buildBulkFieldOptions,
  buildBulkFormKeys,
  buildBulkInitialStepTwoValues,
  coerceBulkEditUpdates,
} from "./bulkInputBuilders";
import type { SelectionDataMap } from "./formInputBuilders";
import type { TranslateFn } from "./tableHelpers";

export type UseBulkActionsParams = {
  bulkEditActionConfig?: TableActionConfig;
  bulkDeleteActionConfig?: TableActionConfig;
  bulkSchemaActionsEnabled: boolean;
  displayFields: Field[];
  selectionDataMap: SelectionDataMap;
  selectedRows: GenericItem[];
  setSelectedRows: (rows: GenericItem[]) => void;
  setIsSelectionActive: (active: boolean) => void;
  updateMultipleDynamicItem: (
    items: Array<{ _id: string | number; updates: Partial<GenericItem> }>,
  ) => void;
  deleteMultipleDynamicItem: (items: Array<{ _id: string | number }>) => void;
  t: TranslateFn;
};

export function useBulkActions({
  bulkEditActionConfig,
  bulkDeleteActionConfig,
  bulkSchemaActionsEnabled,
  displayFields,
  selectionDataMap,
  selectedRows,
  setSelectedRows,
  setIsSelectionActive,
  updateMultipleDynamicItem,
  deleteMultipleDynamicItem,
  t,
}: UseBulkActionsParams) {
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkStepTwo, setIsBulkStepTwo] = useState(false);
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState<Record<string, unknown>>({});

  const configuredBulkEditFields = useMemo(
    () => bulkEditActionConfig?.formFields || [],
    [bulkEditActionConfig?.formFields],
  );
  const bulkActionSelectionDataMap = useActionFormSelectionData(
    bulkEditActionConfig ? [bulkEditActionConfig] : [],
  );

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

    const updates = coerceBulkEditUpdates({
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
    const items = selectedRows.map((r) => ({
      _id: r._id,
      updates: submittedUpdates,
    }));
    updateMultipleDynamicItem(items);
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
        const initialStepTwoValues = buildBulkInitialStepTwoValues({
          selectedKeys,
          displayFields,
          bulkEditActionConfig,
        });
        setBulkForm((prev) => ({
          ...prev,
          ...initialStepTwoValues,
        }));
        setIsBulkStepTwo(true);
      }
    }
  }, [isBulkStepTwo, bulkForm, displayFields, bulkEditActionConfig]);

  const handleBulkDeleteConfirm = useCallback(() => {
    deleteMultipleDynamicItem(selectedRows.map((r) => ({ _id: r._id })));
    setSelectedRows([]);
    setIsSelectionActive(false);
    setIsBulkDeleteOpen(false);
  }, [
    selectedRows,
    deleteMultipleDynamicItem,
    setSelectedRows,
    setIsSelectionActive,
  ]);

  const selectionActions = useMemo(
    () => [
      ...(bulkDeleteActionConfig && bulkDeleteActionConfig.enabled !== false
        ? [
            {
              name: t(bulkDeleteActionConfig.label || "Delete Selected"),
              isButton: true,
              buttonClassName:
                bulkDeleteActionConfig.buttonClassName ||
                "px-2 bg-red-500 hover:text-red-500 hover:border-red-500 sm:px-3 py-1 h-fit w-fit  text-white  hover:bg-white  transition-transform  border  rounded-md cursor-pointer",
              isModal: true,
              className: "cursor-pointer",
              isDisabled: !bulkSchemaActionsEnabled || !selectedRows?.length,
              modal:
                selectedRows?.length > 0 ? (
                  <BulkDeleteDialog
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
              name: t(bulkEditActionConfig.label || "Edit Selected"),
              isButton: true,
              buttonClassName:
                bulkEditActionConfig.buttonClassName ||
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
                  bulkEditActionConfig={bulkEditActionConfig}
                  isBulkStepTwo={isBulkStepTwo}
                  onSubmit={handleBulkEditSubmit}
                  onBackOrForward={handleBulkEditBackOrForward}
                  t={t}
                />
              ) : null,
              isModalOpen: isBulkEditOpen,
              setIsModal: setIsBulkEditOpen,
              isPath: false,
              isDisabled: !bulkSchemaActionsEnabled || !selectedRows?.length,
            },
          ]
        : []),
    ],
    [
      t,
      bulkSchemaActionsEnabled,
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

  return { selectionActions };
}
