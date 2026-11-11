import axios from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import { getTableSourceQueryEntries, serializeQueryEntries } from "../../utils/dynamicQueryKeys";
import { encodeFilterValue, type CollectionDescriptor } from "./collectionPlan";

export const COLLECTION_TIMEOUT_MS = 15_000;

export type CollectionErrorKind = "auth" | "network" | "timeout" | "malformed" | "config" | "server";

export class CollectionError extends Error {
  readonly kind: CollectionErrorKind;
  readonly status?: number;
  constructor(kind: CollectionErrorKind, message: string, status?: number) {
    super(message);
    this.name = "CollectionError";
    this.kind = kind;
    this.status = status;
  }
  /** Auth and configuration failures never recover by repeating the same request. */
  get retryable(): boolean { return this.kind === "network" || this.kind === "timeout" || this.kind === "server"; }
}

export interface CollectionPage {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

/** Table-source request for the first page of a schema list. Records are filtered server-side. */
export function collectionRequestPath(descriptor: CollectionDescriptor): string {
  const filters: Record<string, unknown> = Object.create(null);
  for (const filter of descriptor.filters) {
    const value = encodeFilterValue(filter, descriptor.filterTypes?.[filter.field]);
    const previous = filters[filter.field];
    filters[filter.field] = previous === undefined ? value : [...(Array.isArray(previous) ? previous : [previous]), value];
  }
  if (descriptor.sort) {
    filters.sort = descriptor.sort.field;
    filters.asc = descriptor.sort.direction === "asc";
  }
  const entries = getTableSourceQueryEntries(1, descriptor.limit, { kind: "schema", schemaName: descriptor.schemaName }, filters);
  return `/dynamic/table-source?${serializeQueryEntries(entries)}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Validates the table-source envelope; a malformed payload is an error, never an empty success. */
export function parseCollectionPage(data: unknown, limit: number): CollectionPage {
  if (!isRecord(data) || !Array.isArray(data.items)) throw new CollectionError("malformed", "The data response was not in the expected format.");
  if (!data.items.every(isRecord)) throw new CollectionError("malformed", "The data response contained a row that is not a record.");
  const items = (data.items as Record<string, unknown>[]).slice(0, limit);
  const total = typeof data.totalItems === "number" && Number.isFinite(data.totalItems) ? data.totalItems : items.length;
  const page = typeof data.currentPage === "number" && Number.isFinite(data.currentPage) ? data.currentPage : 1;
  return { items, total, page, pageSize: limit };
}

export function classifyCollectionError(error: unknown): CollectionError {
  if (error instanceof CollectionError) return error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) return new CollectionError("auth", status === 401 ? "Sign in to view this content." : "You do not have access to this content.", status);
    if (status !== undefined && status >= 500) return new CollectionError("server", "The data service had a problem.", status);
    if (status !== undefined) return new CollectionError("config", "This data source is not set up correctly.", status);
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return new CollectionError("timeout", "The data took too long to load.");
    return new CollectionError("network", "The data could not be loaded. Check your connection.");
  }
  return new CollectionError("network", "The data could not be loaded.");
}

/** Fetches one collection through the scoped, authenticated runtime client with exact record keys. */
export async function fetchCollection(descriptor: CollectionDescriptor, signal?: AbortSignal, scope?: { tenant: string; project: string }): Promise<CollectionPage> {
  try {
    const response = await axiosClient.get<unknown>(collectionRequestPath(descriptor), {
      signal,
      timeout: COLLECTION_TIMEOUT_MS,
      preserveRecordKeys: true, runtimeScope: scope,
    });
    return parseCollectionPage(response.data, descriptor.limit);
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw classifyCollectionError(error);
  }
}

