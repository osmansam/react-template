import type { i18n } from "i18next";
import type { RuntimeTranslationPayload } from "../../utils/api/localization";

function legacyDisplayLabel(key: string): string {
  const label = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return label ? label[0].toUpperCase() + label.slice(1) : label;
}

export function catalogFromRuntimeTranslations(
  translations: RuntimeTranslationPayload,
): Record<string, string> {
  if (!Array.isArray(translations)) {
    return Object.fromEntries(
      Object.entries(translations).flatMap(([key, value]) => [
        [key, value],
        [legacyDisplayLabel(key), value],
      ]),
    );
  }
  return Object.fromEntries(
    translations.map(({ sourceText, translatedText }) => [sourceText, translatedText]),
  );
}

export function installRuntimeTranslations(
  instance: i18n,
  locale: string,
  catalog: Record<string, string>,
) {
  instance.addResourceBundle(locale, "translation", catalog, true, true);
}
