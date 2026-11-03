import axios, { type InternalAxiosRequestConfig } from "axios";
import type { ProjectScope } from "./types";

interface ManagementRequest extends InternalAxiosRequestConfig { _managementRetry?: boolean; _managementGeneration?: number }
interface RefreshState { generation: number; attempt?: { generation: number; promise: Promise<void> } }
const refreshes = new Map<string, RefreshState>();

export function createManagementClient(scope: ProjectScope, baseURL = import.meta.env.VITE_API_URL) {
  if (!scope.tenant || !scope.project) throw new Error("Tenant and project are required for visual editing.");
  const prefix = `/${encodeURIComponent(scope.tenant)}/${encodeURIComponent(scope.project)}`;
  const key = `${baseURL ?? ""}${prefix}`;
  const state = refreshes.get(key) ?? { generation: 0 };
  refreshes.set(key, state);
  const client = axios.create({ baseURL, withCredentials: true, responseType: "json" });
  client.interceptors.request.use(config => {
    const request = config as ManagementRequest;
    if (request._managementGeneration !== undefined) return request;
    // This client only accepts its own management resources, never arbitrary URLs.
    if (!request.url?.startsWith("/admin/page")) throw new Error("Unsupported visual management resource.");
    request.url = `${prefix}${request.url}`;
    request._managementGeneration = state.generation;
    return request;
  }, undefined, { synchronous: true });
  client.interceptors.response.use(response => {
    return response;
  }, async error => {
    const request = error.config as ManagementRequest | undefined;
    if (error.response?.status !== 401 || !request || request._managementRetry) throw error;
    request._managementRetry = true;
    const generation = request._managementGeneration ?? 0;
    if (state.generation <= generation) {
      if (!state.attempt || state.attempt.generation < generation) {
        const promise = axios.request({ baseURL, method: "POST", url: `${prefix}/tenant-auth/refresh`, withCredentials: true, adapter: client.defaults.adapter })
          .then(() => undefined).finally(() => { state.generation = generation + 1; });
        state.attempt = { generation, promise };
      }
      await state.attempt.promise;
    } else if (state.attempt && state.attempt.generation === generation) {
      await state.attempt.promise;
    }
    return client(request);
  });
  return client;
}
export function managementErrorMessage(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 401) return "Management sign-in is required. Sign in to Tenant Panel, open this project there, then retry here.";
  if (status === 403) return "Your management session cannot perform this action. Check that you opened this project in Tenant Panel and have the required project permission.";
  if (status === 404) return "This page or project is no longer available. Reload the page list.";
  if (axios.isAxiosError(error)) return "The management API could not complete this request. Check the connection and try again; your edits are still here.";
  return error instanceof Error ? error.message : "The visual builder could not complete this action.";
}
