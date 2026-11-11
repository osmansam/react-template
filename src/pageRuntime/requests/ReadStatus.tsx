import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
export interface TrackedPageRead { key: QueryKey; error?: string }
export function PageRequestReadStatus({ reads }: { reads: TrackedPageRead[] }) {
  const client = useQueryClient();
  const getSnapshot = useCallback(() => JSON.stringify(reads.map(read => {
    const state = client.getQueryState(read.key);
    return [state?.status, state?.fetchStatus, read.error];
  })), [client, reads]);
  useSyncExternalStore(useCallback(callback => client.getQueryCache().subscribe(callback), [client]), getSnapshot, getSnapshot);
  const failures = reads.filter(read => read.error || client.getQueryState(read.key)?.status === "error");
  if (failures.length) return <p role="alert" className="my-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">This section's data could not be loaded. <button type="button" className="underline" onClick={() => { for (const read of failures) void client.refetchQueries({ queryKey: read.key, exact: true }); }}>Try again</button></p>;
  if (reads.some(read => client.getQueryState(read.key)?.status === "pending")) return <p role="status" className="my-2 text-sm text-gray-500">Loading page data…</p>;
  return null;
}
