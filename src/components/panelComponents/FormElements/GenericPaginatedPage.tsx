// pages/GenericPaginatedPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit } from "react-icons/fi";
import { HiOutlineTrash } from "react-icons/hi2";
import { CheckSwitch } from "../../../common/CheckSwitch";
import { ConfirmationDialog } from "../../../common/ConfirmationDialog";
import { Header } from "../../../components/header/Header";
import { useGeneralContext } from "../../../context/General.context";
import { useSelectionData } from "../../../hooks/useSelectionData";
import { FormElementsState } from "../../../types";
import { UpdatePayload } from "../../../utils/api";
import {
  ContainerModel,
  Field,
  Types,
  useGetContainers,
} from "../../../utils/api/container";
import { useDynamicCrud, useExportDynamicItems, useGetPaginatedItems } from "../../../utils/dynamic";
import SwitchButton from "../common/SwitchButton";
import ExportModal from "../Modals/ExportModal";
import { FormKeyTypeEnum, InputTypes } from "../shared/types";
import GenericTable from "../Tables/GenericTable";
import GenericAddEditPanel from "./GenericAddEditPanel";

type GenericItem = Record<string, unknown> & { _id: string };

type Props = {
  schemaName: string;
  includeFields?: string[];
  excludeFields?: string[];
  actionsEnabled?: boolean;
  isHeader?: boolean;
};

type RawPopulationSettings = {
  fieldName?: string;
  FieldName?: string;
  populatedFields?: string[];
  PopulatedFields?: string[];
  displayFields?: string[];
  DisplayFields?: string[];
  inputSelectionField?: string;
  InputSelectionField?: string;
  displayLabel?: string;
  DisplayLabel?: string;
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
  enumList?: (string | number)[];
  EnumList?: (string | number)[];
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
  frontend?: {
    displayName?: string;
    rowClassName?: {
      condition: string;
      className: string;
    }[];
    rowKeyClassName?: {
      condition: string;
      className: string;
    }[];
  };
  Frontend?: {
    DisplayName?: string;
    RowClassName?: {
      Condition: string;
      ClassName: string;
    }[];
    RowKeyClassName?: {
      Condition: string;
      ClassName: string;
    }[];
  };
  populationSettings?: RawPopulationSettings;
  PopulationSettings?: RawPopulationSettings;
  equation?: string;
  Equation?: string;
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
  frontend?: {
    displayName?: string;
    rowClassName?: {
      condition: string;
      className: string;
    }[];
  };
  Frontend?: {
    DisplayName?: string;
    RowClassName?: {
      Condition: string;
      ClassName: string;
    }[];
  };
};

const humanize = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

// Helper to get display label - uses Frontend.DisplayName if available, otherwise humanizes the field name
const getFieldLabel = (field: Field): string => {
  return field.frontend?.displayName || humanize(field.name);
};

const normalizeField = (f: RawField): Field => {
  const rawPopSettings = f.populationSettings ?? f.PopulationSettings;
  return {
    name: f.name ?? f.Name ?? "",
    type: f.type ?? f.Type ?? "",
    tag: f.tag ?? f.Tag,
    objectSchemaName: f.objectSchemaName ?? f.ObjectSchemaName,
    enumList: f.enumList ?? f.EnumList,
    isForceDelete: f.isForceDelete ?? f.IsForceDelete,
    unique: f.unique ?? f.Unique,
    isHashed: f.isHashed ?? f.IsHashed,
    isLoginCredential: f.isLoginCredential ?? f.IsLoginCredential,
    isSearchable: f.isSearchable ?? f.IsSearchable,
    children: (f.children ?? f.Children ?? [])?.map((c: RawField) =>
      normalizeField(c)
    ),
    frontend:
      f.frontend ??
      (f.Frontend
        ? {
            displayName: f.Frontend.DisplayName,
            rowClassName: f.Frontend.RowClassName?.map((rc) => ({
              condition: rc.Condition,
              className: rc.ClassName,
            })),
            rowKeyClassName: f.Frontend.RowKeyClassName?.map((rc) => ({
              condition: rc.Condition,
              className: rc.ClassName,
            })),
          }
        : undefined),
    populationSettings: rawPopSettings
      ? {
          fieldName: rawPopSettings.fieldName ?? rawPopSettings.FieldName ?? "",
          populatedFields: rawPopSettings.populatedFields ?? rawPopSettings.PopulatedFields ?? [],
          displayFields: rawPopSettings.displayFields ?? rawPopSettings.DisplayFields ?? [],
          inputSelectionField: rawPopSettings.inputSelectionField ?? rawPopSettings.InputSelectionField ?? "",
          displayLabel: rawPopSettings.displayLabel ?? rawPopSettings.DisplayLabel ?? "",
        }
      : undefined,
    equation: f.equation ?? f.Equation,
  };
};

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
  frontend:
    c.frontend ??
    (c.Frontend
      ? {
          displayName: c.Frontend.DisplayName,
          rowClassName: c.Frontend.RowClassName?.map((rc) => ({
            condition: rc.Condition,
            className: rc.ClassName,
          })),
        }
      : undefined),
});

// Helper to convert Tailwind bg classes to inline styles
const tailwindBgToStyle = (className: string): React.CSSProperties => {
  const bgColorMap: Record<string, string> = {
    'bg-red-50': '#fef2f2', 'bg-red-100': '#fee2e2', 'bg-red-200': '#fecaca',
    'bg-red-300': '#fca5a5', 'bg-red-400': '#f87171', 'bg-red-500': '#ef4444',
    'bg-red-600': '#dc2626', 'bg-red-700': '#b91c1c', 'bg-red-800': '#991b1b',
    'bg-red-900': '#7f1d1d',
    'bg-blue-50': '#eff6ff', 'bg-blue-100': '#dbeafe', 'bg-blue-200': '#bfdbfe',
    'bg-blue-300': '#93c5fd', 'bg-blue-400': '#60a5fa', 'bg-blue-500': '#3b82f6',
    'bg-blue-600': '#2563eb', 'bg-blue-700': '#1d4ed8', 'bg-blue-800': '#1e40af',
    'bg-blue-900': '#1e3a8a',
    'bg-green-50': '#f0fdf4', 'bg-green-100': '#dcfce7', 'bg-green-200': '#bbf7d0',
    'bg-green-300': '#86efac', 'bg-green-400': '#4ade80', 'bg-green-500': '#22c55e',
    'bg-green-600': '#16a34a', 'bg-green-700': '#15803d', 'bg-green-800': '#166534',
    'bg-green-900': '#14532d',
    'bg-yellow-50': '#fefce8', 'bg-yellow-100': '#fef9c3', 'bg-yellow-200': '#fef08a',
    'bg-yellow-300': '#fde047', 'bg-yellow-400': '#facc15', 'bg-yellow-500': '#eab308',
    'bg-yellow-600': '#ca8a04', 'bg-yellow-700': '#a16207', 'bg-yellow-800': '#854d0e',
    'bg-yellow-900': '#713f12',
    'bg-purple-50': '#faf5ff', 'bg-purple-100': '#f3e8ff', 'bg-purple-200': '#e9d5ff',
    'bg-purple-300': '#d8b4fe', 'bg-purple-400': '#c084fc', 'bg-purple-500': '#a855f7',
    'bg-purple-600': '#9333ea', 'bg-purple-700': '#7e22ce', 'bg-purple-800': '#6b21a8',
    'bg-purple-900': '#581c87',
    'bg-pink-50': '#fdf2f8', 'bg-pink-100': '#fce7f3', 'bg-pink-200': '#fbcfe8',
    'bg-pink-300': '#f9a8d4', 'bg-pink-400': '#f472b6', 'bg-pink-500': '#ec4899',
    'bg-pink-600': '#db2777', 'bg-pink-700': '#be185d', 'bg-pink-800': '#9d174d',
    'bg-pink-900': '#831843',
    'bg-gray-50': '#f9fafb', 'bg-gray-100': '#f3f4f6', 'bg-gray-200': '#e5e7eb',
    'bg-gray-300': '#d1d5db', 'bg-gray-400': '#9ca3af', 'bg-gray-500': '#6b7280',
    'bg-gray-600': '#4b5563', 'bg-gray-700': '#374151', 'bg-gray-800': '#1f2937',
    'bg-gray-900': '#111827',
    'bg-orange-50': '#fff7ed', 'bg-orange-100': '#ffedd5', 'bg-orange-200': '#fed7aa',
    'bg-orange-300': '#fdba74', 'bg-orange-400': '#fb923c', 'bg-orange-500': '#f97316',
    'bg-orange-600': '#ea580c', 'bg-orange-700': '#c2410c', 'bg-orange-800': '#9a3412',
    'bg-orange-900': '#7c2d12',
  };

  const classes = className.split(' ');
  const style: React.CSSProperties = {};

  classes.forEach((cls) => {
    if (bgColorMap[cls]) {
      style.backgroundColor = bgColorMap[cls];
    }
  });

  return style;
};

const parseValue = (row: GenericItem, value: string): any => {
  // console.log("Parsing value:", value, "Row:", row);
  if (!value) return value;
  value = value.trim();

  // Check for row(field) syntax
  const rowMatch = value.match(/^row\((.+)\)$/);
  if (rowMatch) {
    const field = rowMatch[1];
    // console.log("Parsed row field:", field, "Value:", row[field]);
    return row[field];
  }

  // Check for quoted strings
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Check for booleans
  if (value === "true") return true;
  if (value === "false") return false;

  // Check for numbers
  if (!isNaN(Number(value))) return Number(value);

  // Fallback: Check if value is a key in row
  if (value in row) {
    return row[value];
  }

  return value;
};

const evaluateRowCondition = (row: GenericItem, condition: string): boolean => {
  // console.log("Evaluating condition:", condition, "Row:", row);
  if (!condition) return false;

  // Handle inequality (!=)
  if (condition.includes("!=")) {
    const [lhs, rhs] = condition.split("!=");
    if (!lhs || rhs === undefined) return false;
    const result = parseValue(row, lhs) != parseValue(row, rhs);
    // console.log("Inequality result:", result);
    return result;
  }

  // Handle >=
  if (condition.includes(">=")) {
    const [lhs, rhs] = condition.split(">=");
    if (!lhs || rhs === undefined) return false;
    const result = parseValue(row, lhs) >= parseValue(row, rhs);
    // console.log(">= result:", result);
    return result;
  }

  // Handle <=
  if (condition.includes("<=")) {
    const [lhs, rhs] = condition.split("<=");
    if (!lhs || rhs === undefined) return false;
    const result = parseValue(row, lhs) <= parseValue(row, rhs);
    // console.log("<= result:", result);
    return result;
  }

  // Handle >
  if (condition.includes(">")) {
    const [lhs, rhs] = condition.split(">");
    if (!lhs || rhs === undefined) return false;
    const result = parseValue(row, lhs) > parseValue(row, rhs);
    console.log("Condition:", condition, "LHS:", parseValue(row, lhs), "RHS:", parseValue(row, rhs), "Result:", result);
    return result;
  }

  // Handle <
  if (condition.includes("<")) {
    const [lhs, rhs] = condition.split("<");
    if (!lhs || rhs === undefined) return false;
    const result = parseValue(row, lhs) < parseValue(row, rhs);
    // console.log("< result:", result);
    return result;
  }

  // Handle equality (=)
  if (condition.includes("=")) {
    const [lhs, rhs] = condition.split("=");
    if (!lhs || rhs === undefined) return false;
    const result = parseValue(row, lhs) == parseValue(row, rhs);
    // console.log("Equality result:", result);
    return result;
  }

  // Handle falsy check (!)
  if (condition.startsWith("!")) {
    const key = condition.substring(1).trim();
    return !parseValue(row, key);
  }

  // Handle truthy check (just field name)
  return !!parseValue(row, condition);
};

const isDisplayablePrimitive = (f: Field) => {
  const t = (f.type || "").toLowerCase();
  const originalType = f.type || "";

  // Check for array types (both camelCase and lowercase)
  const isArrayType =
    t === "stringarray" ||
    originalType === "stringArray" ||
    t === "string[]" ||
    t === "array<string>" ||
    t === "intarray" ||
    originalType === "intArray" ||
    t === "int[]" ||
    t === "array<int>" ||
    t === "numberarray" ||
    originalType === "numberArray" ||
    t === "number[]" ||
    t === "array<number>";

  const isPrimitive = [
    Types.String,
    Types.Number,
    Types.Boolean,
    Types.Date,
    "int",
    "float",
    "double",
    Types.Image,
    "img",
    Types.ObjectId,
    Types.AutoIncrementId,
    Types.ObjectIdArray,
  ].includes(t);

  return isPrimitive || isArrayType;
};

function fieldToInput(field: Field) {
  const t = (field.type || "").toLowerCase();
  const originalType = field.type || "";

  // Check for string array types
  const isStringArray =
    t === Types.StringArray ||
    originalType === "stringArray" ||
    t === "string[]" ||
    t === "array<string>";

  // Check for int array types
  const isIntArray =
    t === Types.IntArray ||
    originalType === "intArray" ||
    t === "int[]" ||
    t === "array<int>";

  // Check for number array types
  const isNumberArray =
    t === Types.NumberArray ||
    originalType === "numberArray" ||
    t === "number[]" ||
    t === "array<number>";

  if (isStringArray)
    return {
      inputType: InputTypes.TEXT as const,
      formKeyType: FormKeyTypeEnum.STRING_ARRAY as const,
    };

  if (isIntArray)
    return {
      inputType: InputTypes.TEXT as const,
      formKeyType: FormKeyTypeEnum.INT_ARRAY as const,
    };

  if (isNumberArray)
    return {
      inputType: InputTypes.TEXT as const,
      formKeyType: FormKeyTypeEnum.NUMBER_ARRAY as const,
    };

  if ([Types.Number, "int", "float", "double"].includes(t))
    return {
      inputType: InputTypes.NUMBER as const,
      formKeyType: FormKeyTypeEnum.NUMBER as const,
    };
  if ([Types.Boolean, "bool"].includes(t))
    return {
      inputType: InputTypes.CHECKBOX as const,
      formKeyType: FormKeyTypeEnum.BOOLEAN as const,
    };
  if ([Types.Image, "img"].includes(t))
    return {
      inputType: InputTypes.IMAGE as const,
      formKeyType: FormKeyTypeEnum.STRING as const,
    };
  if ([Types.Date, "datetime", "timestamp"].includes(t))
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
  isHeader = false,
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
        (field.type || "").toLowerCase() === Types.Image ||
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

  const [showFilters, setShowFilters] = useState(false);

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

  // Fetch selection data for objectId/autoIncrementId fields with populationSettings
  const selectionDataMap = useSelectionData(container?.fields || []);

  const rowKeys = useMemo(
    () =>
      displayFields.map((f) => {
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

        // Compute className based on rowKeyClassName conditions
        if (f.frontend?.rowKeyClassName) {
          rowKey.className = (row: GenericItem) => {
            let classNames = "";
            f.frontend!.rowKeyClassName!.forEach((config) => {
              if (evaluateRowCondition(row, config.condition)) {
                classNames += ` ${config.className}`;
              }
            });
            return classNames.trim();
          };
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
            if (Array.isArray(value)) {
              return <span>{value.join(", ")}</span>;
            }
            return <span>{String(value || "")}</span>;
          };
        } else if (
          (fieldType === Types.ObjectId || fieldType === Types.AutoIncrementId) &&
          f.populationSettings &&
          f.populationSettings.displayFields &&
          f.populationSettings.displayFields.length > 0
        ) {
          // Handle populated objectId/autoIncrementId fields
          rowKey.node = (row: GenericItem) => {
            const value = row[f.name];
            if (value && typeof value === "object") {
              // Display the fields specified in displayFields
              const valueObj = value as Record<string, unknown>;
              const displayValues = f.populationSettings!.displayFields
                .map((fieldName) => valueObj[fieldName])
                .filter(Boolean)
                .map(String);
              return <span>{displayValues.join(" - ") || String(valueObj._id || "")}</span>;
            }
            return <span>{String(value || "")}</span>;
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
            if (Array.isArray(value) && value.length > 0) {
              // Map over array of populated objects
              const displayItems = value.map((item) => {
                if (item && typeof item === "object") {
                  const itemObj = item as Record<string, unknown>;
                  const displayValues = f.populationSettings!.displayFields
                    .map((fieldName) => itemObj[fieldName])
                    .filter(Boolean)
                    .map(String);
                  return displayValues.join(" - ") || String(itemObj._id || "");
                } else if (typeof item === "string") {
                  // Handle ID strings by looking up in selectionDataMap
                  const selectionOptions = selectionDataMap.get(f.name) || [];
                  const foundOption = selectionOptions.find((opt) => opt._id === item);
                  if (foundOption) {
                    return String(
                      foundOption[f.populationSettings!.inputSelectionField] || item
                    );
                  }
                  return item;
                }
                return String(item || "");
              });
              return <span>{displayItems.join(", ")}</span>;
            }
            return <span>{String(value || "")}</span>;
          };
        }

        return rowKey;
      }),
    [displayFields, updateDynamicItem, selectionDataMap, t]
  );

  const columns = useMemo(() => {
    const baseCols = displayFields.map((f) => ({
      key: t(getFieldLabel(f)),
      isSortable: true,
      correspondingKey: f.name,
    }));
    return actionsEnabled
      ? [...baseCols, { key: t("Actions"), isSortable: false }]
      : baseCols;
  }, [displayFields, t, actionsEnabled]);

  const { inputs, formKeys } = useMemo(() => {
    const ins = displayFields.map((f) => {
      // Skip fields with equation
      if (f.equation) return null;

      const m = fieldToInput(f);
      const label = t(getFieldLabel(f));
      const fieldType = (f.type || "").toLowerCase();

      // Check if field has populationSettings (objectId/autoIncrementId/objectIdArray with selection data)
      if (
        (fieldType === Types.ObjectId || fieldType === Types.AutoIncrementId || fieldType === Types.ObjectIdArray) &&
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
          isMultiple: fieldType === Types.ObjectIdArray, // Enable multi-select for objectIdArray
          options: selectionData.map((item) => ({
            value: String(item._id || ""),
            label: String(
              item[f.populationSettings!.inputSelectionField] || item._id || ""
            ),
          })),
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
          required: false,
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
      };
    }).filter((i): i is NonNullable<typeof i> => i !== null);

    const fks = displayFields.map((f) => {
      if (f.equation) return null;
      const m = fieldToInput(f);
      return { key: f.name, type: m.formKeyType };
    }).filter((k): k is NonNullable<typeof k> => k !== null);

    return { inputs: ins, formKeys: fks };
  }, [displayFields, t, selectionDataMap]);

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

  const rowStyleFunction = useCallback(
    (row: GenericItem): React.CSSProperties => {
      const styles: React.CSSProperties = {};

      // Container level configs
      if (container?.frontend?.rowClassName) {
        console.log("Container RowClassName Configs:", container.frontend.rowClassName);
        container.frontend.rowClassName.forEach((config) => {
          if (evaluateRowCondition(row, config.condition)) {
            console.log("Applied container class:", config.className);
            Object.assign(styles, tailwindBgToStyle(config.className));
          }
        });
      }

      // Field level configs
      container?.fields.forEach((field) => {
        if (field.frontend?.rowClassName) {
          console.log("Field RowClassName Configs:", field.name, field.frontend.rowClassName);
          field.frontend.rowClassName.forEach((config) => {
            if (evaluateRowCondition(row, config.condition)) {
              console.log("Applied field class:", config.className);
              Object.assign(styles, tailwindBgToStyle(config.className));
            }
          });
        }
      });

      return styles;
    },
    [container]
  );

  console.log("rowStyleFunction defined:", !!rowStyleFunction);

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
        modal: rowToAction ? (() => {
          // Normalize the row data to extract IDs from populated fields
          const normalizedUpdates = { ...rowToAction };
          displayFields.forEach((f) => {
            const fieldType = (f.type || "").toLowerCase();
            if (
              (fieldType === Types.ObjectId || fieldType === Types.AutoIncrementId) &&
              f.populationSettings &&
              normalizedUpdates[f.name] &&
              typeof normalizedUpdates[f.name] === "object"
            ) {
              // Extract the _id from the populated object
              const populatedValue = normalizedUpdates[f.name] as Record<string, unknown>;
              normalizedUpdates[f.name] = populatedValue._id;
            } else if (
              fieldType === Types.ObjectIdArray &&
              f.populationSettings &&
              normalizedUpdates[f.name] &&
              Array.isArray(normalizedUpdates[f.name])
            ) {
              // Extract array of _ids from populated objects
              const populatedArray = normalizedUpdates[f.name] as Array<Record<string, unknown>>;
              normalizedUpdates[f.name] = populatedArray.map((item) => 
                item && typeof item === "object" ? item._id : item
              );
            }
          });
          
          return (
            <GenericAddEditPanel
              isOpen={isEditOpen}
              close={() => setIsEditOpen(false)}
              inputs={inputs}
              formKeys={formKeys}
              submitItem={handleSubmitItem}
              isEditMode
              topClassName="flex flex-col gap-2"
              itemToEdit={{ id: rowToAction._id, updates: normalizedUpdates }}
            />
          );
        })() : null,
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
          if (fieldType === Types.Image || fieldType === Types.Image) return false;
          return !f.equation;
        })
        .map((f) => ({
          value: f.name,
          label: t(getFieldLabel(f)),
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
        const label = t(getFieldLabel(f));
        const fieldType = (f.type || "").toLowerCase();

        // Check if field has populationSettings (objectId/autoIncrementId/objectIdArray with selection data)
        if (
          (fieldType === Types.ObjectId || fieldType === Types.AutoIncrementId || fieldType === Types.ObjectIdArray) &&
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
                item[f.populationSettings!.inputSelectionField] || item._id || ""
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
  }, [t, bulkFieldOptions, isBulkStepTwo, displayFields, bulkSelectedKeys]);

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
              typeof item === "string" ? parseInt(item, 10) : item
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
              typeof item === "string" ? parseFloat(item) : item
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

  const filterPanelInputs = useMemo(() => {
    return displayFields
      .filter((f) => {
        const fieldType = (f.type || "").toLowerCase();
        // Exclude id, image fields from filters
        return (
          !["_id", "id"].includes(f.name) &&
          fieldType !== Types.Image &&
          fieldType !== "img"
        );
      })
      .map((f) => {
        const m = fieldToInput(f);
        const label = t(getFieldLabel(f));
        const fieldType = (f.type || "").toLowerCase();

        // Check if field is objectId/autoIncrementId/objectIdArray with populationSettings
        if (
          (fieldType === Types.ObjectId || fieldType === Types.AutoIncrementId || fieldType === Types.ObjectIdArray) &&
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
                item[f.populationSettings!.inputSelectionField] || item._id || ""
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
  }, [displayFields, t, selectionDataMap]);

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
    [t, showFilters]
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
    [showFilters, filterPanelInputs, filterPanelFormElements]
  );

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

  const { exportDynamicItems } = useExportDynamicItems();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExport = (
    selectedFields: string[],
    includeSearch: boolean,
    includeFilters: boolean,
    exportScope: "all" | "currentPage" | "numberOfPages",
    pageCount?: number
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
      <div className={isHeader ? "w-[98%] mx-auto my-10" : "w-[95%] mx-auto"}>
        <GenericTable
          rowKeys={rowKeys}
          actions={actions}
          columns={columns}
          rows={rows}
          rowStyleFunction={rowStyleFunction}
          title={t(humanize(schemaName))}
          addButton={addButton}
          isCollapsible={false}
          isActionsActive={actionsEnabled}
          isSearch={false}
          outsideSortProps={outsideSort}
          {...(pagination && { pagination })}
          outsideSearchProps={outsideSearchProps}
          selectionActions={selectionActions}
          isExcel={true}
          onExcelUpload={!hasImageField ? createMultipleDynamicItem : undefined}
          onExcelExport={() => setIsExportModalOpen(true)}
          filters={filters}
          filterPanel={filterPanel}
          containerFields={container?.fields}
        />
        <ExportModal
          isOpen={isExportModalOpen}
          close={() => setIsExportModalOpen(false)}
          fields={displayFields}
          onExport={handleExport}
          schemaName={schemaName}
          currentPage={currentPage}
          totalPages={pagination?.totalPages || 1}
        />
      </div>
    </>
  );
}
