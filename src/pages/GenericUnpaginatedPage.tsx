import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit } from "react-icons/fi";
import { HiOutlineTrash } from "react-icons/hi2";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import GenericAddEditPanel from "../components/panelComponents/FormElements/GenericAddEditPanel";
import {
  FormKeyTypeEnum,
  InputTypes,
} from "../components/panelComponents/shared/types";
import GenericTable from "../components/panelComponents/Tables/GenericTable";
import { UpdatePayload } from "../utils/api";
import {
  ContainerModel,
  Field,
  useGetContainers,
} from "../utils/api/container";
import { useDynamicCrud, useGetDynamicItems } from "../utils/dynamic";

type GenericItem = Record<string, unknown> & { _id: string };

type Props = {
  schemaName: string;
  includeFields?: string[];
  excludeFields?: string[];
  actionsEnabled?: boolean;
};

// Raw field type from API with possible case variations
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

// Raw container type from API with possible case variations
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
  routes: (c.routes ?? c.Routes) as ContainerModel["routes"],
  redis: (c.redis ?? c.Redis) as ContainerModel["redis"],
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

export default function GenericUnpaginatedPage({
  schemaName,
  includeFields,
  excludeFields,
  actionsEnabled = true,
}: Props) {
  const { t } = useTranslation();
  const { createDynamicItem, updateDynamicItem, deleteDynamicItem } =
    useDynamicCrud<GenericItem>(schemaName);
  const items = useGetDynamicItems<GenericItem>(schemaName);
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
    fields = fields.filter((f) => f.name !== "_id" && f.name !== "id");
    return fields;
  }, [container, includeFields, excludeFields]);

  const rowKeys = useMemo(
    () => displayFields.map((f) => ({ key: f.name })),
    [displayFields]
  );

  const columns = useMemo(() => {
    const baseCols = displayFields.map((f) => ({
      key: t(humanize(f.name)),
      isSortable: true,
    }));
    if (actionsEnabled) {
      return [...baseCols, { key: t("Actions"), isSortable: false }];
    }
    return baseCols;
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

  const rows = useMemo(() => items || [], [items]);

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
      />
    </div>
  );
}
