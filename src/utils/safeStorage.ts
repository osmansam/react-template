/** Optional browser preferences must not prevent the application from rendering. */
export function getStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function setStoredValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* The mounted control still retains its state. */
  }
}
export function readStoredJson<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => value is T,
): T {
  try {
    const value: unknown = JSON.parse(getStoredValue(key) ?? "null");
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
