import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { axiosClient } from "./axiosClient";
import { useGet, useMutationApi } from "./factory";

const BASE = "/page";
const PAGE_QUERY_KEY = ["page", "all"] as const;

export interface PageSchema {
  schemaName: string;
  label?: string;
  isPaginated?: boolean;
  icon?: string;
}

export interface Page {
  _id: string;
  name: string;
  icon?: string;
  schemas?: PageSchema[];
  page?: Page;
}

// Get all pages
export function useGetAllPages() {
  return useGet<Page[]>(BASE, PAGE_QUERY_KEY);
}

// Get single page by ID
export function useGetPage(id: string) {
  const queryKey = ["page", id] as const;
  return useGet<Page>(`${BASE}/${id}`, queryKey);
}

// CRUD operations
export function usePageCrud() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Create page
  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Page>) => {
      const response = await axiosClient.post<Page>(BASE, payload);
      return response.data;
    },
    onMutate: async (newPage: Partial<Page>) => {
      await queryClient.cancelQueries({ queryKey: PAGE_QUERY_KEY });
      const previousPages =
        queryClient.getQueryData<Page[]>(PAGE_QUERY_KEY) || [];
      queryClient.setQueryData(PAGE_QUERY_KEY, [...previousPages, newPage]);
      return { previousPages };
    },
    onError: (_err: Error, _newPage, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData<Page[]>(PAGE_QUERY_KEY, context.previousPages);
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
      updates: Partial<Page>;
    }) => {
      const response = await axiosClient.patch<Page>(`${BASE}/${id}`, updates);
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: PAGE_QUERY_KEY });
      const previousPages =
        queryClient.getQueryData<Page[]>(PAGE_QUERY_KEY) || [];
      const updatedPages = previousPages.map((page) =>
        page._id === id ? { ...page, ...updates } : page
      );
      queryClient.setQueryData(PAGE_QUERY_KEY, updatedPages);
      return { previousPages };
    },
    onError: (_err: Error, _vars, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData<Page[]>(PAGE_QUERY_KEY, context.previousPages);
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

  // Delete page
  const { deleteItem } = useMutationApi<Page>({
    baseQuery: BASE,
    queryKey: PAGE_QUERY_KEY,
    isInvalidate: true,
  });

  return {
    createPage: (payload: Partial<Page>) => createMutation.mutate(payload),
    updatePage: (id: string, updates: Partial<Page>) =>
      updateMutation.mutate({ id, updates }),
    deletePage: (id: string) => deleteItem(id),
    createMutation,
    updateMutation,
  };
}
