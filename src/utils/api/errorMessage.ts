const FALLBACK_ERROR_MESSAGE = "An unexpected error occurred";

export function getApiErrorMessage(
  error: unknown,
  fallback = FALLBACK_ERROR_MESSAGE,
): string {
  if (!error || typeof error !== "object") return fallback;

  const responseMessage = (
    error as { response?: { data?: { message?: unknown } } }
  ).response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  const errorMessage = (error as { message?: unknown }).message;
  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage;
  }

  return fallback;
}

export function notifyApiError(
  error: unknown,
  translate: (message: string) => string,
  notify: (message: string) => unknown,
  fallback?: string,
): void {
  notify(translate(getApiErrorMessage(error, fallback)));
}
