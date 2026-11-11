import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ value: undefined as unknown, paths: [] as string[] }));
vi.mock("../../hooks/useTenantProject", () => ({
  useTenantProject: () => ({ tenant: "acme", project: "inventory" }),
}));
vi.mock("./factory", () => ({
  useGet: (path: string) => { transport.paths.push(path); return transport.value; },
}));

import { useContainer, useContainers, useContainerTypes, useGetContainers } from "./container";

describe("container metadata requests", () => {
  beforeEach(() => { transport.value = undefined; transport.paths = []; });

  it("loads runtime table metadata without requesting the management container endpoint", () => {
    transport.value = [{ id: "orders-1", schemaName: "orders", fields: [] }];
    expect(useGetContainers()).toMatchObject([{ schemaName: "orders" }]);
    expect(transport.paths).toEqual(["/runtime/schemas"]);
  });

  it("preserves computed field markers without needing server formulas", () => {
    transport.value = [{ id: "orders-1", schemaName: "orders", fields: [{ name: "total", type: "number", isComputed: true }] }];
    expect(useGetContainers()[0].fields[0]).toMatchObject({ name: "total", isComputed: true });
  });

  it("requests the container types suffix", () => {
    useContainerTypes();
    expect(transport.paths).toEqual(["/container/types"]);
  });

  it("requests the selected container by ID", () => {
    useContainer("orders-1");
    expect(transport.paths).toEqual(["/container/orders-1"]);
  });

  it("preserves workflow and frontend configuration in camel-case metadata", () => {
    transport.value = [{
      id: "orders-1", schemaName: "orders", fields: [],
      workflows: [{ name: "checkout", isActive: true }],
      frontend: { displayName: "Orders" },
    }];
    expect(useContainers()).toMatchObject([{
      id: "orders-1", schemaName: "orders", workflows: [{ name: "checkout", isActive: true }],
      frontend: { displayName: "Orders" },
    }]);
  });

  it("reads enveloped lists and normalizes legacy field metadata", () => {
    transport.value = { data: [{
      ID: "orders-1", SchemaName: "orders", Fields: [{
        Name: "customer", Type: "object", IsAuthorized: false, IsAuditIdentity: true,
        Children: [{ Name: "email", Type: "string" }],
      }],
    }] };
    expect(useContainers()).toMatchObject([{
      id: "orders-1", fields: [{
        name: "customer", type: "object", isAuthorized: false, isAuditIdentity: true,
        children: [{ name: "email", type: "string" }],
      }],
    }]);
  });

  it("reads nested detail envelopes without dropping false values", () => {
    transport.value = { data: { data: {
      ID: "orders-1", SchemaName: "orders", IsGoogleLoginActive: true, isGoogleLoginActive: false,
      Fields: [{ Name: "email", Type: "string", IsAuthorized: true, isAuthorized: false }],
    } } };
    expect(useContainer("orders-1")).toMatchObject({
      id: "orders-1", isGoogleLoginActive: false, fields: [{ name: "email", isAuthorized: false }],
    });
  });

  it("keeps valid metadata when a container has malformed fields", () => {
    transport.value = [
      { id: "one", schemaName: "orders", fields: [null, { name: "customer", type: "object", children: [null, { name: "email", type: "string" }] }] },
      { id: "two", schemaName: "products", fields: "invalid" },
    ];
    expect(useContainers()).toMatchObject([
      { id: "one", fields: [{ name: "customer", children: [{ name: "email", type: "string" }] }] },
      { id: "two", fields: [] },
    ]);
  });
});
