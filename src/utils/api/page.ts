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
export function useGetAllPages() {
  return useQuery({
    queryKey: PAGE_QUERY_KEY,
    queryFn: () => get<PageModel[]>({ path: `${BASE}/public` }),
    ...pageQueryOptions,
  });
}

// Get single page by ID
export function useGetPage(id: string) {
  const queryKey = ["page", id] as const;
  return useQuery({
    queryKey,
    queryFn: () => get<PageModel>({ path: `${BASE}/${id}` }),
    enabled: Boolean(id),
    ...pageQueryOptions,
  });
}

// CRUD operations
export function usePageCrud() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Create page
  const createMutation = useMutation({
    mutationFn: async (payload: Partial<PageModel>) => {
      const response = await axiosClient.post<PageModel>(BASE, payload);
      return response.data;
    },
    onMutate: async (newPage: Partial<PageModel>) => {
      await queryClient.cancelQueries({ queryKey: PAGE_QUERY_KEY });
      const previousPages =
        queryClient.getQueryData<PageModel[]>(PAGE_QUERY_KEY) || [];
      queryClient.setQueryData(PAGE_QUERY_KEY, [...previousPages, newPage]);
      return { previousPages };
    },
    onError: (_err: Error, _newPage, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData<PageModel[]>(
          PAGE_QUERY_KEY,
          context.previousPages
        );
      }
      const errorMessage =
        (_err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: PAGE_QUERY_KEY });
    },
  });

  // Update page
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PageModel>;
    }) => {
      const response = await axiosClient.patch<PageModel>(
        `${BASE}/${id}`,
        updates
      );
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: PAGE_QUERY_KEY });
      const previousPages =
        queryClient.getQueryData<PageModel[]>(PAGE_QUERY_KEY) || [];
      const updatedPages = previousPages.map((page) =>
        page.id === id ? { ...page, ...updates } : page
      );
      queryClient.setQueryData(PAGE_QUERY_KEY, updatedPages);
      return { previousPages };
    },
    onError: (_err: Error, _vars, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData<PageModel[]>(
          PAGE_QUERY_KEY,
          context.previousPages
        );
      }
      const errorMessage =
        (_err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: PAGE_QUERY_KEY });
    },
  });

  // Delete page - Note: This requires the backend to use 'id' field
  // If backend uses '_id', you'll need to transform the data
  const deletePage = async (id: string) => {
    const response = await axiosClient.delete(`${BASE}/${id}`);
    await queryClient.invalidateQueries({ queryKey: PAGE_QUERY_KEY });
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
