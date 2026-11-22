import type { AxiosRequestConfig } from "axios";
import type { EffectiveBranding } from "../../types/branding";
import { axiosClient } from "./axiosClient";

export async function getRuntimeBranding(config?: AxiosRequestConfig): Promise<EffectiveBranding> {
  const response = await axiosClient.get("/branding", config);
  return response.data.data || response.data;
}
