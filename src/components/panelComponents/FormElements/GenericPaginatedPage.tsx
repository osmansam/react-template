// pages/GenericPaginatedPage.tsx
import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckSwitch } from "../../../common/CheckSwitch";
import { ConfirmationDialog } from "../../../common/ConfirmationDialog";
import { Header } from "../../../components/header/Header";
import { LinkCell } from "../../../components/LinkCell";
import { useGeneralContext } from "../../../context/General.context";
import { useUserContext } from "../../../context/User.context";
import { useSelectionData } from "../../../hooks/useSelectionData";
import { FormElementsState } from "../../../types";
import {
  DataBinding,
  TableActionConfig,
  TableActionFormFieldConfig,
  TableComponentConfig,
} from "../../../types/page";
import { UpdatePayload, get } from "../../../utils/api";
import {
  ContainerModel,
  Field,
  Types,
  useGetContainers,
} from "../../../utils/api/container";
import {
  TableSourceBinding,
  useDynamicCrud,
  useExportDynamicItems,
  useGetTableSourceItems,
} from "../../../utils/dynamic";
import {
  RawContainer,
  fieldToInput,
  getFieldLabel,
  getMatchingRowClassNames,
  humanize,
  isDisplayablePrimitive,
  normalizeContainer,
  normalizeField,
  tailwindBgToStyle,
} from "../../../utils/genericPageHelpers";
import { getIconByName } from "../../../utils/menuIcons";
import {
  getTableCellClassName,
  getTableDisplayName,
  getTableLinkConfig,
} from "../../../utils/tableConfig";
import {
  isFieldRequired,
  parseValidationRules,
} from "../../../utils/validationHelper";
import SwitchButton from "../common/SwitchButton";
import ExportModal from "../Modals/ExportModal";
import { FormKeyTypeEnum, GenericInputType, InputTypes } from "../shared/types";
import GenericTable from "../Tables/GenericTable";
import GenericAddEditPanel from "./GenericAddEditPanel";

type GenericItem = Record<string, unknown> & { _id: string };

const getActionId = (action: TableActionConfig, index: number) =>
  action.id || action.key || `${action.kind}-${index}`;

type ActionSelectDataMap = Map<string, GenericItem[]>;

const actionQs = (params: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(([key, value]) => [key, String(value)]),
  ).toString();

const useActionFormSelectionData = (
  actions: TableActionConfig[] = [],
): ActionSelectDataMap => {
  const schemaSelectFields = actions.flatMap((action, actionIndex) =>
    (action.formFields || [])
      .filter(
        (field) =>
          field.type === "select" &&
          field.optionsSource === "schema" &&
          field.sourceSchemaName,
      )
      .map((field) => ({
        actionId: getActionId(action, actionIndex),
        field,
      })),
  );

  const queryResults = useQueries({
    queries: schemaSelectFields.map(({ field }) => ({
      queryKey: ["dynamic", field.sourceSchemaName, "action-options"],
      queryFn: () =>
        get<GenericItem[]>({
          path: `/dynamic?${actionQs({ schemaName: field.sourceSchemaName })}`,
        }),
      enabled: Boolean(field.sourceSchemaName),
      staleTime: Infinity,
    })),
  });

  return schemaSelectFields.reduce<ActionSelectDataMap>((map, item, index) => {
    const rawData = queryResults[index]?.data;
    const items = Array.isArray(rawData)
      ? rawData
      : (rawData as { data?: GenericItem[]; items?: GenericItem[] } | undefined)
          ?.data ||
        (rawData as { data?: GenericItem[]; items?: GenericItem[] } | undefined)
          ?.items ||
        [];
    map.set(`${item.actionId}:${item.field.formKey}`, items);
    return map;
  }, new Map());
};

const parseActionConstantValues = (
  action: TableActionConfig,
): Record<string, unknown> => {
  if (action.constantValues) return action.constantValues;
  if (!action.constantValuesJson?.trim()) return {};

  try {
    const parsed = JSON.parse(action.constantValuesJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const actionInputType = (type: string | undefined): InputTypes => {
  const normalized = (type || "text").toLowerCase();
  if (normalized === "number") return InputTypes.NUMBER;
  if (normalized === "select") return InputTypes.SELECT;
  if (normalized === "textarea") return InputTypes.TEXTAREA;
  if (normalized === "checkbox" || normalized === "boolean")
    return InputTypes.CHECKBOX;
  if (normalized === "date") return InputTypes.DATE;
  if (normalized === "time") return InputTypes.TIME;
  if (normalized === "color") return InputTypes.COLOR;
  return InputTypes.TEXT;
};

const actionFormKeyType = (field: TableActionFormFieldConfig): string => {
  if (field.formKeyType) return field.formKeyType;
  if (field.isMultiple) return FormKeyTypeEnum.STRING_ARRAY;
  if (field.type === "number") return FormKeyTypeEnum.NUMBER;
  if (field.type === "checkbox") return FormKeyTypeEnum.BOOLEAN;
  return FormKeyTypeEnum.STRING;
};

const getStaticActionOptions = (field: TableActionFormFieldConfig) => {
  if (field.staticOptions?.length) return field.staticOptions;
  if (!field.staticOptionsJson?.trim()) return [];

  try {
    const parsed = JSON.parse(field.staticOptionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getActionFieldOptions = (
  actionId: string,
  field: TableActionFormFieldConfig,
  selectDataMap: ActionSelectDataMap,
  fallback?: GenericInputType,
) => {
  if (field.type !== "select") return [];
  if (field.optionsSource !== "schema") return getStaticActionOptions(field);

  const valueField = field.sourceValueField || "_id";
  const labelField = field.sourceLabelField || valueField;
  return (selectDataMap.get(`${actionId}:${field.formKey}`) || []).map(
    (item) => ({
      value: String(item[valueField] ?? item._id ?? ""),
      label: String(item[labelField] ?? item[valueField] ?? item._id ?? ""),
      sourceItem: item,
    }),
  );
};
const buildActionInputs = (
  action: TableActionConfig,
  fallbackInputs: GenericInputType[],
  actionId: string,
  selectDataMap: ActionSelectDataMap,
): GenericInputType[] => {
  if (action.formFields !== undefined) {
    return action.formFields.map((field) => {
      const fallback = fallbackInputs.find(
        (input) => input.formKey === field.formKey,
      );
      return {
        ...(fallback || {}),
        type: actionInputType(field.type),
        formKey: field.formKey,
        label: field.label || fallback?.label || field.formKey,
        placeholder:
          field.placeholder ||
          fallback?.placeholder ||
          field.label ||
          field.formKey,
        required: field.required ?? fallback?.required ?? false,
        requiredCondition: field.requiredCondition,
        disabledCondition: field.disabledCondition,
        isDisabled: field.isDisabled ?? fallback?.isDisabled,
        isMultiple: field.isMultiple ?? fallback?.isMultiple,
        isNumberButtonsActive:
          field.isNumberButtonsActive ?? fallback?.isNumberButtonsActive,
        options: getActionFieldOptions(
          actionId,
          field,
          selectDataMap,
          fallback,
        ),
        sourceFilterCondition: field.sourceFilterCondition,
        invalidateKeys: field.invalidateKeys?.map((key) => ({
          key,
          defaultValue: "",
        })),
        min: field.min ?? fallback?.min,
        max: field.max ?? fallback?.max,
        minLength: field.minLength ?? fallback?.minLength,
        maxLength: field.maxLength ?? fallback?.maxLength,
        pattern: field.pattern ?? fallback?.pattern,
        validationMessage:
          field.validationMessage ?? fallback?.validationMessage,
      };
    });
  }

  return fallbackInputs;
};

const buildActionFormKeys = (
  action: TableActionConfig,
  actionInputs: GenericInputType[],
) => {
  if (action.formFields !== undefined) {
    return action.formFields.map((field) => ({
      key: field.formKey,
      type: actionFormKeyType(field),
    }));
  }

  return actionInputs.map((input) => ({
    key: input.formKey,
    type:
      input.type === InputTypes.NUMBER
        ? FormKeyTypeEnum.NUMBER
        : FormKeyTypeEnum.STRING,
  }));
};

const getActionDefaultValues = (
  action: TableActionConfig,
): Record<string, unknown> =>
  (action.formFields || []).reduce<Record<string, unknown>>((values, field) => {
    if (field.formKey && field.defaultValue !== undefined) {
      values[field.formKey] = field.defaultValue;
    }
    return values;
  }, {});

const resolveActionTemplate = (
  template: string | undefined,
  row: GenericItem | null,
): string => {
  if (!template || !row) return template || "";
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const value = row[key.trim()];
    return value === null || value === undefined ? "" : String(value);
  });
};

type Props = {
  schemaName: string;
  includeFields?: string[];
  excludeFields?: string[];
  actionsEnabled?: boolean;
  isHeader?: boolean;
  constantFilter?: Record<string, unknown>; // Constant filter that won't be editable
  customTitle?: string; // Custom title for the table
  tableConfig?: TableComponentConfig;
  dataBinding?: DataBinding;
};

export default function GenericPaginatedPage({
  schemaName,
  includeFields,
  excludeFields,
  actionsEnabled = true,
  isHeader = false,
  constantFilter,
  customTitle,
  tableConfig,
  dataBinding,
}: Props) {
  const { t } = useTranslation();
  const { rowsPerPage } = useGeneralContext();
  const { user } = useUserContext();
  const rawContainers = useGetContainers();
  const [currentPage, setCurrentPage] = useState(1);
  // Local selection state for this table instance
  const [selectedRows, setSelectedRows] = useState<GenericItem[]>([]);
  const [isSelectionActive, setIsSelectionActive] = useState(false);

  const container: ContainerModel | undefined = useMemo(() => {
    if (!rawContainers) return undefined;
    const normalized = rawContainers.map((c: RawContainer) =>
      normalizeContainer(c),
    );
    return normalized.find(
      (c: ContainerModel) =>
        (c.schemaName || "").toLowerCase() === schemaName.toLowerCase(),
    );
  }, [rawContainers, schemaName]);

  // Check if container has image fields
  const hasImageField = useMemo(() => {
    if (!container?.fields) return false;
    return container.fields.some(
      (field) =>
        (field.type || "").toLowerCase() === Types.Image ||
        (field.type || "").toLowerCase() === "img",
    );
  }, [container]);

  const [filterPanelFormElements, setFilterPanelFormElements] =
    useState<FormElementsState>({
      search: "",
      sort: "",
      asc: 1,
    });

  const [showFilters, setShowFilters] = useState(false);
  const tableBinding = useMemo<TableSourceBinding>(
    () => ({
      kind:
        dataBinding?.kind === "pipeline" || dataBinding?.kind === "workflow"
          ? dataBinding.kind
          : "schema",
      schemaName: dataBinding?.schemaName || schemaName,
      pipelineName: dataBinding?.pipelineName,
      workflowName: dataBinding?.workflowName,
      fields: tableConfig?.columns
        ?.map((column) => column.field)
        .filter(Boolean),
      params: dataBinding?.params,
    }),
    [dataBinding, schemaName, tableConfig?.columns],
  );
  const schemaActionsEnabled = actionsEnabled && tableBinding.kind === "schema";

  // Moved useDynamicCrud below filter state so we can pass the query key
  const mergedFilters = useMemo(() => {
    return constantFilter
      ? ({ ...filterPanelFormElements, ...constantFilter } as FormElementsState)
      : filterPanelFormElements;
  }, [filterPanelFormElements, constantFilter]);

  // Create the paginated query key to pass to mutations
  const paginatedQueryKey = useMemo(
    () => [
      "dynamic",
      schemaName,
      "page",
      { page: currentPage, limit: rowsPerPage, filters: mergedFilters },
    ],
    [schemaName, currentPage, rowsPerPage, mergedFilters],
  );

  const {
    createDynamicItem,
    createMultipleDynamicItem,
    updateDynamicItem,
    executeWorkflow,
    deleteDynamicItem,
    deleteMultipleDynamicItem,
    updateMultipleDynamicItem,
  } = useDynamicCrud<GenericItem>(schemaName, hasImageField, paginatedQueryKey);

  const displayFields: Field[] = useMemo(() => {
    const containerFields = container?.fields || [];
    let fields = containerFields
      .map(normalizeField)
      .filter(isDisplayablePrimitive);

    if (tableConfig?.columns?.length) {
      fields = tableConfig.columns
        .map((column) => {
          const field = fields.find((item) => item.name === column.field);
          return (
            field || {
              name: column.field,
              type: "string",
              frontend: column.displayName
                ? { displayName: column.displayName }
                : undefined,
            }
          );
        })
        .filter((field): field is Field => Boolean(field?.name));
    }

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
        (uniq.add(f.name), true),
    );

    // Filter by authorizeRole if isAuthorized is true
    fields = fields.filter((f) => {
      // If not authorized, show it
      if (!f.isAuthorized) return true;

      // If authorized, user must exist and have a matching role
      if (!user?.role) return false;

      // Check if authorizeRole exists and includes user role
      if (!f.authorizeRole || f.authorizeRole.length === 0) return false;
      return f.authorizeRole.includes(user.role);
    });

    return fields;
  }, [container, includeFields, excludeFields, user, tableConfig]);

  // Fetch selection data for objectId/autoIncrementId fields with populationSettings
  const selectionDataMap = useSelectionData(container?.fields || []);

  const rowKeys = useMemo(() => {
    const constantFilterKeys = constantFilter
      ? Object.keys(constantFilter)
      : [];
    return displayFields
      .filter((f) => !constantFilterKeys.includes(f.name))
      .map((f) => {
        const fieldType = (f.type || "").toLowerCase();
        const originalType = f.type || "";
        const isStringArray =
          fieldType === Types.StringArray ||
          originalType === "stringArray" ||
          fieldType === "string[]" ||
          fieldType === "array<string>";
        const isIntArray =
          fieldType === Types.IntArray ||
          originalType === "intArray" ||
          fieldType === "int[]" ||
          fieldType === "array<int>";
        const isNumberArray =
          fieldType === Types.NumberArray ||
          originalType === "numberArray" ||
          fieldType === "number[]" ||
          fieldType === "array<number>";
        const isArray = isStringArray || isIntArray || isNumberArray;

        const rowKey: {
          key: string;
          isImage?: boolean;
          isDate?: boolean;
          isBoolean?: boolean;
          className?: string | ((row: GenericItem) => string);
          node?: (row: GenericItem) => React.ReactNode;
        } = {
          key: f.name,
          isImage: fieldType === Types.Image,
          isDate: fieldType === Types.Date,
          isBoolean: fieldType === Types.Boolean || fieldType === "bool",
        };

        const cellClassName = getTableCellClassName(tableConfig, f);
        const legacyCellClassName = f.frontend?.rowKeyClassName;
        const rowKeyClassName = cellClassName ?? legacyCellClassName;
        const linkConfig = getTableLinkConfig(tableConfig, f);

        // Compute className based on table column cellClassName conditions
        if (rowKeyClassName) {
          rowKey.className = (row: GenericItem) =>
            getMatchingRowClassNames(row, rowKeyClassName);
        }

        if (rowKey.isBoolean) {
          rowKey.node = (row: GenericItem) => (
            <CheckSwitch
              checked={!!row[f.name]}
              onChange={() => {
                updateDynamicItem(row._id, {
                  [f.name]: !row[f.name],
                });
              }}
            />
          );
        } else if (isArray) {
          // Handle array types - display as comma-separated values
          rowKey.node = (row: GenericItem) => {
            const value = row[f.name];
            const content = Array.isArray(value)
              ? value.join(", ")
              : String(value || "");
            return linkConfig?.linkTemplate ? (
              <LinkCell field={f} row={row} linkConfig={linkConfig} />
            ) : (
              <span>{content}</span>
            );
          };
        } else if (
          (fieldType === Types.ObjectId ||
            fieldType === Types.AutoIncrementId) &&
          f.populationSettings &&
          f.populationSettings.displayFields &&
          f.populationSettings.displayFields.length > 0
        ) {
          // Handle populated objectId/autoIncrementId fields
          rowKey.node = (row: GenericItem) => {
            const value = row[f.name];
            let content = "";
            if (value && typeof value === "object") {
              // Display the fields specified in displayFields
              const valueObj = value as Record<string, unknown>;
              const displayValues = f
                .populationSettings!.displayFields.map(
                  (fieldName) => valueObj[fieldName],
                )
                .filter(Boolean)
                .map(String);
              content = displayValues.join(" - ") || String(valueObj._id || "");
            } else {
              content = String(value || "");
            }
            return linkConfig?.linkTemplate ? (
              <LinkCell field={f} row={row} linkConfig={linkConfig} />
            ) : (
              <span>{content}</span>
            );
          };
        } else if (
          fieldType === Types.ObjectIdArray &&
          f.populationSettings &&
          f.populationSettings.displayFields &&
          f.populationSettings.displayFields.length > 0
        ) {
          // Handle populated objectIdArray fields
          rowKey.node = (row: GenericItem) => {
            const value = row[f.name];
            let content = "";
            if (Array.isArray(value) && value.length > 0) {
              // Map over array of populated objects
              const displayItems = value.map((item) => {
                if (item && typeof item === "object") {
                  const itemObj = item as Record<string, unknown>;
                  const displayValues = f
                    .populationSettings!.displayFields.map(
                      (fieldName) => itemObj[fieldName],
                    )
                    .filter(Boolean)
                    .map(String);
                  return displayValues.join(" - ") || String(itemObj._id || "");
                } else if (typeof item === "string") {
                  // Handle ID strings by looking up in selectionDataMap
                  const selectionOptions = selectionDataMap.get(f.name) || [];
                  const foundOption = selectionOptions.find(
                    (opt) => opt._id === item,
                  );
                  if (foundOption) {
                    return String(
                      foundOption[f.populationSettings!.inputSelectionField] ||
                        item,
                    );
                  }
                  return item;
                }
                return String(item || "");
              });
              content = displayItems.join(", ");
            } else {
              content = String(value || "");
            }
            return linkConfig?.linkTemplate ? (
              <LinkCell field={f} row={row} linkConfig={linkConfig} />
            ) : (
              <span>{content}</span>
            );
          };
        } else if (linkConfig?.linkTemplate) {
          // Handle all other field types with linkTemplate (e.g., regular strings, numbers)
          rowKey.node = (row: GenericItem) => (
            <LinkCell field={f} row={row} linkConfig={linkConfig} />
          );
        }

        return rowKey;
      });
  }, [
    displayFields,
    updateDynamicItem,
    selectionDataMap,
    constantFilter,
    tableConfig,
  ]);

  const columns = useMemo(() => {
    const constantFilterKeys = constantFilter
      ? Object.keys(constantFilter)
      : [];
    const baseCols = displayFields
      .filter((f) => !constantFilterKeys.includes(f.name))
      .map((f) => ({
        key: t(getTableDisplayName(tableConfig, f) || getFieldLabel(f)),
        isSortable: true,
        correspondingKey: f.name,
      }));
    return schemaActionsEnabled
      ? [...baseCols, { key: t("Actions"), isSortable: false }]
      : baseCols;
  }, [displayFields, t, schemaActionsEnabled, constantFilter, tableConfig]);

  const { inputs, formKeys, constantFilterKeys } = useMemo(() => {
    const constantFilterKeys = constantFilter
      ? Object.keys(constantFilter)
      : [];

    const ins = displayFields
      .map((f) => {
        // Skip fields with equation
        if (f.equation) return null;

        const m = fieldToInput(f);
        const label = t(getFieldLabel(f));
        const fieldType = (f.type || "").toLowerCase();

        // Parse validation rules from tag
        const validationRules = parseValidationRules(f.tag);
        const isRequired = isFieldRequired(f.tag);

        // Check if field has populationSettings (objectId/autoIncrementId/objectIdArray with selection data)
        if (
          (fieldType === Types.ObjectId ||
            fieldType === Types.AutoIncrementId ||
            fieldType === Types.ObjectIdArray) &&
          f.populationSettings &&
          f.objectSchemaName
        ) {
          const selectionData = selectionDataMap.get(f.name) || [];
          const displayLabel = f.populationSettings.displayLabel || label;

          return {
            type: InputTypes.SELECT,
            formKey: f.name,
            label: t(displayLabel),
            placeholder: t(displayLabel),
            required: isRequired,
            isMultiple: fieldType === Types.ObjectIdArray, // Enable multi-select for objectIdArray
            options: selectionData.map((item) => ({
              value: String(item._id || ""),
              label: String(
                item[f.populationSettings!.inputSelectionField] ||
                  item._id ||
                  "",
              ),
            })),
            invalidateKeys:
              f.frontend?.invalidateKeys?.map((key) => ({
                key: String(key),
                defaultValue: undefined,
              })) ?? [],
          };
        }

        // Check if field has enumList
        if (f.enumList && f.enumList.length > 0) {
          const originalType = f.type || "";

          // Check if it's an array type
          const isStringArray =
            fieldType === "stringarray" ||
            originalType === "stringArray" ||
            fieldType === "string[]" ||
            fieldType === "array<string>";
          const isIntArray =
            fieldType === "intarray" ||
            originalType === "intArray" ||
            fieldType === "int[]" ||
            fieldType === "array<int>";
          const isNumberArray =
            fieldType === "numberarray" ||
            originalType === "numberArray" ||
            fieldType === "number[]" ||
            fieldType === "array<number>";

          const isArrayType = isStringArray || isIntArray || isNumberArray;

          return {
            type: InputTypes.SELECT,
            formKey: f.name,
            label,
            placeholder: label,
            required: isRequired,
            isMultiple: isArrayType,
            options: f.enumList.map((item) => ({
              value: item,
              label: String(item),
            })),
            invalidateKeys:
              f.frontend?.invalidateKeys?.map((key) => ({
                key: String(key),
                defaultValue: undefined,
              })) ?? [],
          };
        }

        return {
          type: m.inputType,
          formKey: f.name,
          label,
          placeholder: label,
          required: isRequired,
          minLength: validationRules.minlength,
          maxLength: validationRules.maxlength,
          min: validationRules.min,
          max: validationRules.max,
          pattern: validationRules.pattern,
          invalidateKeys:
            f.frontend?.invalidateKeys?.map((key) => ({
              key: String(key),
              defaultValue: undefined,
            })) ?? [],
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    const fks = displayFields
      .map((f) => {
        if (f.equation) return null;
        const m = fieldToInput(f);
        return { key: f.name, type: m.formKeyType };
      })
      .filter((k): k is NonNullable<typeof k> => k !== null);

    return { inputs: ins, formKeys: fks, constantFilterKeys };
  }, [displayFields, t, selectionDataMap, constantFilter]);

  // mergedFilters is now defined earlier to pass to useDynamicCrud
  const itemsPayload = useGetTableSourceItems(
    currentPage,
    rowsPerPage,
    tableBinding,
    mergedFilters,
  );

  const rows = useMemo(() => itemsPayload?.items || [], [itemsPayload?.items]);

  const outsideSort = useMemo(
    () => ({ filterPanelFormElements, setFilterPanelFormElements }),
    [filterPanelFormElements],
  );

  const pagination = useMemo(
    () =>
      itemsPayload
        ? {
            totalPages: itemsPayload.totalPages,
            totalRows: itemsPayload.totalItems,
          }
        : null,
    [itemsPayload],
  );

  const outsideSearchProps = useMemo(
    () => ({ t, filterPanelFormElements, setFilterPanelFormElements }),
    [t, filterPanelFormElements],
  );

  const rowStyleFunction = useCallback(
    (row: GenericItem): React.CSSProperties => {
      const styles: React.CSSProperties = {};
      const rowClassName = tableConfig?.rows?.className;

      if (rowClassName) {
        Object.assign(
          styles,
          tailwindBgToStyle(getMatchingRowClassNames(row, rowClassName)),
        );
        return styles;
      }

      // Container level configs
      if (container?.frontend?.rowClassName) {
        Object.assign(
          styles,
          tailwindBgToStyle(
            getMatchingRowClassNames(row, container.frontend.rowClassName),
          ),
        );
      }

      // Field level configs
      container?.fields.forEach((field) => {
        if (field.frontend?.rowClassName) {
          Object.assign(
            styles,
            tailwindBgToStyle(
              getMatchingRowClassNames(row, field.frontend.rowClassName),
            ),
          );
        }
      });

      return styles;
    },
    [container, tableConfig],
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
  const [isCustomActionOpen, setIsCustomActionOpen] = useState(false);
  const [activeCustomAction, setActiveCustomAction] =
    useState<TableActionConfig | null>(null);
  const [rowToAction, setRowToAction] = useState<GenericItem | null>(null);

  const handleSubmitItem = useCallback(
    (item: GenericItem | UpdatePayload<GenericItem>) => {
      if ("id" in item && "updates" in item) {
        // Update operation - EXCLUDE constantFilter fields to prevent ObjectId to string conversion
        const updates = item.updates as Record<string, unknown>;
        const filteredUpdates = constantFilter
          ? Object.fromEntries(
              Object.entries(updates).filter(
                ([key]) => !constantFilterKeys.includes(key),
              ),
            )
          : updates;
        updateDynamicItem(
          item.id as string | number,
          filteredUpdates as Partial<GenericItem>,
        );
      } else {
        // Create operation - merge constantFilter into new item
        const mergedItem = constantFilter
          ? { ...(item as Record<string, unknown>), ...constantFilter }
          : item;
        createDynamicItem(mergedItem as GenericItem);
      }
    },
    [updateDynamicItem, createDynamicItem, constantFilter, constantFilterKeys],
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
          itemToEdit={
            constantFilter
              ? {
                  id: "",
                  updates: { ...constantFilter, _id: "" } as GenericItem,
                }
              : undefined
          }
        />
      ),
      isModalOpen: isAddOpen,
      setIsModal: setIsAddOpen,
      isPath: false,
      icon: null,
      className: "bg-blue-500 hover:text-blue-500 hover:border-blue-500",
    }),
    [t, isAddOpen, inputs, formKeys, handleSubmitItem, constantFilter],
  );

  const actionSelectionDataMap = useActionFormSelectionData(
    tableConfig?.actions || [],
  );

  const actions = useMemo(() => {
    if (!schemaActionsEnabled) return [];

    const configuredActions = (tableConfig?.actions || [])
      .filter((action) => action.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const hasConfiguredActions = Array.isArray(tableConfig?.actions);

    const buildDeleteAction = (deleteActionConfig?: TableActionConfig) => {
      const DeleteIcon = getIconByName(
        deleteActionConfig?.icon || "HiOutlineTrash",
      );
      return {
        name: deleteActionConfig?.label || t("Delete"),
        icon: <DeleteIcon />,
        setRow: setRowToAction as (value: GenericItem) => void,
        modal: rowToAction ? (
          <ConfirmationDialog
            isOpen={isDeleteOpen}
            close={() => setIsDeleteOpen(false)}
            confirm={() => {
              deleteDynamicItem(rowToAction._id);
              setIsDeleteOpen(false);
            }}
            title={deleteActionConfig?.confirmTitle || t("Delete")}
            text={deleteActionConfig?.confirmText || t("GeneralDeleteMessage")}
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
      return {
        name: editActionConfig?.label || t("Edit"),
        icon: <EditIcon />,
        className:
          editActionConfig?.className ||
          "text-blue-500 cursor-pointer text-xl ",
        isModal: true,
        setRow: setRowToAction as (value: GenericItem) => void,
        modal: rowToAction
          ? (() => {
              const normalizedUpdates = { ...rowToAction };
              displayFields.forEach((f) => {
                const fieldType = (f.type || "").toLowerCase();
                if (
                  (fieldType === Types.ObjectId ||
                    fieldType === Types.AutoIncrementId) &&
                  f.populationSettings &&
                  normalizedUpdates[f.name] &&
                  typeof normalizedUpdates[f.name] === "object"
                ) {
                  const populatedValue = normalizedUpdates[f.name] as Record<
                    string,
                    unknown
                  >;
                  normalizedUpdates[f.name] = populatedValue._id;
                } else if (
                  fieldType === Types.ObjectIdArray &&
                  f.populationSettings &&
                  normalizedUpdates[f.name] &&
                  Array.isArray(normalizedUpdates[f.name])
                ) {
                  const populatedArray = normalizedUpdates[f.name] as Array<
                    Record<string, unknown>
                  >;
                  normalizedUpdates[f.name] = populatedArray.map((item) =>
                    item && typeof item === "object" ? item._id : item,
                  );
                }
              });

              return (
                <GenericAddEditPanel
                  isOpen={isEditOpen}
                  close={() => setIsEditOpen(false)}
                  inputs={editInputs}
                  formKeys={editFormKeys}
                  submitItem={handleSubmitItem}
                  isEditMode
                  buttonName={editActionConfig?.buttonName || t("Edit")}
                  topClassName="flex flex-col gap-2"
                  itemToEdit={{
                    id: rowToAction._id,
                    updates: {
                      ...normalizedUpdates,
                      ...editDefaultValues,
                    },
                  }}
                />
              );
            })()
          : null,
        isModalOpen: isEditOpen,
        setIsModal: setIsEditOpen,
        isPath: false,
      };
    };

    const buildCustomAction = (action: TableActionConfig, index: number) => {
      const actionId = getActionId(action, index);
      const ActionIcon = getIconByName(action.icon || "FiCheck");
      const constantValues = parseActionConstantValues(action);
      const defaultValues = getActionDefaultValues(action);
      const actionInputs = buildActionInputs(
        action,
        inputs,
        actionId,
        actionSelectionDataMap,
      );
      const actionFormKeys = buildActionFormKeys(action, actionInputs);
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
                record: { ...row, ...constantValues },
                oldRecord: row,
              });
              return;
            }
            updateDynamicItem(row._id, constantValues as Partial<GenericItem>);
          }
        },
        modal:
          isFormAction && rowToAction && isActiveAction ? (
            <GenericAddEditPanel
              isOpen={isCustomActionOpen}
              close={() => setIsCustomActionOpen(false)}
              inputs={actionInputs}
              formKeys={actionFormKeys}
              submitItem={(item) => {
                if ("id" in item && "updates" in item) {
                  const record = {
                    ...rowToAction,
                    ...(item.updates as Record<string, unknown>),
                    ...constantValues,
                  };
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
                setIsCustomActionOpen(false);
              }}
              isEditMode
              buttonName={action.buttonName || action.label || t("Update")}
              topClassName="flex flex-col gap-2"
              itemToEdit={{
                id: rowToAction._id,
                updates: {
                  ...rowToAction,
                  ...defaultValues,
                  ...constantValues,
                },
              }}
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
      .map((action, index) => {
        if (action.kind === "delete") return buildDeleteAction(action);
        if (action.kind === "edit") return buildEditAction(action);
        return buildCustomAction(action, index);
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
    deleteDynamicItem,
    updateDynamicItem,
    executeWorkflow,
    handleSubmitItem,
    formKeys,
    schemaActionsEnabled,
    displayFields,
    inputs,
    tableConfig?.actions,
    actionSelectionDataMap,
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
          if (fieldType === Types.Image || fieldType === Types.Image)
            return false;
          return !f.equation;
        })
        .map((f) => ({
          value: f.name,
          label: t(getFieldLabel(f)),
        })),
    [displayFields, t],
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
        const label = t(getFieldLabel(f));
        const fieldType = (f.type || "").toLowerCase();

        // Check if field has populationSettings (objectId/autoIncrementId/objectIdArray with selection data)
        if (
          (fieldType === Types.ObjectId ||
            fieldType === Types.AutoIncrementId ||
            fieldType === Types.ObjectIdArray) &&
          f.populationSettings &&
          f.objectSchemaName
        ) {
          const selectionData = selectionDataMap.get(f.name) || [];
          const displayLabel = f.populationSettings.displayLabel || label;

          return {
            type: InputTypes.SELECT,
            formKey: f.name,
            label: t(displayLabel),
            placeholder: t(displayLabel),
            required: false,
            isDisabled: !isBulkStepTwo,
            isMultiple: fieldType === Types.ObjectIdArray, // Enable multi-select for objectIdArray
            options: selectionData.map((item) => ({
              value: String(item._id || ""),
              label: String(
                item[f.populationSettings!.inputSelectionField] ||
                  item._id ||
                  "",
              ),
            })),
          };
        }

        // Check if field has enumList
        if (f.enumList && f.enumList.length > 0) {
          const originalType = f.type || "";

          // Check if it's an array type
          const isStringArray =
            fieldType === Types.StringArray ||
            originalType === "stringArray" ||
            fieldType === "string[]" ||
            fieldType === "array<string>";
          const isIntArray =
            fieldType === Types.IntArray ||
            originalType === "intArray" ||
            fieldType === "int[]" ||
            fieldType === "array<int>";
          const isNumberArray =
            fieldType === Types.NumberArray ||
            originalType === "numberArray" ||
            fieldType === "number[]" ||
            fieldType === "array<number>";

          const isArrayType = isStringArray || isIntArray || isNumberArray;

          return {
            type: InputTypes.SELECT,
            formKey: f.name,
            label,
            placeholder: label,
            required: false,
            isDisabled: !isBulkStepTwo,
            isMultiple: isArrayType,
            options: f.enumList.map((item) => ({
              value: item,
              label: String(item),
            })),
          };
        }

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
  }, [
    t,
    bulkFieldOptions,
    isBulkStepTwo,
    displayFields,
    bulkSelectedKeys,
    selectionDataMap,
  ]);

  // Memoize handlers to prevent recreating selection actions
  const handleBulkEditSubmit = useCallback(() => {
    // Only submit when in step 2
    if (!isBulkStepTwo) return;

    const chosen = new Set(bulkSelectedKeys);
    const updates: Partial<GenericItem> = {};

    // Convert values to proper types before submission
    for (const k of Object.keys(bulkForm)) {
      if (chosen.has(k)) {
        const formKey = bulkFormKeys.find((fk) => fk.key === k);
        let value = bulkForm[k];

        // Convert boolean values - ensure false default
        if (formKey?.type === FormKeyTypeEnum.BOOLEAN) {
          if (value === undefined || value === null || value === "") {
            value = false;
          } else if (typeof value === "string") {
            value = value === "true";
          } else if (typeof value !== "boolean") {
            value = false;
          }
        }

        // Convert number values from string to actual number
        if (formKey?.type === FormKeyTypeEnum.NUMBER) {
          if (typeof value === "string" && value !== "") {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              value = numValue;
            }
          }
        }

        // Convert string array - split comma-separated values into array
        if (formKey?.type === FormKeyTypeEnum.STRING_ARRAY) {
          if (typeof value === "string" && value !== "") {
            value = value
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item !== "");
          } else if (!Array.isArray(value)) {
            value = [];
          }
        }

        // Convert int array - split comma-separated values and parse to integers
        if (formKey?.type === FormKeyTypeEnum.INT_ARRAY) {
          if (typeof value === "string" && value !== "") {
            value = value
              .split(",")
              .map((item) => parseInt(item.trim(), 10))
              .filter((item) => !isNaN(item));
          } else if (Array.isArray(value)) {
            value = value.map((item) =>
              typeof item === "string" ? parseInt(item, 10) : item,
            );
          } else {
            value = [];
          }
        }

        // Convert number array - split comma-separated values and parse to numbers
        if (formKey?.type === FormKeyTypeEnum.NUMBER_ARRAY) {
          if (typeof value === "string" && value !== "") {
            value = value
              .split(",")
              .map((item) => parseFloat(item.trim()))
              .filter((item) => !isNaN(item));
          } else if (Array.isArray(value)) {
            value = value.map((item) =>
              typeof item === "string" ? parseFloat(item) : item,
            );
          } else {
            value = [];
          }
        }

        updates[k] = value;
      }
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
    bulkFormKeys,
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

        // Initialize boolean fields to false for the selected fields
        const initialBulkValues: Record<string, unknown> = {};
        displayFields
          .filter((f) => selectedKeys.includes(f.name))
          .forEach((f) => {
            const m = fieldToInput(f);
            if (m.formKeyType === FormKeyTypeEnum.BOOLEAN) {
              initialBulkValues[f.name] = false;
            }
          });

        setBulkForm((prev) => ({ ...prev, ...initialBulkValues }));
        setIsBulkStepTwo(true);
      }
    }
  }, [isBulkStepTwo, bulkForm, displayFields]);

  const handleBulkDeleteConfirm = useCallback(() => {
    deleteMultipleDynamicItem(
      selectedRows.map((r) => ({ _id: (r as GenericItem)._id })),
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

  const filterPanelInputs = useMemo(() => {
    const constantFilterKeys = constantFilter
      ? Object.keys(constantFilter)
      : [];

    return displayFields
      .filter((f) => {
        const fieldType = (f.type || "").toLowerCase();
        // Exclude id, image fields, and constantFilter fields from filters
        return (
          !["_id", "id"].includes(f.name) &&
          fieldType !== Types.Image &&
          fieldType !== "img" &&
          !constantFilterKeys.includes(f.name)
        );
      })
      .map((f) => {
        const m = fieldToInput(f);
        const label = t(getFieldLabel(f));
        const fieldType = (f.type || "").toLowerCase();

        // Check if field is objectId/autoIncrementId/objectIdArray with populationSettings
        if (
          (fieldType === Types.ObjectId ||
            fieldType === Types.AutoIncrementId ||
            fieldType === Types.ObjectIdArray) &&
          f.populationSettings &&
          f.populationSettings.inputSelectionField &&
          selectionDataMap.has(f.name)
        ) {
          const selectionOptions = selectionDataMap.get(f.name) || [];
          return {
            type: InputTypes.SELECT,
            formKey: f.name,
            label,
            placeholder: label,
            required: false,
            isMultiple: fieldType === Types.ObjectIdArray, // Enable multi-select for objectIdArray
            options: selectionOptions.map((item) => ({
              value: String(item._id || ""),
              label: String(
                item[f.populationSettings!.inputSelectionField] ||
                  item._id ||
                  "",
              ),
            })),
          };
        }

        // Check if field has enumList
        if (f.enumList && f.enumList.length > 0) {
          const fieldType = (f.type || "").toLowerCase();
          const originalType = f.type || "";

          // Check if it's an array type
          const isStringArray =
            fieldType === Types.StringArray ||
            originalType === "stringArray" ||
            fieldType === "string[]" ||
            fieldType === "array<string>";
          const isIntArray =
            fieldType === Types.IntArray ||
            originalType === "intArray" ||
            fieldType === "int[]" ||
            fieldType === "array<int>";
          const isNumberArray =
            fieldType === Types.NumberArray ||
            originalType === "numberArray" ||
            fieldType === "number[]" ||
            fieldType === "array<number>";

          const isArrayType = isStringArray || isIntArray || isNumberArray;

          return {
            type: InputTypes.SELECT,
            formKey: f.name,
            label,
            placeholder: label,
            required: false,
            isMultiple: isArrayType,
            options: f.enumList.map((item) => ({
              value: item,
              label: String(item),
            })),
          };
        }

        // Convert boolean fields to SELECT input for filter panel
        if (m.inputType === InputTypes.CHECKBOX) {
          return {
            type: InputTypes.SELECT,
            formKey: f.name,
            label,
            placeholder: label,
            required: false,
            options: [
              { value: "true", label: t("True") },
              { value: "false", label: t("False") },
            ],
          };
        }

        return {
          type: m.inputType,
          formKey: f.name,
          label,
          placeholder: label,
          required: false,
        };
      });
  }, [displayFields, t, selectionDataMap, constantFilter]);

  const filters = useMemo(
    () => [
      {
        label: t("Show Filters"),
        isUpperSide: true,
        node: (
          <SwitchButton
            checked={showFilters}
            onChange={() => setShowFilters(!showFilters)}
          />
        ),
      },
    ],
    [t, showFilters],
  );

  const filterPanel = useMemo(
    () => ({
      isFilterPanelActive: showFilters,
      inputs: filterPanelInputs,
      formElements: filterPanelFormElements,
      setFormElements: setFilterPanelFormElements,
      closeFilters: () => setShowFilters(false),
      isApplyButtonActive: true,
    }),
    [showFilters, filterPanelInputs, filterPanelFormElements],
  );

  const selectionActions = useMemo(
    () => [
      {
        name: t("Delete Selected"),
        isButton: true,
        buttonClassName:
          "px-2 bg-red-500 hover:text-red-500 hover:border-red-500 sm:px-3 py-1 h-fit w-fit  text-white  hover:bg-white  transition-transform  border  rounded-md cursor-pointer",
        isModal: true,
        className: "cursor-pointer",
        isDisabled: !schemaActionsEnabled || !selectedRows?.length,
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
          "px-2  bg-blue-500 hover:text-blue-500 hover:border-blue-500 sm:px-3 py-1 h-fit w-fit text-white hover:bg-white transition-transform border rounded-md cursor-pointer",
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
        isDisabled: !schemaActionsEnabled || !selectedRows?.length,
      },
    ],
    [
      t,
      schemaActionsEnabled,
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
    ],
  );

  const { exportDynamicItems } = useExportDynamicItems();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExport = (
    selectedFields: string[],
    includeSearch: boolean,
    includeFilters: boolean,
    exportScope: "all" | "currentPage" | "numberOfPages",
    pageCount?: number,
  ) => {
    let calculatedLimit = rowsPerPage;
    let calculatedPage = currentPage;

    if (exportScope === "all") {
      // For "all", we don't send limit/page, backend should handle it
      calculatedLimit = 0; // 0 means all
      calculatedPage = 1;
    } else if (exportScope === "numberOfPages" && pageCount) {
      // Calculate limit as rowsPerPage * pageCount
      calculatedLimit = rowsPerPage * pageCount;
      calculatedPage = 1; // Always start from page 1
    } else if (exportScope === "currentPage") {
      // Keep current page and limit
      calculatedLimit = rowsPerPage;
      calculatedPage = currentPage;
    }

    const payload = {
      schemaName,
      fields: selectedFields,
      filters: includeFilters ? filterPanelFormElements : {},
      search: includeSearch ? String(filterPanelFormElements.search || "") : "",
      limit: calculatedLimit,
      page: calculatedPage,
    };
    exportDynamicItems(payload);
  };

  return (
    <>
      {isHeader && <Header />}
      <div className="w-[95%] mx-auto">
        <GenericTable
          rowKeys={rowKeys}
          actions={actions}
          columns={columns}
          rows={rows}
          rowStyleFunction={rowStyleFunction}
          title={customTitle || t(humanize(schemaName))}
          addButton={addButton}
          isCollapsible={false}
          isActionsActive={schemaActionsEnabled}
          isSearch={false}
          outsideSortProps={outsideSort}
          {...(pagination && { pagination })}
          outsideSearchProps={outsideSearchProps}
          selectionActions={selectionActions}
          isExcel={true}
          onExcelUpload={
            schemaActionsEnabled && !hasImageField
              ? createMultipleDynamicItem
              : undefined
          }
          onExcelExport={
            schemaActionsEnabled ? () => setIsExportModalOpen(true) : undefined
          }
          filters={filters}
          filterPanel={filterPanel}
          containerFields={container?.fields}
          localSelectedRows={selectedRows}
          localSetSelectedRows={setSelectedRows}
          localIsSelectionActive={isSelectionActive}
          localSetIsSelectionActive={setIsSelectionActive}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <ExportModal
          isOpen={isExportModalOpen}
          close={() => setIsExportModalOpen(false)}
          fields={displayFields}
          onExport={handleExport}
          schemaName={humanize(schemaName)}
          currentPage={currentPage}
          totalPages={pagination?.totalPages || 1}
        />
      </div>
    </>
  );
}
