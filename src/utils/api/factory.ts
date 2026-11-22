import { useTenantProject } from "../../hooks/useTenantProject";
import { projectQueryKey } from "../projectScope";
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { baseQueryOptions } from "../../config/queryClient";
import { UpdatePayload, get, patch, post, remove } from ".";
import { getApiErrorMessage } from "./errorMessage";

interface Props<T> {
  baseQuery: string;
  queryKey?: QueryKey;
  isInvalidate?: boolean;
  isAdditionalInvalidate?: boolean;
  sortFunction?: (a: Partial<T>, b: Partial<T>) => number;
  additionalInvalidates?: QueryKey[];
}

export function useGet<T>(
  path: string,
  queryKey?: QueryKey,
  enabled: boolean = true,
  keyIncludesScope = false,
) {
  // We are using path as a query key if queryKey is not provided
  const { scope, requestConfig } = useTenantProject();
  const fetchQueryKey = keyIncludesScope && queryKey ? queryKey : projectQueryKey(scope, queryKey || [path]);
  const { data } = useQuery({
    queryKey: fetchQueryKey,
    queryFn: ({ signal }) => get<T>({ path, config: { ...requestConfig, signal } }),
    enabled: enabled, // Control whether the query should run
    ...baseQueryOptions,
  });
  return data;
}

export function useGetList<T>(
  path: string,
  queryKey?: QueryKey,
  enabled: boolean = true
) {
  return useGet<T[]>(path, queryKey, enabled) || [];
}

export function useMutationApi<T extends { _id: number | string }>({
  baseQuery,
  queryKey: baseKey = [baseQuery],
  isInvalidate = false,
  isAdditionalInvalidate = false,
  sortFunction,
  additionalInvalidates,
}: Props<T>) {
  const { scope, requestConfig } = useTenantProject();
  const queryKey = projectQueryKey(scope, baseKey);
  const config = requestConfig;
  function createRequest(itemDetails: Partial<T>): Promise<T> {
    return post<Partial<T>, T>({
      config,
      path: baseQuery,
      payload: itemDetails,
    });
  }

  function deleteRequest(id: number | string): Promise<T> {
    return remove<T>({
      config,
      path: `${baseQuery}/${id}`,
    });
  }

  function updateRequest({ id, updates }: UpdatePayload<T>): Promise<T> {
    return patch<Partial<T>, T>({
      config,
      path: `${baseQuery}/${id}`,
      payload: updates,
    });
  }
  const { t } = useTranslation();
  function useCreateItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationKey: [...queryKey, requestConfig.runtimeSession, "create"],
      mutationFn: createRequest,
      // We are updating tables query data with new item
      onMutate: async (itemDetails: Partial<T>) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey });
        // Snapshot the previous value
        const previousItems = queryClient.getQueryData<T[]>(queryKey);
        if (!previousItems) return;
        const updatedItems = [...(previousItems as T[]), itemDetails];
        if (sortFunction) {
          updatedItems.sort(sortFunction);
        }
        // Optimistically update to the new value
        queryClient.setQueryData(queryKey, updatedItems);
        // Return a context object with the snapshotted value
        return { previousItems };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err: Error, _newTable, context) => {
        const previousItemContext = context as {
          previousItems: T[];
        };
        if (previousItemContext?.previousItems) {
          const { previousItems } = previousItemContext;
          queryClient.setQueryData<T[]>(queryKey, previousItems);
        }
        const errorMessage = getApiErrorMessage(_err);
        setTimeout(() => toast.error(t(errorMessage)), 200);
      },
      // Always refetch after error or success:
      onSettled: async () => {
        if (isInvalidate) {
          queryClient.invalidateQueries({ queryKey });
        }
        if (isAdditionalInvalidate) {
          additionalInvalidates?.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: projectQueryKey(scope, key) });
          });
        }
      },
    });
  }
  function useDeleteItemMutation() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationKey: [...queryKey, requestConfig.runtimeSession, "delete"],
      mutationFn: deleteRequest,
      // We are updating tables query data with new item
      onMutate: async (id: number | string) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];

        const updatedItems = previousItems.filter((item) => item._id !== id);
        if (sortFunction) {
          updatedItems.sort(sortFunction);
        }

        // Optimistically update to the new value
        queryClient.setQueryData(queryKey, updatedItems);

        // Return a context object with the snapshotted value
        return { previousItems };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err: Error, _newTable, context) => {
        const previousItemContext = context as {
          previousItems: T[];
        };
        if (previousItemContext?.previousItems) {
          const { previousItems } = previousItemContext;
          queryClient.setQueryData<T[]>(queryKey, previousItems);
        }
        const errorMessage = getApiErrorMessage(_err);
        setTimeout(() => toast.error(t(errorMessage)), 200);
      },
      // Always refetch after error or success:
      onSettled: async () => {
        if (isInvalidate) {
          queryClient.invalidateQueries({ queryKey });
        }
        if (isAdditionalInvalidate) {
          additionalInvalidates?.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: projectQueryKey(scope, key) });
          });
        }
      },
    });
  }
  function useUpdateItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationKey: [...queryKey, requestConfig.runtimeSession, "update"],
      mutationFn: updateRequest,
      // We are updating tables query data with new item
      onMutate: async ({ id, updates }: UpdatePayload<T>) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];
        const updatedItems = [...previousItems];

        for (let i = 0; i < updatedItems.length; i++) {
          if (updatedItems[i]._id === id) {
            updatedItems[i] = { ...updatedItems[i], ...updates };
          }
        }

        if (sortFunction) {
          updatedItems.sort(sortFunction);
        }

        // Optimistically update to the new value
        queryClient.setQueryData(queryKey, updatedItems);

        // Return a context object with the snapshotted value
        return { previousItems };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err: Error, _newTable, context) => {
        const previousItemContext = context as {
          previousItems: T[];
        };
        if (previousItemContext?.previousItems) {
          const { previousItems } = previousItemContext;
          queryClient.setQueryData<T[]>(queryKey, previousItems);
        }
        const errorMessage = getApiErrorMessage(_err);
        setTimeout(() => toast.error(t(errorMessage)), 200);
      },
      // Always refetch after error or success:
      onSettled: async () => {
        if (isInvalidate) {
          queryClient.invalidateQueries({ queryKey });
        }
        if (isAdditionalInvalidate || additionalInvalidates) {
          additionalInvalidates?.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: projectQueryKey(scope, key) });
          });
        }
      },
    });
  }

  const createMutation = useCreateItemMutation();
  const deleteMutation = useDeleteItemMutation();
  const updateMutation = useUpdateItemMutation();

  return {
    createItem: createMutation.mutate,
    deleteItem: deleteMutation.mutate,
    updateItem: updateMutation.mutate,
    createMutation,
    deleteMutation,
    updateMutation,
  };
}
