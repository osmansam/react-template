export function resolveProjectLocale(
  enabled: string[],
  saved: string | null,
  defaultLocale: string,
  sourceLocale: string,
  browserLocale = globalThis.navigator?.language || "",
): string {
  if (saved && enabled.includes(saved)) return saved;
  const browserMatch = browserLocale
    ? enabled.find((locale) => locale === browserLocale || locale.split("-")[0] === browserLocale.split("-")[0])
    : undefined;
  if (browserMatch) return browserMatch;
  if (enabled.includes(defaultLocale)) return defaultLocale;
  if (enabled.includes(sourceLocale)) return sourceLocale;
  return enabled[0] || sourceLocale || "en";
}
