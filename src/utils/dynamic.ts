import { FormElementsState } from "../types";
import { useGet, useMutationApi } from "../utils/api/factory";
export interface DynamicPayload<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

const BASE = "/dynamic";
const qs = (params: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();

const listKey = (schema: string) => ["dynamic", schema, "all"] as const;

export function useDynamicCrud<T extends { _id: string | number }>(
  schemaName: string
) {
  const queryKey = listKey(schemaName);

  const { createItem } = useMutationApi<T>({
    baseQuery: `${BASE}?${qs({ schemaName })}`,
    queryKey,
  });

  const { updateItem, deleteItem } = useMutationApi<T>({
    baseQuery: BASE,
    queryKey,
  });

  const createDynamicItem = (doc: Partial<T>) => createItem(doc);

  const updateDynamicItem = (id: string | number, updates: Partial<T>) =>
    updateItem({ id: `${id}?${qs({ schemaName })}`, updates });

  const deleteDynamicItem = (id: string | number) =>
    deleteItem(`${id}?${qs({ schemaName })}`);

  return {
    createDynamicItem,
    updateDynamicItem,
    deleteDynamicItem,
  };
}

export function useGetDynamicItems<T>(schemaName: string) {
  const path = `${BASE}?${qs({ schemaName })}`;
  const queryKey = listKey(schemaName);
  return useGet<T[]>(path, queryKey);
}

export function useGetPaginatedItems<T>(
  page: number,
  limit: number,
  schemaName: string,
  filters: FormElementsState
) {
  const baseQueryUrl = `${BASE}/page`;
  const queryKey = [
    "dynamic",
    schemaName,
    "page",
    { page, limit, filters },
  ] as const;
  const parts = [
    `schemaName=${schemaName}`,
    `page=${page}`,
    `limit=${limit}`,
    filters.sort && `sort=${filters.sort}`,
    filters.asc !== undefined && `asc=${filters.asc}`,
    filters.search && `search=${filters.search}`,
  ];
  const queryString = parts.filter(Boolean).join("&");
  const url = `${baseQueryUrl}?${queryString}`;

  return useGet<DynamicPayload<T>>(url, queryKey, true);
}
