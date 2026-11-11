import axios, { type InternalAxiosRequestConfig } from "axios";
import { normalizeResponse } from "./normalizeResponse";

declare module "axios" {
  interface AxiosRequestConfig {
    /**
     * Opt-out of response key normalization for endpoints whose payload carries user records
     * (for example visual collections), where field names must reach consumers exactly as stored.
     * The default stays normalized so existing consumers are unaffected.
     */
    preserveRecordKeys?: boolean;
    /** Host-resolved scope, pinned before queued query execution. */
    runtimeScope?: { tenant: string; project: string };
  }
}

// Helper to extract tenant and project from current URL
function getTenantAndProject(): { tenant: string; project: string } | null {
  if (typeof window === "undefined") return null;
  const match = /^\/t\/([^/]+)\/p\/([^/]+)(?:\/|$)/.exec(window.location.pathname);
  return match ? { tenant: match[1], project: match[2] } : null;
}

interface ProjectRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _projectScope?: { prefix: string; path: string; generation: number } | null;
}

interface RefreshState {
  generation: number;
  attempt?: { generation: number; promise: Promise<void> };
}

const refreshStates = new Map<string, RefreshState>();

function projectRefreshUrl(request: InternalAxiosRequestConfig, prefix: string) {
  return `${(request.baseURL || "").replace(/\/+$/, "")}${prefix}/auth/refresh`;
}

function getRefreshState(url: string): RefreshState {
  let state = refreshStates.get(url);
  if (!state) {
    state = { generation: 0 };
    refreshStates.set(url, state);
  }
  return state;
}

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  responseType: "json",
  withCredentials: true,
});

export const ACCESS_TOKEN = "jwt";

axiosClient.interceptors.request.use(
  (config) => {
    const req = config as ProjectRequestConfig;
    // Axios re-runs request interceptors during retry. Capture scope once so
    // navigation cannot move a pending request into a different project.
    if (req._projectScope !== undefined) return req;
    const tenantProject = req.runtimeScope ?? getTenantAndProject();
    req._projectScope = null;
    if (tenantProject && req.url && !/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(req.url)) {
      const prefix = `/${tenantProject.tenant}/${tenantProject.project}`;
      const url = req.url.startsWith("/") ? req.url : `/${req.url}`;
      const alreadyScoped = url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`);
      const path = alreadyScoped ? url.slice(prefix.length) : url;
      const state = getRefreshState(projectRefreshUrl(req, prefix));
      req._projectScope = { prefix, path, generation: state.generation };
      req.url = `${prefix}${path}`;
    }

    return req;
  },

  (err) => { throw err; },
  { synchronous: true },
);

axiosClient.interceptors.response.use(
  (response) => {
    // Transform response data from PascalCase to camelCase
    if (response.data && !response.config?.preserveRecordKeys) {
      response.data = normalizeResponse(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as ProjectRequestConfig | undefined;
    const scope = originalRequest?._projectScope;
    const is401 = error?.response?.status === 401 || error?.response?.data?.statusCode === 401;
    const authPath = scope?.path.split(/[?#]/, 1)[0];
    const isPublicAuth = authPath?.startsWith("/auth/") && authPath !== "/auth/session";
    // Only the read-only container metadata aliases accept an application
    // session. Mutations and management-only routes never refresh that session.
    const isContainerRead = originalRequest?.method?.toLowerCase() === "get" &&
      /^\/container(?:\/[^/]+)?\/?$/.test(authPath || "") && authPath?.replace(/\/$/, "") !== "/container/tenant";
    const isManagement = /^\/(?:container|admin|roles|tenant-auth)(?:\/|$)/.test(authPath || "") && !isContainerRead;
    if (!is401 || !originalRequest || !scope || originalRequest._retry || isPublicAuth || isManagement) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    const refreshUrl = projectRefreshUrl(originalRequest, scope.prefix);
    const state = getRefreshState(refreshUrl);
    try {
      // Keep one settled outcome as well as the in-flight attempt: an older
      // request's 401 can arrive after refresh completed or failed. Requests
      // dispatched after settlement get a new generation and may recover again.
      if (!state.attempt || state.attempt.generation < scope.generation) {
        const generation = state.generation;
        const promise = axios.post(refreshUrl, undefined, { withCredentials: true, timeout: 15000 })
          .then(() => undefined)
          .finally(() => { state.generation = generation + 1; });
        state.attempt = { generation, promise };
      }
      await state.attempt.promise;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);
