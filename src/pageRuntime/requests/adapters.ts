import type { PageRequestResult } from "../../types/pageRequests";
import { requestRecord, validRequestResult } from "../../utils/pageRequests";
function atPath(value: unknown, path: string[]): unknown {
  for (const key of path) { if (!requestRecord(value) || !Object.hasOwn(value, key)) return undefined; value = value[key]; }
  return value;
}
export function selectPageRequestResult(payload: unknown, result: PageRequestResult): unknown {
  if (!validRequestResult(result)) throw new Error("Invalid page request result path.");
  const selected = result.path?.length ? atPath(payload, result.path) : payload;
  if (result.kind === "value") return selected;
  const items = Array.isArray(selected) ? selected : requestRecord(selected) && Array.isArray(selected.items) ? selected.items : undefined;
  if (!items || !items.every(requestRecord)) throw new Error("This page request did not return records.");
  const total = result.totalPath?.length ? atPath(payload, result.totalPath) : requestRecord(payload) ? payload.totalItems : undefined;
  if (total !== undefined && (typeof total !== "number" || !Number.isFinite(total) || total < 0)) throw new Error("This page request returned an invalid total.");
  return { ...(requestRecord(selected) ? selected : {}), items, totalItems: total ?? items.length };
}
export function toDynamicPayload(data: unknown) {
  if (data === undefined) return undefined;
  if (Array.isArray(data)) return { items: data, totalItems: data.length, totalPages: 1, currentPage: 1 };
  if (!requestRecord(data) || !Array.isArray(data.items)) return { items: [requestRecord(data) ? data : { value: data }], totalItems: 1, totalPages: 1, currentPage: 1 };
  return data;
}
export function toCollectionPage(data: unknown, page: number, limit: number) {
  const value = selectPageRequestResult(data, { kind: "records" }) as { items: Record<string, unknown>[]; totalItems: number; currentPage?: number };
  return { items: value.items, total: value.totalItems, page: value.currentPage ?? page, pageSize: limit };
}
