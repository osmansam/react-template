// pages/GenericPaginatedPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit } from "react-icons/fi";
import { HiOutlineTrash } from "react-icons/hi2";
import { ConfirmationDialog } from "../../../common/ConfirmationDialog";
import { useGeneralContext } from "../../../context/General.context";
import { FormElementsState } from "../../../types";
import { UpdatePayload } from "../../../utils/api";
import {
  ContainerModel,
  Field,
  useGetContainers,
} from "../../../utils/api/container";
import { useDynamicCrud, useGetPaginatedItems } from "../../../utils/dynamic";
import { FormKeyTypeEnum, InputTypes } from "../shared/types";
import GenericTable from "../Tables/GenericTable";
import GenericAddEditPanel from "./GenericAddEditPanel";

type GenericItem = Record<string, unknown> & { _id: string };

type Props = {
  schemaName: string;
  includeFields?: string[];
  excludeFields?: string[];
  actionsEnabled?: boolean;
};

type RawField = {
  name?: string;
  Name?: string;
  type?: string;
  Type?: string;
  tag?: string;
  Tag?: string;
  objectSchemaName?: string;
  ObjectSchemaName?: string;
  isForceDelete?: boolean;
  IsForceDelete?: boolean;
  unique?: boolean;
  Unique?: boolean;
  isHashed?: boolean;
  IsHashed?: boolean;
  isLoginCredential?: boolean;
  IsLoginCredential?: boolean;
  isSearchable?: boolean;
  IsSearchable?: boolean;
  children?: RawField[];
  Children?: RawField[];
};

type RawContainer = {
  _id?: string;
  ID?: string;
  schemaName?: string;
  SchemaName?: string;
  fields?: RawField[];
  Fields?: RawField[];
  routes?: unknown;
  Routes?: unknown;
  redis?: unknown;
  Redis?: unknown;
  pipelines?: unknown[];
  Pipelines?: unknown[];
  dynamicFunctions?: unknown[];
  DynamicFunctions?: unknown[];
  dynamicApis?: unknown[];
  DynamicApis?: unknown[];
  isAuthContainer?: boolean;
  IsAuthContainer?: boolean;
  populationArray?: unknown[];
  PopulationArray?: unknown[];
  populatedRoutes?: string[];
  PopulatedRoutes?: string[];
};

const humanize = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const normalizeField = (f: RawField): Field => ({
  name: f.name ?? f.Name ?? "",
  type: f.type ?? f.Type ?? "",
  tag: f.tag ?? f.Tag,
  objectSchemaName: f.objectSchemaName ?? f.ObjectSchemaName,
  isForceDelete: f.isForceDelete ?? f.IsForceDelete,
  unique: f.unique ?? f.Unique,
  isHashed: f.isHashed ?? f.IsHashed,
  isLoginCredential: f.isLoginCredential ?? f.IsLoginCredential,
  isSearchable: f.isSearchable ?? f.IsSearchable,
  children: (f.children ?? f.Children ?? [])?.map((c: RawField) =>
    normalizeField(c)
  ),
});

const normalizeContainer = (c: RawContainer): ContainerModel => ({
  _id: c._id ?? c.ID,
  schemaName: c.schemaName ?? c.SchemaName ?? "",
  fields: (c.fields ?? c.Fields ?? []).map((f: RawField) => normalizeField(f)),
  routes:
    (c.routes as ContainerModel["routes"]) ??
    (c.Routes as ContainerModel["routes"]),
  redis:
    (c.redis as ContainerModel["redis"]) ??
    (c.Redis as ContainerModel["redis"]),
  pipelines: (c.pipelines ?? c.Pipelines ?? []) as ContainerModel["pipelines"],
  dynamicFunctions: (c.dynamicFunctions ??
    c.DynamicFunctions ??
    []) as ContainerModel["dynamicFunctions"],
  dynamicApis: (c.dynamicApis ??
    c.DynamicApis ??
    []) as ContainerModel["dynamicApis"],
  isAuthContainer: c.isAuthContainer ?? c.IsAuthContainer ?? false,
  populationArray: (c.populationArray ??
    c.PopulationArray ??
    []) as ContainerModel["populationArray"],
  populatedRoutes: c.populatedRoutes ?? c.PopulatedRoutes ?? [],
});

const isDisplayablePrimitive = (f: Field) => {
  const t = (f.type || "").toLowerCase();
  return [
    "string",
    "number",
    "boolean",
    "date",
    "int",
    "float",
    "double",
    "image",
    "img",
  ].includes(t);
};

function fieldToInput(field: Field) {
  const t = (field.type || "").toLowerCase();
  if (["number", "int", "float", "double"].includes(t))
    return {
      inputType: InputTypes.NUMBER as const,
      formKeyType: FormKeyTypeEnum.NUMBER as const,
    };
  if (["boolean", "bool"].includes(t))
    return {
      inputType: InputTypes.CHECKBOX as const,
      formKeyType: FormKeyTypeEnum.BOOLEAN as const,
    };
  if (["image", "img"].includes(t))
    return {
      inputType: InputTypes.IMAGE as const,
      formKeyType: FormKeyTypeEnum.STRING as const,
    };
  if (["date", "datetime", "timestamp"].includes(t))
    return {
      inputType: InputTypes.DATE as const,
      formKeyType: FormKeyTypeEnum.DATE as const,
    };
  return {
    inputType: InputTypes.TEXT as const,
    formKeyType: FormKeyTypeEnum.STRING as const,
  };
}

export default function GenericPaginatedPage({
  schemaName,
  includeFields,
  excludeFields,
  actionsEnabled = true,
}: Props) {
  const { t } = useTranslation();
  const {
    rowsPerPage,
    currentPage,
    setCurrentPage,
    selectedRows,
    setSelectedRows,
    setIsSelectionActive,
  } = useGeneralContext();

  const rawContainers = useGetContainers();

  const container: ContainerModel | undefined = useMemo(() => {
    if (!rawContainers) return undefined;
    const normalized = rawContainers.map((c: RawContainer) =>
      normalizeContainer(c)
    );
    return normalized.find(
      (c: ContainerModel) =>
        (c.schemaName || "").toLowerCase() === schemaName.toLowerCase()
    );
  }, [rawContainers, schemaName]);

  // Check if container has image fields
  const hasImageField = useMemo(() => {
    if (!container?.fields) return false;
    return container.fields.some(
      (field) =>
        (field.type || "").toLowerCase() === "image" ||
        (field.type || "").toLowerCase() === "img"
    );
  }, [container]);

  const {
    createDynamicItem,
    createMultipleDynamicItem,
    updateDynamicItem,
    deleteDynamicItem,
    deleteMultipleDynamicItem,
    updateMultipleDynamicItem,
  } = useDynamicCrud<GenericItem>(schemaName, hasImageField);

  const [filterPanelFormElements, setFilterPanelFormElements] =
    useState<FormElementsState>({
      search: "",
      sort: "",
      asc: 1,
    });

  const displayFields: Field[] = useMemo(() => {
    if (!container?.fields) return [];
    let fields = container.fields
      .map(normalizeField)
      .filter(isDisplayablePrimitive);
    if (includeFields?.length) {
      fields = includeFields
        .map((name) => fields.find((f) => f.name === name))
        .filter((f): f is Field => Boolean(f));
    }
    if (excludeFields?.length) {
      const ex = new Set(excludeFields);
      fields = fields.filter((f) => !ex.has(f.name));
    }
    const uniq = new Set<string>();
    fields = fields.filter(
      (f) =>
        f.name &&
        !["_id", "id"].includes(f.name) &&
        !uniq.has(f.name) &&
        (uniq.add(f.name), true)
    );
    return fields;
  }, [container, includeFields, excludeFields]);

  const rowKeys = useMemo(
    () =>
      displayFields.map((f) => ({
        key: f.name,
        isImage: (f.type || "").toLowerCase() === "image",
        isDate: (f.type || "").toLowerCase() === "date",
      })),
    [displayFields]
  );

  const columns = useMemo(() => {
    const baseCols = displayFields.map((f) => ({
      key: t(humanize(f.name)),
      isSortable: true,
      correspondingKey: f.name,
    }));
    return actionsEnabled
      ? [...baseCols, { key: t("Actions"), isSortable: false }]
      : baseCols;
  }, [displayFields, t, actionsEnabled]);

  const { inputs, formKeys } = useMemo(() => {
    const ins = displayFields.map((f) => {
      const m = fieldToInput(f);
      const label = t(humanize(f.name));
      return {
        type: m.inputType,
        formKey: f.name,
        label,
        placeholder: label,
        required: false,
      };
    });
    const fks = displayFields.map((f) => {
      const m = fieldToInput(f);
      return { key: f.name, type: m.formKeyType };
    });
    return { inputs: ins, formKeys: fks };
  }, [displayFields, t]);

  const itemsPayload = useGetPaginatedItems(
    currentPage,
    rowsPerPage,
    schemaName,
    filterPanelFormElements
  );

  const rows = useMemo(() => itemsPayload?.items || [], [itemsPayload?.items]);

  const outsideSort = useMemo(
    () => ({ filterPanelFormElements, setFilterPanelFormElements }),
    [filterPanelFormElements]
  );

  const pagination = useMemo(
    () =>
      itemsPayload
        ? {
            totalPages: itemsPayload.totalPages,
            totalRows: itemsPayload.totalItems,
          }
        : null,
    [itemsPayload]
  );

  const outsideSearchProps = useMemo(
    () => ({ t, filterPanelFormElements, setFilterPanelFormElements }),
    [t, filterPanelFormElements]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterPanelFormElements.search,
    filterPanelFormElements.sort,
    filterPanelFormElements.asc,
    setCurrentPage,
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [rowToAction, setRowToAction] = useState<GenericItem | null>(null);

  const handleSubmitItem = useCallback(
    (item: GenericItem | UpdatePayload<GenericItem>) => {
      if ("id" in item && "updates" in item) {
        updateDynamicItem(
          item.id as string | number,
          item.updates as Partial<GenericItem>
        );
      } else {
        createDynamicItem(item as GenericItem);
      }
    },
    [updateDynamicItem, createDynamicItem]
  );

  const addButton = useMemo(
    () => ({
      name: t("Add"),
      isModal: true,
      modal: (
        <GenericAddEditPanel
          isOpen={isAddOpen}
          close={() => setIsAddOpen(false)}
          inputs={inputs}
          formKeys={formKeys}
          submitItem={handleSubmitItem}
          topClassName="flex flex-col gap-2"
        />
      ),
      isModalOpen: isAddOpen,
      setIsModal: setIsAddOpen,
      isPath: false,
      icon: null,
      className: "bg-blue-500 hover:text-blue-500 hover:border-blue-500",
    }),
    [t, isAddOpen, inputs, formKeys, handleSubmitItem]
  );

  const actions = useMemo(() => {
    if (!actionsEnabled) return [];
    return [
      {
        name: t("Delete"),
        icon: <HiOutlineTrash />,
        setRow: setRowToAction as (value: GenericItem) => void,
        modal: rowToAction ? (
          <ConfirmationDialog
            isOpen={isDeleteOpen}
            close={() => setIsDeleteOpen(false)}
            confirm={() => {
              deleteDynamicItem(rowToAction._id);
              setIsDeleteOpen(false);
            }}
            title={t("Delete")}
            text={t("GeneralDeleteMessage")}
          />
        ) : null,
        className: "text-red-500 cursor-pointer text-2xl ml-auto",
        isModal: true,
        isModalOpen: isDeleteOpen,
        setIsModal: setIsDeleteOpen,
        isPath: false,
      },
      {
        name: t("Edit"),
        icon: <FiEdit />,
        className: "text-blue-500 cursor-pointer text-xl mr-auto",
        isModal: true,
        setRow: setRowToAction as (value: GenericItem) => void,
        modal: rowToAction ? (
          <GenericAddEditPanel
            isOpen={isEditOpen}
            close={() => setIsEditOpen(false)}
            inputs={inputs}
            formKeys={formKeys}
            submitItem={handleSubmitItem}
            isEditMode
            topClassName="flex flex-col gap-2"
            itemToEdit={{ id: rowToAction._id, updates: rowToAction }}
          />
        ) : null,
        isModalOpen: isEditOpen,
        setIsModal: setIsEditOpen,
        isPath: false,
      },
    ];
  }, [
    t,
    rowToAction,
    isDeleteOpen,
    isEditOpen,
    deleteDynamicItem,
    handleSubmitItem,
    inputs,
    formKeys,
    actionsEnabled,
  ]);

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkStepTwo, setIsBulkStepTwo] = useState(false);
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState<Record<string, unknown>>({});

  // Filter out image fields from bulk edit options
  const bulkFieldOptions = useMemo(
    () =>
      displayFields
        .filter((f) => {
          const fieldType = (f.type || "").toLowerCase();
          return fieldType !== "image" && fieldType !== "img";
        })
        .map((f) => ({
          value: f.name,
          label: t(humanize(f.name)),
        })),
    [displayFields, t]
  );

  const bulkFormKeys = useMemo(() => {
    if (isBulkStepTwo) {
      // Step 2: only the selected fields
      return displayFields
        .filter((f) => bulkSelectedKeys.includes(f.name))
        .map((f) => {
          const m = fieldToInput(f);
          return { key: f.name, type: m.formKeyType };
        });
    } else {
      // Step 1: only the selector
      return [{ key: "bulkSelectedKeys", type: FormKeyTypeEnum.STRING }];
    }
  }, [displayFields, bulkSelectedKeys, isBulkStepTwo]);

  // Generate bulk edit inputs
  const bulkEditInputs = useMemo(() => {
    const selectInput = {
      type: InputTypes.SELECT,
      formKey: "bulkSelectedKeys",
      label: t("Edit Option Selection"),
      options: bulkFieldOptions,
      placeholder: t("Select fields to edit"),
      isMultiple: true,
      required: true,
      isDisabled: isBulkStepTwo,
    };

    const chosen = new Set(bulkSelectedKeys);
    const valueInputs = displayFields
      .filter((f) => chosen.has(f.name))
      .map((f) => {
        const m = fieldToInput(f);
        const label = t(humanize(f.name));
        return {
          type: m.inputType,
          formKey: f.name,
          label,
          placeholder: label,
          required: false,
          isDisabled: !isBulkStepTwo,
        };
      });

    return [selectInput, ...valueInputs];
  }, [t, bulkFieldOptions, isBulkStepTwo, displayFields, bulkSelectedKeys]);

  // Memoize handlers to prevent recreating selection actions
  const handleBulkEditSubmit = useCallback(() => {
    // Only submit when in step 2
    if (!isBulkStepTwo) return;

    const chosen = new Set(bulkSelectedKeys);
    const updates: Partial<GenericItem> = {};
    for (const k of Object.keys(bulkForm)) {
      if (chosen.has(k)) updates[k] = bulkForm[k];
    }
    const items = (selectedRows as GenericItem[]).map((r) => ({
      _id: r._id,
      updates,
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
      // We're in step 2, go back to step 1
      setIsBulkStepTwo(false);
    } else {
      // We're in step 1, move forward to step 2
      const selectedKeys = Array.isArray(bulkForm.bulkSelectedKeys)
        ? (bulkForm.bulkSelectedKeys as string[])
        : [];
      if (selectedKeys.length > 0) {
        setBulkSelectedKeys(selectedKeys);
        setIsBulkStepTwo(true);
      }
    }
  }, [isBulkStepTwo, bulkForm]);

  const handleBulkDeleteConfirm = useCallback(() => {
    deleteMultipleDynamicItem(
      selectedRows.map((r) => ({ _id: (r as GenericItem)._id }))
    );
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
      {
        name: t("Delete Selected"),
        isButton: true,
        buttonClassName:
          "px-2 ml-auto bg-red-500 hover:text-red-500 hover:border-red-500 sm:px-3 py-1 h-fit w-fit  text-white  hover:bg-white  transition-transform  border  rounded-md cursor-pointer",
        isModal: true,
        className: "cursor-pointer",
        isDisabled: !actionsEnabled || !selectedRows?.length,
        modal:
          selectedRows?.length > 0 ? (
            <ConfirmationDialog
              isOpen={isBulkDeleteOpen}
              close={() => setIsBulkDeleteOpen(false)}
              confirm={handleBulkDeleteConfirm}
              title={t("Delete Selected")}
              text={t("Are you sure you want to delete the selected items?")}
            />
          ) : null,
        isModalOpen: isBulkDeleteOpen,
        setIsModal: setIsBulkDeleteOpen,
        isPath: false,
      },
      {
        name: t("Edit Selected"),
        isButton: true,
        buttonClassName:
          "px-2 ml-auto bg-blue-500 hover:text-blue-500 hover:border-blue-500 sm:px-3 py-1 h-fit w-fit text-white hover:bg-white transition-transform border rounded-md cursor-pointer",
        isModal: true,
        className: "cursor-pointer",
        modal: isBulkEditOpen ? (
          <GenericAddEditPanel
            isOpen={isBulkEditOpen}
            close={handleBulkEditClose}
            inputs={bulkEditInputs}
            formKeys={bulkFormKeys}
            setForm={handleBulkFormChange}
            submitItem={() => {}}
            isEditMode={false}
            topClassName="flex flex-col gap-2"
            generalClassName="overflow-visible"
            buttonName={t("Edit")}
            isSubmitButtonActive={isBulkStepTwo}
            submitFunction={handleBulkEditSubmit}
            additionalButtons={[
              {
                label: isBulkStepTwo ? t("Back") : t("Forward"),
                onClick: handleBulkEditBackOrForward,
              },
            ]}
          />
        ) : null,
        isModalOpen: isBulkEditOpen,
        setIsModal: setIsBulkEditOpen,
        isPath: false,
        isDisabled: !actionsEnabled || !selectedRows?.length,
      },
    ],
    [
      t,
      actionsEnabled,
      selectedRows,
      isBulkDeleteOpen,
      handleBulkDeleteConfirm,
      isBulkEditOpen,
      handleBulkEditClose,
      handleBulkFormChange,
      bulkEditInputs,
      bulkFormKeys,
      isBulkStepTwo,
      handleBulkEditSubmit,
      handleBulkEditBackOrForward,
    ]
  );

  return (
    <div className="w-[95%] mx-auto">
      <GenericTable
        rowKeys={rowKeys}
        actions={actions}
        columns={columns}
        rows={rows}
        title={t(humanize(schemaName))}
        addButton={addButton}
        isCollapsible={false}
        isActionsActive={actionsEnabled}
        isSearch={false}
        outsideSortProps={outsideSort}
        {...(pagination && { pagination })}
        outsideSearchProps={outsideSearchProps}
        selectionActions={selectionActions}
        isExcel={!hasImageField}
        onExcelUpload={!hasImageField ? createMultipleDynamicItem : undefined}
      />
    </div>
  );
}
