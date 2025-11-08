import { useGet, useMutationApi } from "../utils/api/factory";

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

export function useGetDynamicItemsArray<T>(schemaName: string): T[] {
  const res = useGetDynamicItems<T>(schemaName);
  return res || [];
}
