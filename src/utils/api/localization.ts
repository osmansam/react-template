import type { AxiosRequestConfig } from "axios";
import { axiosClient } from "./axiosClient";

export type RuntimeLocaleSettings = {
  sourceLocale: string;
  defaultLocale: string;
  enabledLocales: string[];
  directionByLocale?: Record<string, "ltr" | "rtl">;
};

export async function getRuntimeLocaleSettings(config?: AxiosRequestConfig): Promise<RuntimeLocaleSettings> {
  const response = await axiosClient.get("/localization/settings", config);
  return response.data.data || response.data;
}

export type RuntimeTranslation = {
  sourceText: string;
  translatedText: string;
};

export type RuntimeTranslationPayload =
  | RuntimeTranslation[]
  | Record<string, string>;

export async function getRuntimeTranslations(locale: string, config?: AxiosRequestConfig): Promise<RuntimeTranslationPayload> {
  const response = await axiosClient.get("/localization/translations", { ...config, params: { ...config?.params, locale } });
  return response.data.data || response.data;
}

export async function saveRuntimeLocalePreference(locale: string, config?: AxiosRequestConfig): Promise<void> {
  await axiosClient.put("/localization/preference", { locale }, config);
}
