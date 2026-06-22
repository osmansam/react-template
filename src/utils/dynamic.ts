import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FormElementsState } from "../types";
import { useGet } from "../utils/api/factory";
import { axiosClient } from "./api/axiosClient";

export interface DynamicPayload<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface DynamicExecutionResponse<T> {
  status?: number;
  message?: string;
  data?: T;
  source?: string;
}

export type TableSourceBinding = {
  kind?: "schema" | "pipeline" | "workflow";
  schemaName?: string;
  pipelineName?: string;
  workflowName?: string;
  fields?: string[];
  params?: Record<string, unknown>;
};

const BASE = "/dynamic";
const idempotencyKeys = new Map<string, string>();

const qs = (params: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();

const listKey = (schema: string) => ["dynamic", schema, "all"] as const;

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (value instanceof File) {
    return JSON.stringify({
      name: value.name,
      size: value.size,
      type: value.type,
      lastModified: value.lastModified,
    });
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getIdempotencyFingerprint(
  schemaName: string,
  operation: string,
  payload: unknown,
) {
  return stableSerialize({ operation, payload, schemaName });
}

function getIdempotencyKey(fingerprint: string) {
  const existingKey = idempotencyKeys.get(fingerprint);

  if (existingKey) {
    return existingKey;
  }

  const key = createIdempotencyKey();
  idempotencyKeys.set(fingerprint, key);

  return key;
}

function idempotencyHeader(
  schemaName: string,
  operation: string,
  payload: unknown,
) {
  const fingerprint = getIdempotencyFingerprint(schemaName, operation, payload);

  return {
    "Idempotency-Key": getIdempotencyKey(fingerprint),
  };
}

function releaseIdempotencyKey(
  schemaName: string,
  operation: string,
  payload: unknown,
) {
  idempotencyKeys.delete(
    getIdempotencyFingerprint(schemaName, operation, payload),
  );
}

async function withIdempotency<T>(
  schemaName: string,
  operation: string,
  payload: unknown,
  request: (headers: Record<string, string>) => Promise<T>,
) {
  try {
    return await request(idempotencyHeader(schemaName, operation, payload));
  } finally {
    releaseIdempotencyKey(schemaName, operation, payload);
  }
}

// Helper function to convert object to FormData
function toFormData(obj: Record<string, unknown>): FormData {
  const formData = new FormData();
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  return formData;
}

export function useDynamicCrud<T extends { _id: string | number }>(
  schemaName: string,
  hasImageField: boolean = false,
  customQueryKey?: unknown[],
) {
  const queryKey = (customQueryKey || listKey(schemaName)) as unknown[];
  const qc = useQueryClient();
  const { t } = useTranslation();
  const invalidateSchemaQueries = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["dynamic", schemaName] });
  };

  // Custom create function that handles FormData
  async function createRequest(payload: Partial<T>) {
    const url = `${BASE}?${qs({ schemaName })}`;
    const data = hasImageField
      ? toFormData(payload as Record<string, unknown>)
      : payload;
    const headers = hasImageField
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" };

    const response = await withIdempotency(
      schemaName,
      "create",
      payload,
      (idempotencyHeaders) =>
        axiosClient.post<T>(url, data, {
          headers: {
            ...headers,
            ...idempotencyHeaders,
          },
        }),
    );
    // Server may return {data: newItem, message: "...", status: 200}
    // We need to extract just the data property if it exists
    const responseData = response.data as { data?: T };
    return (responseData?.data || response.data) as T;
  }

  // Custom update function that handles FormData
  async function updateRequest(id: string | number, updates: Partial<T>) {
    const url = `${BASE}/${id}?${qs({ schemaName })}`;
    const data = hasImageField
      ? toFormData(updates as Record<string, unknown>)
      : updates;
    const headers = hasImageField
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" };

    const idempotencyPayload = { id, updates };
    const response = await withIdempotency(
      schemaName,
      "update",
      idempotencyPayload,
      (idempotencyHeaders) =>
        axiosClient.patch<T>(url, data, {
          headers: {
            ...headers,
            ...idempotencyHeaders,
          },
        }),
    );
    // Server returns {data: updatedItem, message: "...", status: 200}
    // We need to extract just the data property if it exists
    const responseData = response.data as { data?: T };
    return (responseData?.data || response.data) as T;
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createRequest,
    onMutate: async (itemDetails: Partial<T>) => {
      await qc.cancelQueries({ queryKey });
      const previousData = qc.getQueryData(queryKey);

      // Check if data is paginated (DynamicPayload) or simple array
      const isPaginated =
        previousData &&
        typeof previousData === "object" &&
        "items" in previousData;
      const previousItems = isPaginated
        ? (previousData as DynamicPayload<T>).items
        : (previousData as T[]) || [];

      // Optimistic update for instant UI feedback
      const optimisticItems = [...previousItems, itemDetails as T];

      if (isPaginated) {
        qc.setQueryData(queryKey, {
          ...previousData,
          items: optimisticItems,
          totalItems: (previousData as DynamicPayload<T>).totalItems + 1,
        });
      } else {
        qc.setQueryData(queryKey, optimisticItems);
      }
      return { previousData };
    },
    onError: (_err: Error, _newItem, context) => {
      if (context?.previousData) {
        qc.setQueryData(queryKey, context.previousData);
      }
      const errorMessage =
        (_err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: () => {
      invalidateSchemaQueries();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string | number;
      updates: Partial<T>;
    }) => updateRequest(id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey });
      const previousData = qc.getQueryData(queryKey);

      // Check if data is paginated (DynamicPayload) or simple array
      const isPaginated =
        previousData &&
        typeof previousData === "object" &&
        "items" in previousData;
      const previousItems = isPaginated
        ? (previousData as DynamicPayload<T>).items
        : (previousData as T[]) || [];

      // Optimistic update for instant UI feedback
      const optimisticItems = previousItems.map((item) =>
        item._id === id ? { ...item, ...updates } : item,
      );

      if (isPaginated) {
        qc.setQueryData(queryKey, { ...previousData, items: optimisticItems });
      } else {
        qc.setQueryData(queryKey, optimisticItems);
      }
      return { previousData };
    },
    onError: (_err: Error, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData(queryKey, context.previousData);
      }
      const errorMessage =
        (_err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: () => {
      invalidateSchemaQueries();
    },
  });

  // Custom delete function
  async function deleteRequest(id: string | number) {
    const url = `${BASE}/${id}?${qs({ schemaName })}`;
    const response = await withIdempotency(
      schemaName,
      "delete",
      { id },
      (idempotencyHeaders) =>
        axiosClient.delete(url, {
          headers: idempotencyHeaders,
        }),
    );
    return response.data;
  }

  // Delete single item mutation
  const deleteMutation = useMutation({
    mutationFn: deleteRequest,
    onMutate: async (id: string | number) => {
      await qc.cancelQueries({ queryKey });

      const previousData = qc.getQueryData(queryKey);

      // Check if data is paginated (DynamicPayload) or simple array
      const isPaginated =
        previousData &&
        typeof previousData === "object" &&
        "items" in previousData;
      const previousItems = isPaginated
        ? (previousData as DynamicPayload<T>).items
        : (previousData as T[]) || [];

      const updatedItems = previousItems.filter((item) => item._id !== id);

      if (isPaginated) {
        qc.setQueryData(queryKey, {
          ...previousData,
          items: updatedItems,
          totalItems: (previousData as DynamicPayload<T>).totalItems - 1,
        });
      } else {
        qc.setQueryData(queryKey, updatedItems);
      }

      return { previousData };
    },
    onError: (_err: Error, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData(queryKey, context.previousData);
      }
      const errorMessage =
        (_err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: () => {
      invalidateSchemaQueries();
    },
  });

  const createDynamicItem = (doc: Partial<T>) => createMutation.mutate(doc);

  const updateDynamicItem = (id: string | number, updates: Partial<T>) =>
    updateMutation.mutate({ id, updates });

  const deleteDynamicItem = (id: string | number) => {
    deleteMutation.mutate(id);
  };

  // Create multiple items functionality
  async function createManyRequest(payload: Array<Partial<T>>) {
    const { data } = await withIdempotency(
      schemaName,
      "createMultiple",
      payload,
      (idempotencyHeaders) =>
        axiosClient.post(`${BASE}/multiple?${qs({ schemaName })}`, payload, {
          headers: {
            "Content-Type": "application/json",
            ...idempotencyHeaders,
          },
        }),
    );
    return data;
  }

  const createManyMutation = useMutation({
    mutationFn: createManyRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const errorMessage =
        err?.response?.data?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: () => {
      invalidateSchemaQueries();
    },
  });

  const createMultipleDynamicItem = (docs: Array<Partial<T>>) =>
    createManyMutation.mutate(docs);

  async function deleteManyRequest(payload: Array<{ _id: string | number }>) {
    const { data } = await withIdempotency(
      schemaName,
      "deleteMultiple",
      payload,
      (idempotencyHeaders) =>
        axiosClient.delete(`${BASE}/multiple?${qs({ schemaName })}`, {
          data: payload,
          headers: {
            "Content-Type": "application/json",
            ...idempotencyHeaders,
          },
        }),
    );
    return data;
  }

  const deleteManyMutation = useMutation({
    mutationFn: deleteManyRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const errorMessage =
        err?.response?.data?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: () => {
      invalidateSchemaQueries();
    },
  });

  const deleteMultipleDynamicItem = (docs: Array<{ _id: string | number }>) =>
    deleteManyMutation.mutate(docs);

  // Update multiple items functionality
  async function updateManyRequest(
    payload: Array<{ _id: string | number; updates: Partial<T> }>,
  ) {
    // Flatten the payload: merge _id with updates into a single object
    const flattenedPayload = payload.map(({ _id, updates }) => ({
      _id,
      ...updates,
    }));

    const { data } = await withIdempotency(
      schemaName,
      "updateMultiple",
      flattenedPayload,
      (idempotencyHeaders) =>
        axiosClient.patch(
          `${BASE}/multiple?${qs({ schemaName })}`,
          flattenedPayload,
          {
            headers: {
              "Content-Type": "application/json",
              ...idempotencyHeaders,
            },
          },
        ),
    );
    return data;
  }

  const updateManyMutation = useMutation({
    mutationFn: updateManyRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const errorMessage =
        err?.response?.data?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: () => {
      invalidateSchemaQueries();
    },
  });

  const updateMultipleDynamicItem = (
    docs: Array<{ _id: string | number; updates: Partial<T> }>,
  ) => updateManyMutation.mutate(docs);

  async function executeWorkflowRequest({
    workflowName,
    workflowSchema,
    record,
    oldRecord,
  }: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) {
    const targetSchema = workflowSchema || schemaName;
    const payload = { record, oldRecord };
    const { data } = await withIdempotency(
      targetSchema,
      `workflow:${workflowName}`,
      payload,
      (idempotencyHeaders) =>
        axiosClient.post(
          `${BASE}/workflow/${encodeURIComponent(workflowName)}?${qs({
            schemaName: targetSchema,
          })}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              ...idempotencyHeaders,
            },
          },
        ),
    );
    return data;
  }

  const executeWorkflowMutation = useMutation({
    mutationFn: executeWorkflowRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const errorMessage =
        err?.response?.data?.message || "An unexpected error occurred";
      setTimeout(() => toast.error(t(errorMessage)), 200);
    },
    onSettled: () => {
      invalidateSchemaQueries();
    },
  });

  const executeWorkflow = (payload: {
    workflowName: string;
    workflowSchema?: string;
    record: Record<string, unknown>;
    oldRecord?: Record<string, unknown>;
  }) => executeWorkflowMutation.mutate(payload);
  return {
    createDynamicItem,
    createMutation,
    createMultipleDynamicItem,
    createManyMutation,
    updateDynamicItem,
    deleteDynamicItem,
    deleteMultipleDynamicItem,
    deleteManyMutation,
    updateMultipleDynamicItem,
    updateManyMutation,
    executeWorkflow,
    executeWorkflowMutation,
  };
}

export function useExportDynamicItems() {
  const { t } = useTranslation();

  async function exportRequest(payload: {
    schemaName: string;
    fields: string[];
    filters: Record<string, unknown>;
    search: string;
    limit: number;
    page: number;
  }) {
    const response = await axiosClient.post(
      `${BASE}/export?schemaName=${payload.schemaName}`,
      payload,
      {
        responseType: "blob",
      },
    );
    return response.data;
  }

  const exportMutation = useMutation({
    mutationFn: exportRequest,
    onError: () => {
      toast.error(t("Export failed"));
    },
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "export.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t("Export successful"));
    },
  });

  return { exportDynamicItems: exportMutation.mutate };
}

export function useGetDynamicItems<T>(
  schemaName: string,
  filters?: FormElementsState,
) {
  const parts = [`schemaName=${schemaName}`];

  // Add filter parameters if provided
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          // Send each array value as a separate parameter with the same key
          // This creates: age=gt-32&age=lt-123
          value.forEach((item) => {
            if (item !== undefined && item !== null && item !== "") {
              const trimmedItem =
                typeof item === "string" ? item.trim() : String(item);
              parts.push(`${key}=${encodeURIComponent(trimmedItem)}`);
            }
          });
        } else if (value instanceof Date) {
          parts.push(`${key}=${value.toISOString()}`);
        } else {
          const trimmedValue =
            typeof value === "string" ? value.trim() : String(value);
          parts.push(`${key}=${encodeURIComponent(trimmedValue)}`);
        }
      }
    });
  }

  const queryString = parts.join("&");
  const path = `${BASE}?${queryString}`;
  const queryKey = filters
    ? (["dynamic", schemaName, "all", filters] as const)
    : listKey(schemaName);
  return useGet<T[]>(path, queryKey);
}

export function useGetPaginatedItems<T>(
  page: number,
  limit: number,
  schemaName: string,
  filters: FormElementsState,
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
    filters.search &&
      `search=${
        typeof filters.search === "string"
          ? filters.search.trim()
          : filters.search
      }`,
  ];

  // Add all other filter fields as query parameters
  Object.entries(filters).forEach(([key, value]) => {
    // Skip the standard pagination/sort/search fields
    if (
      !["sort", "asc", "search"].includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      if (Array.isArray(value)) {
        // For arrays, send each value as a separate query parameter with the same key
        // This creates: age=gt-32&age=lt-123
        value.forEach((item) => {
          if (item !== undefined && item !== null && item !== "") {
            const trimmedItem =
              typeof item === "string" ? item.trim() : String(item);
            parts.push(`${key}=${encodeURIComponent(trimmedItem)}`);
          }
        });
      } else if (value instanceof Date) {
        parts.push(`${key}=${value.toISOString()}`);
      } else {
        const trimmedValue =
          typeof value === "string" ? value.trim() : String(value);
        parts.push(`${key}=${encodeURIComponent(trimmedValue)}`);
      }
    }
  });

  const queryString = parts.filter(Boolean).join("&");
  const url = `${baseQueryUrl}?${queryString}`;

  return useGet<DynamicPayload<T>>(url, queryKey, true);
}

export function useGetTableSourceItems<T>(
  page: number,
  limit: number,
  binding: TableSourceBinding,
  filters: FormElementsState,
) {
  const sourceType = binding.kind || "schema";
  const schemaName = binding.schemaName || "";
  const baseQueryUrl = `${BASE}/table-source`;
  const queryKey = [
    "dynamic",
    schemaName,
    "table-source",
    sourceType,
    binding.pipelineName || "",
    binding.workflowName || "",
    { page, limit, filters, fields: binding.fields || [], params: binding.params || {} },
  ] as const;

  const parts = [
    `schemaName=${schemaName}`,
    `sourceType=${sourceType}`,
    binding.pipelineName && `pipelineName=${encodeURIComponent(binding.pipelineName)}`,
    binding.workflowName && `workflowName=${encodeURIComponent(binding.workflowName)}`,
    binding.fields?.length && `fields=${encodeURIComponent(binding.fields.join(","))}`,
    `page=${page}`,
    `limit=${limit}`,
    filters.sort && `sort=${filters.sort}`,
    filters.asc !== undefined && `asc=${filters.asc}`,
    filters.search &&
      `search=${
        typeof filters.search === "string"
          ? filters.search.trim()
          : filters.search
      }`,
  ];

  Object.entries({ ...(binding.params || {}), ...filters }).forEach(
    ([key, value]) => {
      if (
        !["sort", "asc", "search"].includes(key) &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== undefined && item !== null && item !== "") {
              const trimmedItem =
                typeof item === "string" ? item.trim() : String(item);
              parts.push(`${key}=${encodeURIComponent(trimmedItem)}`);
            }
          });
        } else if (value instanceof Date) {
          parts.push(`${key}=${value.toISOString()}`);
        } else {
          const trimmedValue =
            typeof value === "string" ? value.trim() : String(value);
          parts.push(`${key}=${encodeURIComponent(trimmedValue)}`);
        }
      }
    },
  );

  const queryString = parts.filter(Boolean).join("&");
  const url = `${baseQueryUrl}?${queryString}`;
  return useGet<DynamicPayload<T>>(url, queryKey, Boolean(schemaName));
}

export function useGetWorkflowData<T>(
  binding: Pick<TableSourceBinding, "schemaName" | "workflowName" | "params">,
) {
  const schemaName = binding.schemaName || "";
  const workflowName = binding.workflowName || "";
  const queryKey = [
    "dynamic",
    schemaName,
    "workflow",
    workflowName,
    binding.params || {},
  ] as const;

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await axiosClient.post<DynamicExecutionResponse<T>>(
        `${BASE}/workflow/${encodeURIComponent(workflowName)}?${qs({
          schemaName,
        })}`,
        { record: binding.params || {} },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    },
    enabled: Boolean(schemaName && workflowName),
  });

  return data?.data;
}

// utils/dynamic.ts (or wherever this lives)
export function useGetSelection<T>(
  schemaName: string,
  fieldName: string,
  valueField?: string,
) {
  // Only enable the request if both schemaName and fieldName are provided
  const enabled = Boolean(schemaName && fieldName);

  const path = `${BASE}/selection?${qs({ schemaName, fieldName, valueField })}`;

  const queryKey = [
    "dynamic",
    schemaName || "",
    "selection",
    fieldName || "",
    valueField || "",
  ] as const;

  const data = useGet<T>(path, queryKey, enabled);

  return (data ?? ([] as T)) as T;
}


export function useGetPipeline<T>(
  schemaName: string,
  pipelineName: string,
  additionalParams?: Record<string, unknown>,
) {
  const hasParams = Boolean(schemaName && pipelineName);

  const params: Record<string, unknown> = {
    schemaName,
    pipelineName,
    ...additionalParams,
  };

  const queryString = qs(params);
  const path = `${BASE}/pipeline?${queryString}`;

  const queryKey = [
    "dynamic",
    schemaName || "",
    "pipeline",
    pipelineName || "",
    additionalParams || {},
  ] as const;

  const enabled = hasParams;

  const data = useGet<T>(path, queryKey, enabled);

  return (data ?? ([] as T)) as T;
}
