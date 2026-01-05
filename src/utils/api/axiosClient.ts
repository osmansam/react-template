import axios, { AxiosHeaders } from "axios";
import Cookies from "js-cookie";
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
});

export const ACCESS_TOKEN = "jwt";

axiosClient.interceptors.request.use(
  async (req) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    if (accessToken) {
      (req.headers as AxiosHeaders).set(
        "Authorization",
        `Bearer ${accessToken}`
      );
    }

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
  (error) => {
    if (error?.response?.data?.statusCode === 401) {
      Cookies.remove(ACCESS_TOKEN);
    }
    return Promise.reject(error);
  }
);
