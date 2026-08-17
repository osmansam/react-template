import axios from "axios";
import { camelCase, isArray, isPlainObject, transform } from "lodash";

// Recursively convert all keys in an object from PascalCase to camelCase
// Special handling: preserve _id fields (don't convert to id)
function toCamelCase(obj: unknown): unknown {
  if (isArray(obj)) {
    return obj.map((item) => toCamelCase(item));
  }

  if (isPlainObject(obj)) {
    return transform(
      obj as Record<string, unknown>,
      (result: Record<string, unknown>, value: unknown, key: string) => {
        // Preserve _id as-is (don't convert to id)
        const camelKey = key === "_id" ? "_id" : camelCase(key);
        result[camelKey] = toCamelCase(value);
      }
    );
  }

  return obj;
}

// Helper to extract tenant and project from current URL
function getTenantAndProject(): { tenant: string; project: string } | null {
  const pathParts = window.location.pathname.split("/");
  const tIndex = pathParts.indexOf("t");
  const pIndex = pathParts.indexOf("p");

  if (
    tIndex !== -1 &&
    pIndex !== -1 &&
    pathParts[tIndex + 1] &&
    pathParts[pIndex + 1]
  ) {
    return {
      tenant: pathParts[tIndex + 1],
      project: pathParts[pIndex + 1],
    };
  }

  return null;
}

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  responseType: "json",
  withCredentials: true,
});

export const ACCESS_TOKEN = "jwt";

axiosClient.interceptors.request.use(
  async (req) => {
    // Inject tenant and project into the URL path
    const tenantProject = getTenantAndProject();
    if (tenantProject && req.url) {
      // Prepend tenant/project to the URL path
      req.url = `/${tenantProject.tenant}/${tenantProject.project}${req.url}`;
    }

    return req;
  },

  (err) => Promise.reject(err)
);

axiosClient.interceptors.response.use(
  (response) => {
    // Transform response data from PascalCase to camelCase
    if (response.data) {
      response.data = toCamelCase(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const is401 = error?.response?.status === 401 || error?.response?.data?.statusCode === 401;
    if (!is401 || originalRequest?._retry || originalRequest?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    const context = getTenantAndProject();
    if (!context) return Promise.reject(error);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/${context.tenant}/${context.project}/auth/refresh`,
        undefined,
        { withCredentials: true },
      );
      return axiosClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);
