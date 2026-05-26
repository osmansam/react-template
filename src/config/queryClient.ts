export const BASE_QUERY_STALE_TIME = 30_000;
export const BASE_QUERY_GC_TIME = 5 * 60_000;
export const BASE_QUERY_RETRY = 1;
export const BASE_QUERY_REFETCH_ON_WINDOW_FOCUS = false;
export const BASE_QUERY_REFETCH_ON_RECONNECT = true;

export const PAGE_QUERY_STALE_TIME = 60_000;
export const PAGE_QUERY_GC_TIME = 10 * 60_000;

export const SELECTION_QUERY_STALE_TIME = 5 * 60_000;
export const SELECTION_QUERY_GC_TIME = 15 * 60_000;

export const baseQueryOptions = {
  staleTime: BASE_QUERY_STALE_TIME,
  gcTime: BASE_QUERY_GC_TIME,
  refetchOnWindowFocus: BASE_QUERY_REFETCH_ON_WINDOW_FOCUS,
  refetchOnReconnect: BASE_QUERY_REFETCH_ON_RECONNECT,
  retry: BASE_QUERY_RETRY,
} as const;

export const pageQueryOptions = {
  staleTime: PAGE_QUERY_STALE_TIME,
  gcTime: PAGE_QUERY_GC_TIME,
  refetchOnWindowFocus: BASE_QUERY_REFETCH_ON_WINDOW_FOCUS,
  refetchOnReconnect: BASE_QUERY_REFETCH_ON_RECONNECT,
  retry: BASE_QUERY_RETRY,
} as const;

export const selectionQueryOptions = {
  staleTime: SELECTION_QUERY_STALE_TIME,
  gcTime: SELECTION_QUERY_GC_TIME,
  refetchOnWindowFocus: BASE_QUERY_REFETCH_ON_WINDOW_FOCUS,
  refetchOnReconnect: BASE_QUERY_REFETCH_ON_RECONNECT,
  retry: BASE_QUERY_RETRY,
} as const;
