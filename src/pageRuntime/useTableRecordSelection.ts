import { useCallback, useMemo, useState } from "react";
import { resolveSelectedRecord, resolveSelectedRowIds } from "./tableOutputAdapter";

type RecordId = string | number;
/** Direct details activation is independent of bulk checkbox selection.
 * Keep visible IDs only, and resolve records from data before UI decoration. */
export function useTableRecordSelection(sourceRows: readonly unknown[], enabled: boolean) {
 const [visible, setVisible] = useState<{ source: readonly unknown[]; ids: readonly RecordId[] } | null>(null);
 const [activeId, setActiveId] = useState<RecordId>();
 const reportVisibleRowIds = useCallback((ids: readonly RecordId[]) => {
  setVisible(previous => previous?.source === sourceRows && previous.ids.length === ids.length && previous.ids.every((id, index) => id === ids[index]) ? previous : { source: sourceRows, ids: [...ids] });
  setActiveId(previous => {
   if (!enabled) return undefined;
   const valid = (id: RecordId) => resolveSelectedRecord([{ _id: id }], ids.map(_id => ({ _id })), true, sourceRows) !== undefined;
   if (previous !== undefined && ids.includes(previous) && valid(previous)) return previous;
   return ids.find(valid);
  });
 }, [sourceRows, enabled]);
 const selectedRecord = useMemo(() => enabled && activeId !== undefined && visible?.source === sourceRows ? resolveSelectedRecord([{ _id: activeId }], visible.ids.map(_id => ({ _id })), true, sourceRows) : undefined, [sourceRows, enabled, visible, activeId]);
 const activateRecord = useCallback((id: RecordId) => {
  if (enabled && visible?.source === sourceRows && resolveSelectedRecord([{ _id: id }], visible.ids.map(_id => ({ _id })), true, sourceRows)) setActiveId(id);
 }, [enabled, sourceRows, visible]);
 return { selectedRecord, activeRecordId: selectedRecord ? resolveSelectedRowIds([selectedRecord], true)?.[0] : undefined, activateRecord, reportVisibleRowIds };
}
