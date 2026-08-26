import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { IoCheckmark, IoCloseOutline } from "react-icons/io5";
import { CheckSwitch } from "../common/CheckSwitch";
import type { RelationMatrixConfig } from "../types/page";
import {
  addDynamicArrayRow,
  deleteDynamicArrayRow,
} from "../utils/api/dynamicArray";
import { useGetPaginatedItems } from "../utils/dynamic";
import {
  buildRelationArrayTarget,
  buildRelationMatrixTableDescriptors,
  isRelationMatrixMember,
  normalizeRelationId,
  replaceRelationParentInDynamicData,
} from "../utils/relationMatrix";
import {
  createTableToggleState,
  isBooleanColumnEditable,
} from "../utils/tableToggles";
import GenericTable from "./panelComponents/Tables/GenericTable";
import SwitchButton from "./panelComponents/common/SwitchButton";
import type {
  ColumnType,
  FilterType,
  RowKeyType,
} from "./panelComponents/shared/types";

type RecordItem = Record<string, unknown>;

const valueLabel = (value: unknown): string => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as RecordItem;
    return String(
      record.name ?? record.label ?? record._id ?? record.id ?? "-",
    );
  }
  return value == null || value === "" ? "-" : String(value);
};

export default function RelationMatrix({
  config,
  title,
}: {
  config: RelationMatrixConfig;
  title?: string;
}) {
  const queryClient = useQueryClient();
  const toggles = (config.toggles || []).filter(
    (toggle) => toggle.id !== "show-relations",
  );
  const [toggleState, setToggleState] = useState(() =>
    createTableToggleState(toggles),
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const rowLimit = 100;
  const columnLimit = Math.min(100, Math.max(1, config.columnLimit || 100));
  const rows =
    useGetPaginatedItems<RecordItem>(1, rowLimit, config.rowSchemaName, {})
      ?.items || [];
  const columns =
    useGetPaginatedItems<RecordItem>(
      1,
      columnLimit,
      config.columnSchemaName,
      {},
    )?.items || [];
  const editable = isBooleanColumnEditable(
    config.editToggle,
    toggleState,
    toggles,
  );
  const descriptors = useMemo(
    () => buildRelationMatrixTableDescriptors(columns, config),
    [columns, config],
  );

  const changeMembership = async (
    row: RecordItem,
    column: RecordItem,
    nextChecked: boolean,
  ) => {
    const rowId = normalizeRelationId(row[config.rowIdField]);
    const columnId = normalizeRelationId(column[config.columnIdField]);
    const key = `${columnId}:${rowId}`;
    if (!rowId || !columnId || pending[key]) return;
    setOverrides((current) => ({ ...current, [key]: nextChecked }));
    setPending((current) => ({ ...current, [key]: true }));
    const target = buildRelationArrayTarget(column, config);
    try {
      const result = nextChecked
        ? await addDynamicArrayRow({
            ...target,
            item: { [config.targetItemMatchField]: rowId },
          })
        : await deleteDynamicArrayRow({ ...target, rowIdentity: rowId });
      queryClient.setQueriesData(
        { queryKey: ["dynamic", config.columnSchemaName] },
        (data) =>
          replaceRelationParentInDynamicData(
            data,
            result?.parent,
            config.columnIdField,
          ),
      );
      await queryClient.invalidateQueries({
        queryKey: ["dynamic", config.columnSchemaName],
      });
      setOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch {
      setOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      toast.error("Could not update relation");
    } finally {
      setPending((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  const tableColumns = descriptors.columns as ColumnType[];
  const rowKeys = useMemo<RowKeyType<RecordItem>[]>(
    () => [
      {
        key: config.rowLabelField,
        node: (row) => valueLabel(row[config.rowLabelField]),
        className: "font-medium text-gray-900",
      },
      ...columns.map((column) => {
        const columnId = normalizeRelationId(column[config.columnIdField]);
        return {
          key: `relation:${columnId}`,
          className: "flex justify-center",
          node: (row: RecordItem) => {
            const rowId = normalizeRelationId(row[config.rowIdField]);
            const key = `${columnId}:${rowId}`;
            const serverChecked = isRelationMatrixMember(
              column[config.targetArrayField],
              config.targetItemMatchField,
              rowId,
            );
            const checked = overrides[key] ?? serverChecked;
            return (
              <span
                className={
                  pending[key] ? "inline-flex opacity-50" : "inline-flex"
                }
              >
                {editable ? (
                  <CheckSwitch
                    checked={checked}
                    onChange={() => changeMembership(row, column, !checked)}
                    uncheckedBg="bg-gray-300"
                  />
                ) : checked ? (
                  <IoCheckmark
                    className="text-blue-500 text-2xl"
                    aria-label="Related: Yes"
                  />
                ) : (
                  <IoCloseOutline
                    className="text-red-800 text-2xl"
                    aria-label="Related: No"
                  />
                )}
              </span>
            );
          },
        };
      }),
    ],
    [columns, config, editable, overrides, pending],
  );
  const filters = useMemo<FilterType[]>(
    () =>
      toggles.map((toggle) => ({
        label: toggle.label,
        isUpperSide: false,
        node: (
          <SwitchButton
            checked={toggleState[toggle.id] ?? toggle.defaultValue}
            onChange={() =>
              setToggleState((current) => ({
                ...current,
                [toggle.id]: !(current[toggle.id] ?? toggle.defaultValue),
              }))
            }
          />
        ),
      })),
    [toggleState, toggles],
  );

  return (
    <GenericTable<RecordItem>
      rows={rows}
      columns={tableColumns}
      rowKeys={rowKeys}
      title={title || "Relations"}
      filters={filters}
      isActionsActive={false}
      isSearch={false}
      isPagination={false}
      isRowsPerPage={false}
      isColumnFilter={false}
      isExcel={false}
      showOrientationToggle={false}
    />
  );
}
