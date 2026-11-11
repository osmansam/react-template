import axios, { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axiosClient } from "../../utils/api/axiosClient";
import { classifyCollectionError, CollectionError, collectionRequestPath, fetchCollection, parseCollectionPage } from "./collectionFetch";
import { planCollection, type CollectionDescriptor } from "./collectionPlan";

const backend = "https://api.example.test/api/v1";
const originalAdapter = axiosClient.defaults.adapter;
const originalBaseURL = axiosClient.defaults.baseURL;

function descriptor(source: Parameters<typeof planCollection>[0], types?: Record<string, string>): CollectionDescriptor {
  const plan = planCollection(source, types);
  if (!plan.ok) throw new Error(plan.reason);
  return plan.descriptor;
}
const base = { kind: "autotable" as const, schemaName: "products", limit: 20 };

function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, status: 200, statusText: "OK", headers: new AxiosHeaders() };
}
function failure(config: InternalAxiosRequestConfig, status: number): AxiosError {
  return new AxiosError("failed", "ERR_BAD_REQUEST", config, undefined, { ...ok(config, {}), status, statusText: "x" });
}

describe("collection request path", () => {
  it("encodes limit, page, source type, filters and one sort", () => {
    const path = collectionRequestPath(descriptor({
      ...base, limit: 5,
      filters: [{ field: "stock", operator: "eq", value: 0 }, { field: "active", operator: "eq", value: false }, { field: "status", operator: "in", value: ["new", "sale"] }],
      sort: [{ field: "price", direction: "desc" }],
    }, { stock: "int", active: "bool", status: "enum" }));
    const url = new URL(`https://x.test${path}`);
    expect(url.pathname).toBe("/dynamic/table-source");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      schemaName: "products", sourceType: "schema", page: "1", limit: "5",
      stock: "0", active: "false", status: "new,sale", sort: "price", asc: "false",
    });
  });
  it("omits sort and filters when absent", () => {
    const url = new URL(`https://x.test${collectionRequestPath(descriptor(base))}`);
    expect([...url.searchParams.keys()].sort()).toEqual(["limit", "page", "schemaName", "sourceType"]);
  });
});

describe("collection response", () => {
  it("validates the envelope and bounds the page", () => {
    expect(parseCollectionPage({ items: [{ _id: "1" }, { _id: "2" }, { _id: "3" }], totalItems: 40, currentPage: 1 }, 2)).toEqual({ items: [{ _id: "1" }, { _id: "2" }], total: 40, page: 1, pageSize: 2 });
    expect(parseCollectionPage({ items: [] }, 20)).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });
  it.each([[null], ["text"], [{}], [{ items: "x" }], [{ items: [1] }], [{ items: [null] }], [{ items: [[]] }]])("rejects malformed payload %j", (payload) => {
    expect(() => parseCollectionPage(payload, 20)).toThrow(CollectionError);
  });
  it("classifies failures", () => {
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    expect(classifyCollectionError(failure(config, 401))).toMatchObject({ kind: "auth", retryable: false });
    expect(classifyCollectionError(failure(config, 403))).toMatchObject({ kind: "auth", retryable: false });
    expect(classifyCollectionError(failure(config, 400))).toMatchObject({ kind: "config", retryable: false });
    expect(classifyCollectionError(failure(config, 503))).toMatchObject({ kind: "server", retryable: true });
    expect(classifyCollectionError(new AxiosError("t", "ECONNABORTED", config))).toMatchObject({ kind: "timeout", retryable: true });
    expect(classifyCollectionError(new AxiosError("n", "ERR_NETWORK", config))).toMatchObject({ kind: "network", retryable: true });
  });
});

describe("fetchCollection through the runtime client", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { pathname: "/t/acme/p/shop/catalog" } });
    axiosClient.defaults.baseURL = backend;
  });
  afterEach(() => {
    axiosClient.defaults.adapter = originalAdapter;
    axiosClient.defaults.baseURL = originalBaseURL;
    vi.unstubAllGlobals();
  });

  it("uses the project-scoped URL and keeps record keys and values exact", async () => {
    const seen: InternalAxiosRequestConfig[] = [];
    const record = { _id: "p1", ProductSKU: "A-1", image_url: "https://img/1.png", "weird-key": 0, nested: { Inner_Key: false }, price: 0 };
    axiosClient.defaults.adapter = async (config) => { seen.push(config); return ok(config, { items: [record], totalItems: 1, totalPages: 1, currentPage: 1 }); };
    const page = await fetchCollection(descriptor(base));
    expect(seen[0].url).toMatch(/^\/acme\/shop\/dynamic\/table-source\?/);
    expect(seen[0].timeout).toBe(15_000);
    expect(page.items[0]).toEqual(record);
    expect(Object.keys(page.items[0])).toEqual(["_id", "ProductSKU", "image_url", "weird-key", "nested", "price"]);
  });

  it("leaves default client responses normalized for every other consumer", async () => {
    axiosClient.defaults.adapter = async (config) => ok(config, { Items: [{ ProductSKU: "A-1" }] });
    const { data } = await axiosClient.get("/dynamic/table-source?schemaName=products");
    expect(data).toEqual({ items: [{ productSku: "A-1" }] });
  });

  it("propagates abort as cancellation, not as a data error", async () => {
    const controller = new AbortController();
    axiosClient.defaults.adapter = async (config) => { throw new axios.CanceledError("canceled", undefined, config); };
    controller.abort();
    await expect(fetchCollection(descriptor(base), controller.signal)).rejects.toSatisfy((error) => axios.isCancel(error));
  });

  it("turns HTTP and envelope failures into typed errors", async () => {
    axiosClient.defaults.adapter = async (config) => { throw failure(config, 403); };
    await expect(fetchCollection(descriptor(base))).rejects.toMatchObject({ kind: "auth" });
    axiosClient.defaults.adapter = async (config) => ok(config, { items: "nope" });
    await expect(fetchCollection(descriptor(base))).rejects.toMatchObject({ kind: "malformed" });
  });
});

it("encodes repeated field bounds and date equality through the existing table-source query serializer", () => {
 const value = descriptor({ ...base, filters: [{ field: "price", operator: "gte", value: -0.5 }, { field: "price", operator: "lt", value: 3.25 }, { field: "created", operator: "eq", value: "2026-11-01" }] }, { price: "float", created: "date" });
 const query = new URL("https://x.test" + collectionRequestPath(value)).searchParams;
 expect(query.getAll("price")).toEqual(["gte--0.5", "lt-3.25"]);
 expect(query.get("created")).toBe("eq-2026-11-01");
});

it("does not treat inherited Object properties as existing filter bounds", () => {
 const planned = planCollection({ kind: "autotable", schemaName: "products", limit: 20, filters: [{ field: "constructor", operator: "gte", value: 5 }, { field: "constructor", operator: "lt", value: 10 }, { field: "toString", operator: "eq", value: "record" }] }, { constructor: "int", toString: "string" });
 expect(planned.ok).toBe(true);
 if (!planned.ok) return;
 const query = new URL(collectionRequestPath(planned.descriptor), "http://fixture").searchParams;
 expect(query.getAll("constructor")).toEqual(["gte-5", "lt-10"]);
 expect(query.getAll("toString")).toEqual(["record"]);
});
