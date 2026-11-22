import { useTenantProject } from "../../hooks/useTenantProject";
import { projectQueryKey } from "../projectScope";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { pageQueryOptions } from "../../config/queryClient";
import { PageModel } from "../../types/page";
import { axiosClient } from "./axiosClient";
import { get } from ".";

const BASE = "/page";
const PAGE_QUERY_KEY = ["page", "all"] as const;

// Get all pages
export function useGetAllPages(enabled: boolean = true) {
  const { scope, requestConfig } = useTenantProject();
  return useQuery({
    queryKey: projectQueryKey(scope, PAGE_QUERY_KEY),
    queryFn: ({ signal }) => get<PageModel[]>({ path: BASE, config: { ...requestConfig, signal } }),
    enabled,
    ...pageQueryOptions,
  });
}

// Get single page by ID
export function useGetPage(id: string) {
  const { scope, requestConfig } = useTenantProject();
  const queryKey = projectQueryKey(scope, ["page", id]);
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => get<PageModel>({ path: `${BASE}/${id}`, config: { ...requestConfig, signal } }),
    enabled: Boolean(id),
    ...pageQueryOptions,
  });
}

// CRUD operations
export function usePageCrud() {
  const { scope, requestConfig } = useTenantProject();
  const listKey = projectQueryKey(scope, PAGE_QUERY_KEY);
  const config = requestConfig;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Create page
  const createMutation = useMutation({
    mutationKey: projectQueryKey(scope, ["page", "create", requestConfig.runtimeSession]),
    mutationFn: async (payload: Partial<PageModel>) => {
      const response = await axiosClient.post<PageModel>(BASE, payload, config);
      return response.data;
    },
    onMutate: async (newPage: Partial<PageModel>) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousPages =
        queryClient.getQueryData<PageModel[]>(listKey) || [];
      queryClient.setQueryData(listKey, [...previousPages, newPage]);
      return { previousPages };
    },
    onError: (_err: Error, _newPage, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData<PageModel[]>(
          listKey,
          context.previousPages
        );
      }
      const errorMessage =
        (_err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  // Update page
  const updateMutation = useMutation({
    mutationKey: projectQueryKey(scope, ["page", "update", requestConfig.runtimeSession]),
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PageModel>;
    }) => {
      const response = await axiosClient.patch<PageModel>(
        `${BASE}/${id}`,
        updates, config
      );
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousPages =
        queryClient.getQueryData<PageModel[]>(listKey) || [];
      const updatedPages = previousPages.map((page) =>
        page.id === id ? { ...page, ...updates } : page
      );
      queryClient.setQueryData(listKey, updatedPages);
      return { previousPages };
    },
    onError: (_err: Error, _vars, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData<PageModel[]>(
          listKey,
          context.previousPages
        );
      }
      const errorMessage =
        (_err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  // Delete page - Note: This requires the backend to use 'id' field
  // If backend uses '_id', you'll need to transform the data
  const deletePage = async (id: string) => {
    const response = await axiosClient.delete(`${BASE}/${id}`, config);
    await queryClient.invalidateQueries({ queryKey: listKey });
    return response.data;
  };

  return {
    createPage: (payload: Partial<PageModel>) => createMutation.mutate(payload),
    updatePage: (id: string, updates: Partial<PageModel>) =>
      updateMutation.mutate({ id, updates }),
    deletePage,
    createMutation,
    updateMutation,
  };
}
