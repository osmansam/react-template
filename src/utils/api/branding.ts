import type { EffectiveBranding } from "../../types/branding";
import { axiosClient } from "./axiosClient";

export async function getRuntimeBranding(): Promise<EffectiveBranding> {
  const response = await axiosClient.get("/branding");
  return response.data.data || response.data;
}
