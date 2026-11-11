import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutoTableCollectionSource, ComponentNode } from "../../visual-engine/model";
import { axiosClient } from "../../utils/api/axiosClient";
import { CollectionError } from "./collectionFetch";
import { planCollection, planDocumentCollections, type CollectionDescriptor } from "./collectionPlan";
import { assembleCollections, collectionQueryKey, collectionQueryOptions, collectionState, shouldRetryCollection, type CollectionQuerySnapshot } from "./collectionQuery";
import { resolveCollectionIdentity } from "./useVisualCollections";

const base: AutoTableCollectionSource = { kind: "autotable", schemaName: "products", limit: 20 };
const descriptor = (source: AutoTableCollectionSource = base, types?: Record<string, string>): CollectionDescriptor => {
  const plan = planCollection(source, types);
  if (!plan.ok) throw new Error(plan.reason);
  return plan.descriptor;
};
const page = (n: number) => ({ items: Array.from({ length: n }, (_, i) => ({ _id: String(i) })), total: n, page: 1, pageSize: 20 });
const refetch = vi.fn();

describe("collection state mapping", () => {
  it("maps pending, empty, success and error", () => {
    expect(collectionState({ status: "pending", refetch })).toMatchObject({ status: "loading" });
    expect(collectionState({ status: "success", data: page(0), refetch })).toMatchObject({ status: "empty", message: "No items to display." });
    expect(collectionState({ status: "success", data: page(3), refetch })).toMatchObject({ status: "success" });
    const error = collectionState({ status: "error", error: new CollectionError("auth", "x", 401), refetch });
    expect(error).toMatchObject({ status: "error", message: "Sign in to view this content.", reason: "auth" });
    error.onRetry?.();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it("discloses the first page and configured limit alongside the total count", () => {
    expect(collectionState({ status: "success", data: { ...page(5), total: 100 }, refetch }).message).toContain("5 of 100");
    expect(collectionState({ status: "success", data: { ...page(5), total: 100 }, refetch }).message).toContain("first page, up to 20");
  });
  it("reads a failed refresh as an error even though earlier data exists", () => {
    expect(collectionState({ status: "error", data: page(5), error: new CollectionError("auth", "x", 403), refetch }).status).toBe("error");
  });
  it("retries transient failures once and never auth or config failures", () => {
    expect(shouldRetryCollection(0, new CollectionError("network", "x"))).toBe(true);
    expect(shouldRetryCollection(1, new CollectionError("network", "x"))).toBe(false);
    expect(shouldRetryCollection(0, new CollectionError("server", "x", 503))).toBe(true);
    expect(shouldRetryCollection(0, new CollectionError("auth", "x", 401))).toBe(false);
    expect(shouldRetryCollection(0, new CollectionError("config", "x", 400))).toBe(false);
    expect(shouldRetryCollection(0, new CollectionError("malformed", "x"))).toBe(false);
    expect(shouldRetryCollection(0, new Error("boom"))).toBe(false);
  });
});

describe("session identity", () => {
  it("is anonymous only when signed out and unresolved when a signed-in marker has no user yet", () => {
    expect(resolveCollectionIdentity("u1", true)).toBe("u1");
    expect(resolveCollectionIdentity(undefined, false)).toBe("anonymous");
    expect(resolveCollectionIdentity(undefined, true)).toBeUndefined();
  });
});

describe("assembleCollections", () => {
  const repeater = (id: string, source: AutoTableCollectionSource, children: ComponentNode[] = []) => ({ id, type: "repeater", source, itemAlias: "item", children: [{ id: `${id}-s`, type: "slot", name: "item", children }] }) as ComponentNode;
  const doc = (...nodes: ComponentNode[]) => ({ id: "root", type: "section", children: nodes }) as ComponentNode;
  const ok = (n: number): CollectionQuerySnapshot => ({ status: "success", data: page(n), refetch });

  it("resolves records by source key and reports each repeater on its own", () => {
    const plan = planDocumentCollections(doc(repeater("a", base), repeater("b", { ...base, limit: 3 })));
    const result = assembleCollections(plan, [ok(2), { status: "error", error: new CollectionError("network", "x"), refetch }]);
    expect(Object.keys(result.resolvedCollections)).toEqual([plan.repeaters[0].sourceKey]);
    expect(result.collectionStates.a).toMatchObject({ status: "success", message: expect.stringContaining("first page") });
    expect(result.collectionStates.b).toMatchObject({ status: "error" });
  });
  it("fills every repeater that shares one descriptor from a single result", () => {
    const reordered: AutoTableCollectionSource = { ...base, filters: [{ field: "b", operator: "eq", value: "1" }, { field: "a", operator: "eq", value: "2" }] };
    const sameQuery: AutoTableCollectionSource = { ...base, filters: [...reordered.filters!].reverse() };
    const plan = planDocumentCollections(doc(repeater("a", reordered), repeater("b", sameQuery)), { products: { a: "string", b: "string" } });
    expect(plan.descriptors).toHaveLength(1);
    const result = assembleCollections(plan, [ok(2)]);
    expect(result.collectionStates.a.status).toBe("success");
    expect(result.collectionStates.b.status).toBe("success");
    expect(Object.keys(result.resolvedCollections)).toHaveLength(2);
  });
  it("shows unplannable repeaters as configuration errors, or loading while metadata loads", () => {
    const filtered: AutoTableCollectionSource = { ...base, filters: [{ field: "name", operator: "eq", value: "x" }] };
    const plan = planDocumentCollections(doc(repeater("a", filtered)));
    expect(assembleCollections(plan, []).collectionStates.a).toMatchObject({ status: "error", message: "This content is not set up correctly." });
    expect(assembleCollections(plan, [], { metadataPending: new Set(["products"]) }).collectionStates.a.status).toBe("loading");
  });
  it("never reports records while waiting for the session", () => {
    const plan = planDocumentCollections(doc(repeater("a", base)));
    const result = assembleCollections(plan, [ok(2)], { waiting: true });
    expect(result.collectionStates.a.status).toBe("loading");
    expect(result.resolvedCollections).toEqual({});
  });
});

describe("collection queries on the shared client", () => {
  const scope = { tenant: "acme", project: "shop", identity: "u1" };
  const originalAdapter = axiosClient.defaults.adapter;
  const originalBaseURL = axiosClient.defaults.baseURL;
  let urls: string[];
  beforeEach(() => {
    urls = [];
    vi.stubGlobal("window", { location: { pathname: "/t/acme/p/shop/catalog" } });
    axiosClient.defaults.baseURL = "https://api.example.test/api/v1";
    axiosClient.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      urls.push(config.url ?? "");
      return { config, data: { items: [{ _id: "1" }], totalItems: 1, currentPage: 1 }, status: 200, statusText: "OK", headers: new AxiosHeaders() };
    };
  });
  afterEach(() => { axiosClient.defaults.adapter = originalAdapter; axiosClient.defaults.baseURL = originalBaseURL; vi.unstubAllGlobals(); });

  it("shares one request between observers of the same descriptor", async () => {
    const client = new QueryClient();
    const options = collectionQueryOptions(scope, descriptor());
    const a = new QueryObserver(client, options);
    const b = new QueryObserver(client, collectionQueryOptions(scope, descriptor()));
    const ua = a.subscribe(() => undefined); const ub = b.subscribe(() => undefined);
    await client.fetchQuery(options);
    expect(urls).toHaveLength(1);
    ua(); ub();
  });
  it("does not share records across filters, identities or projects", async () => {
    const client = new QueryClient();
    const types = { name: "string" };
    await client.fetchQuery(collectionQueryOptions(scope, descriptor()));
    await client.fetchQuery(collectionQueryOptions(scope, descriptor({ ...base, filters: [{ field: "name", operator: "eq", value: "x" }] }, types)));
    await client.fetchQuery(collectionQueryOptions({ ...scope, identity: "u2" }, descriptor()));
    await client.fetchQuery(collectionQueryOptions({ ...scope, project: "other" }, descriptor()));
    expect(urls).toHaveLength(4);
    expect(collectionQueryKey(scope, descriptor())).not.toEqual(collectionQueryKey({ ...scope, identity: "anonymous" }, descriptor()));
  });
  it("serves a fresh cached result without a second request", async () => {
    const client = new QueryClient();
    await client.fetchQuery(collectionQueryOptions(scope, descriptor()));
    await client.fetchQuery(collectionQueryOptions(scope, descriptor()));
    expect(urls).toHaveLength(1);
  });
  it("does not retry an authorization failure", async () => {
    const client = new QueryClient();
    axiosClient.defaults.adapter = async (config) => { urls.push(config.url ?? ""); throw new AxiosError("no", "ERR_BAD_REQUEST", config, undefined, { config, data: {}, status: 403, statusText: "x", headers: new AxiosHeaders() }); };
    await expect(client.fetchQuery(collectionQueryOptions(scope, descriptor()))).rejects.toMatchObject({ kind: "auth" });
    expect(urls).toHaveLength(1);
  });
});

