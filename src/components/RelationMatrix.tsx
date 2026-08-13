import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-toastify";
import { CheckSwitch } from "../common/CheckSwitch";
import type { RelationMatrixConfig } from "../types/page";
import { useGetPaginatedItems } from "../utils/dynamic";
import {
  addDynamicArrayRow,
  deleteDynamicArrayRow,
} from "../utils/api/dynamicArray";
import {
  buildRelationArrayTarget,
  isRelationMatrixMember,
  normalizeRelationId,
} from "../utils/relationMatrix";
import {
  createTableToggleState,
  isBooleanColumnEditable,
  isTableColumnVisible,
} from "../utils/tableToggles";

type RecordItem = Record<string, unknown>;

const valueLabel = (value: unknown): string => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as RecordItem;
    return String(record.name ?? record.label ?? record._id ?? record.id ?? "-");
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
  const toggles = config.toggles || [];
  const [toggleState, setToggleState] = useState(() =>
    createTableToggleState(toggles),
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const rowLimit = 100;
  const columnLimit = Math.min(100, Math.max(1, config.columnLimit || 100));
  const rows = useGetPaginatedItems<RecordItem>(
    1,
    rowLimit,
    config.rowSchemaName,
    {},
  )?.items || [];
  const columns = useGetPaginatedItems<RecordItem>(
    1,
    columnLimit,
    config.columnSchemaName,
    {},
  )?.items || [];
  const visible = isTableColumnVisible(
    config.visibilityToggle,
    toggleState,
    toggles,
  );
  const editable = isBooleanColumnEditable(
    config.editToggle,
    toggleState,
    toggles,
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
      if (nextChecked) {
        await addDynamicArrayRow({
          ...target,
          item: { [config.targetItemMatchField]: rowId },
        });
      } else {
        await deleteDynamicArrayRow({ ...target, rowIdentity: rowId });
      }
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

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{title || "Relations"}</h2>
        <div className="flex flex-wrap items-center gap-4">
          {toggles.map((toggle) => (
            <label key={toggle.id} className="flex items-center gap-2 text-sm text-gray-700">
              <span>{toggle.label}</span>
              <CheckSwitch
                checked={toggleState[toggle.id] ?? toggle.defaultValue}
                onChange={() =>
                  setToggleState((current) => ({
                    ...current,
                    [toggle.id]: !(current[toggle.id] ?? toggle.defaultValue),
                  }))
                }
              />
            </label>
          ))}
        </div>
      </div>
      {visible && (
        <div className="max-w-full overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-max w-full border-collapse text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 min-w-48 border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
                  {config.rowLabelField}
                </th>
                {columns.map((column) => (
                  <th key={normalizeRelationId(column[config.columnIdField])} className="min-w-36 border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                    {valueLabel(column[config.columnLabelField])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowId = normalizeRelationId(row[config.rowIdField]);
                return (
                  <tr key={rowId} className="border-b border-gray-100 last:border-0">
                    <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-4 py-3 font-medium text-gray-900">
                      {valueLabel(row[config.rowLabelField])}
                    </td>
                    {columns.map((column) => {
                      const columnId = normalizeRelationId(column[config.columnIdField]);
                      const key = `${columnId}:${rowId}`;
                      const serverChecked = isRelationMatrixMember(
                        column[config.targetArrayField],
                        config.targetItemMatchField,
                        rowId,
                      );
                      const checked = overrides[key] ?? serverChecked;
                      return (
                        <td key={columnId} className="px-4 py-3 text-center">
                          <span className={pending[key] ? "inline-flex opacity-50" : "inline-flex"}>
                            <CheckSwitch
                              checked={checked}
                              onChange={() => editable && changeMembership(row, column, !checked)}
                              uncheckedBg="bg-gray-300"
                            />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <div className="p-6 text-center text-sm text-gray-500">No rows found.</div>}
        </div>
      )}
    </section>
  );
}
