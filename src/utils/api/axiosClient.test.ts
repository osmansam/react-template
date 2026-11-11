import axios, { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axiosClient } from "./axiosClient";

const originalAdapter = axios.defaults.adapter;
const originalClientAdapter = axiosClient.defaults.adapter;
const originalBaseURL = axiosClient.defaults.baseURL;
const backend = "https://api.example.test/api/v1";

function response(config: InternalAxiosRequestConfig, data: unknown = {}) : AxiosResponse {
  return { config, data, status: 200, statusText: "OK", headers: new AxiosHeaders() };
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError("Session expired", "ERR_BAD_REQUEST", config, undefined, {
    ...response(config, { message: "Session expired" }), status: 401, statusText: "Unauthorized",
  });
}

describe("project API session recovery", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", backend);
    vi.stubGlobal("window", { location: { pathname: "/t/acme/p/inventory/orders" } });
    axiosClient.defaults.baseURL = backend;
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    axiosClient.defaults.adapter = originalClientAdapter;
    axiosClient.defaults.baseURL = originalBaseURL;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retries the same scoped URL and preserves mutation data and headers", async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    axios.defaults.adapter = async (config) => response(config);
    axiosClient.defaults.adapter = async (config) => {
      requests.push(config);
      if (requests.length === 1) throw unauthorized(config);
      return response(config, { Item: { _id: "order-1", DisplayName: "Order" } });
    };

    const result = await axiosClient.post("/dynamic?schemaName=orders", { name: "Order" }, {
      headers: { "Idempotency-Key": "operation-1" },
    });

    expect(requests.map((request) => request.url)).toEqual([
      "/acme/inventory/dynamic?schemaName=orders", "/acme/inventory/dynamic?schemaName=orders",
    ]);
    expect(requests.map((request) => request.data)).toEqual(['{"name":"Order"}', '{"name":"Order"}']);
    expect(requests[1].headers.get("Idempotency-Key")).toBe("operation-1");
    expect(result.data).toEqual({ item: { _id: "order-1", displayName: "Order" } });
  });

  it("shares one pending refresh between concurrent requests in a project", async () => {
    const refreshes: InternalAxiosRequestConfig[] = [];
    const release: Array<() => void> = [];
    let attempts = 0;
    axios.defaults.adapter = (config) => {
      refreshes.push(config);
      return new Promise((resolve) => release.push(() => resolve(response(config))));
    };
    axiosClient.defaults.adapter = async (config) => {
      attempts++;
      if (attempts <= 3) throw unauthorized(config);
      return response(config, { ok: true });
    };

    const pending = Promise.all(["orders", "products", "stock"].map((schema) =>
      axiosClient.get(`/dynamic?schemaName=${schema}`),
    ));
    await vi.waitFor(() => expect(attempts).toBe(3));
    await vi.waitFor(() => expect(release.length).toBeGreaterThan(0));
    release.forEach((finish) => finish());
    await pending;

    expect(refreshes.map((request) => request.url)).toEqual([`${backend}/acme/inventory/auth/refresh`]);
    expect(attempts).toBe(6);
  });

  it("keeps refresh and retry in the original project after navigation", async () => {
    const refreshes: string[] = [];
    const requests: string[] = [];
    axios.defaults.adapter = async (config) => {
      refreshes.push(config.url || "");
      return response(config);
    };
    axiosClient.defaults.adapter = async (config) => {
      requests.push(config.url || "");
      if (requests.length === 1) {
        window.location.pathname = "/t/beta/p/reports/dashboard";
        throw unauthorized(config);
      }
      return response(config);
    };

    await axiosClient.get("/auth/session");

    expect(refreshes).toEqual([`${backend}/acme/inventory/auth/refresh`]);
    expect(requests).toEqual(["/acme/inventory/auth/session", "/acme/inventory/auth/session"]);
  });

  it.each([false, true])("reuses the refresh outcome for a delayed 401 (refresh fails: %s)", async (fails) => {
    const failure = new Error("Refresh rejected");
    let finishRefresh: (() => void) | undefined;
    let finishLateRequest: (() => void) | undefined;
    let refreshCount = 0;
    let initialRequests = 0;
    const retried = new Set<string>();
    axios.defaults.adapter = (config) => {
      refreshCount++;
      if (refreshCount > 1) return fails ? Promise.reject(failure) : Promise.resolve(response(config));
      return new Promise((resolve, reject) => {
        finishRefresh = () => fails ? reject(failure) : resolve(response(config));
      });
    };
    axiosClient.defaults.adapter = async (config) => {
      const url = config.url || "";
      if (!retried.has(url)) {
        retried.add(url);
        initialRequests++;
        if (url.includes("late")) await new Promise<void>((resolve) => { finishLateRequest = resolve; });
        throw unauthorized(config);
      }
      return response(config, { ok: true });
    };

    // Capture both outcomes immediately so the intentional rejection is handled.
    const early = axiosClient.get("/dynamic?schemaName=early").catch((error: unknown) => error);
    const late = axiosClient.get("/dynamic?schemaName=late").catch((error: unknown) => error);
    await vi.waitFor(() => expect(initialRequests).toBe(2));
    await vi.waitFor(() => expect(finishRefresh).toBeTypeOf("function"));
    finishRefresh?.();
    const earlyResult = await early;
    finishLateRequest?.();
    const lateResult = await late;

    if (fails) {
      expect(earlyResult).toBe(failure);
      expect(lateResult).toBe(failure);
    } else {
      expect(earlyResult).toMatchObject({ data: { ok: true } });
      expect(lateResult).toMatchObject({ data: { ok: true } });
    }
    expect(refreshCount).toBe(1);
  });

  it.each(["login", "register", "logout", "refresh", "login-config"])(
    "returns a failed %s request without refreshing", async (action) => {
      let refreshCount = 0;
      let failure: AxiosError | undefined;
      axios.defaults.adapter = async (config) => { refreshCount++; return response(config); };
      axiosClient.defaults.adapter = async (config) => { failure = unauthorized(config); throw failure; };

      await expect(axiosClient.post(`/auth/${action}`, { password: "incorrect" })).rejects.toBeInstanceOf(AxiosError);

      expect(failure?.response?.status).toBe(401);
      expect(refreshCount).toBe(0);
    },
  );

  it("stops after one refresh if the retried request is still unauthorized", async () => {
    let refreshCount = 0;
    let attempts = 0;
    axios.defaults.adapter = async (config) => { refreshCount++; return response(config); };
    axiosClient.defaults.adapter = async (config) => { attempts++; throw unauthorized(config); };

    await expect(axiosClient.get("/auth/session")).rejects.toBeInstanceOf(AxiosError);
    expect(attempts).toBe(2);
    expect(refreshCount).toBe(1);
  });

  it("propagates a failed refresh and permits a later recovery attempt", async () => {
    const failure = new Error("Refresh unavailable");
    let refreshCount = 0;
    let attempts = 0;
    axios.defaults.adapter = async (config) => {
      refreshCount++;
      if (refreshCount === 1) throw failure;
      return response(config);
    };
    axiosClient.defaults.adapter = async (config) => {
      attempts++;
      if (attempts <= 2) throw unauthorized(config);
      return response(config, { authenticated: true });
    };

    await expect(axiosClient.get("/auth/session")).rejects.toBe(failure);
    await expect(axiosClient.get("/auth/session")).resolves.toMatchObject({ data: { authenticated: true } });
    expect(refreshCount).toBe(2);
    expect(attempts).toBe(3);
  });

  it("preserves unauthorized errors with no request config", async () => {
    let failure: AxiosError | undefined;
    axiosClient.defaults.adapter = async (config) => {
      failure = new AxiosError("Missing config", "ERR_BAD_REQUEST", undefined, undefined, {
        ...response(config), status: 401,
      });
      throw failure;
    };

    const result = axiosClient.get("/dynamic");
    await expect(result).rejects.toMatchObject({ message: "Missing config" });
  });

  it("leaves legacy unscoped requests unchanged", async () => {
    window.location.pathname = "/login";
    axiosClient.defaults.adapter = async (config) => response(config, { url: config.url });
    await expect(axiosClient.get("/auth/session")).resolves.toMatchObject({ data: { url: "/auth/session" } });
  });

  it("does not try to repair a container write denial with a runtime session refresh", async () => {
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => response(config));
    axios.defaults.adapter = refresh;
    axiosClient.defaults.adapter = async (config) => { throw unauthorized(config); };
    await expect(axiosClient.post("/container", {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each(["/container", "/container/types", "/container/507f1f77bcf86cd799439011"])("refreshes a stale application session for the container metadata read %s", async (path) => {
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => response(config));
    axios.defaults.adapter = refresh;
    let attempts = 0;
    axiosClient.defaults.adapter = async (config) => { if (++attempts === 1) throw unauthorized(config); return response(config, []); };
    await expect(axiosClient.get(path)).resolves.toMatchObject({ status: 200 });
    expect(refresh).toHaveBeenCalledOnce();
    expect(attempts).toBe(2);
  });

  it("does not prefix an already scoped container request a second time", async () => {
    axiosClient.defaults.adapter = async (config) => response(config, { url: config.url });
    await expect(axiosClient.get("/acme/inventory/container/types")).resolves.toMatchObject({
      data: { url: "/acme/inventory/container/types" },
    });
  });

  it("captures the project before navigation can occur in the same turn", async () => {
    axiosClient.defaults.adapter = async (config) => response(config, { url: config.url });
    const request = axiosClient.get("/dynamic");
    window.location.pathname = "/t/beta/p/reports";
    await expect(request).resolves.toMatchObject({ data: { url: "/acme/inventory/dynamic" } });
  });

  it("refreshes different projects independently", async () => {
    const refreshes: string[] = [];
    const release: Array<() => void> = [];
    const firstAttempts = new Set<string>();
    axios.defaults.adapter = (config) => {
      refreshes.push(config.url || "");
      return new Promise((resolve) => release.push(() => resolve(response(config))));
    };
    axiosClient.defaults.adapter = async (config) => {
      const url = config.url || "";
      if (!firstAttempts.has(url)) { firstAttempts.add(url); throw unauthorized(config); }
      return response(config);
    };
    const first = axiosClient.get("/auth/session");
    await vi.waitFor(() => expect(firstAttempts.size).toBe(1));
    window.location.pathname = "/t/beta/p/reports";
    const second = axiosClient.get("/auth/session");
    await vi.waitFor(() => expect(firstAttempts.size).toBe(2));
    await vi.waitFor(() => expect(release).toHaveLength(2));
    release.forEach((finish) => finish());
    await Promise.all([first, second]);
    expect(refreshes).toEqual([
      `${backend}/acme/inventory/auth/refresh`, `${backend}/beta/reports/auth/refresh`,
    ]);
  });
});
