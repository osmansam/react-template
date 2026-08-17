import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTenantProject } from "../../hooks/useTenantProject";
import {
  getRuntimeLocaleSettings,
  getRuntimeTranslations,
  saveRuntimeLocalePreference,
} from "../../utils/api/localization";
import { resolveProjectLocale } from "./localeResolution";
import {
  catalogFromRuntimeTranslations,
  installRuntimeTranslations,
} from "./runtimeTranslations";

const RTL = new Set(["ar", "fa", "he", "ur"]);

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { tenant, project } = useTenantProject();
  const storageKey = `project-locale:${tenant || ""}:${project || ""}`;
  const settings = useQuery({
    queryKey: ["localization-settings", tenant, project],
    queryFn: getRuntimeLocaleSettings,
    enabled: Boolean(tenant && project),
  });
  const enabled = settings.data?.enabledLocales || [];
  const initial = useMemo(() => settings.data
    ? resolveProjectLocale(enabled, localStorage.getItem(storageKey), settings.data.defaultLocale, settings.data.sourceLocale)
    : "", [settings.data, enabled, storageKey]);
  const [locale, setLocale] = useState("");
  const translations = useQuery({
    queryKey: ["runtime-translations", tenant, project, locale],
    queryFn: () => getRuntimeTranslations(locale),
    enabled: Boolean(tenant && project && locale),
  });

  useEffect(() => {
    if (initial && !locale) setLocale(initial);
  }, [initial, locale]);

  useEffect(() => {
    if (!locale) return;
    void i18n.changeLanguage(locale);
    localStorage.setItem(storageKey, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL.has(locale.split("-")[0]) ? "rtl" : "ltr";
  }, [i18n, locale, storageKey]);

  useEffect(() => {
    if (!locale || !translations.data) return;
    installRuntimeTranslations(
      i18n,
      locale,
      catalogFromRuntimeTranslations(translations.data),
    );
    void i18n.changeLanguage(locale);
  }, [i18n, locale, translations.data]);

  if (enabled.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        className="rounded-md border border-neutral-300 bg-white px-2 py-1.5"
        value={locale || initial}
        onChange={(event) => {
          const next = event.target.value;
          setLocale(next);
          void saveRuntimeLocalePreference(next).catch(() => undefined);
        }}
      >
        {enabled.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
      </select>
    </label>
  );
}
