import { describe, expect, it } from "vitest";
import { getSelectionQueryConfig } from "./selectionQuery";

describe("getSelectionQueryConfig", () => {
  it("uses the same key for the same selection request across callers", () => {
    const first = getSelectionQueryConfig({
      schemaName: "product",
      fieldName: "name",
    });
    const second = getSelectionQueryConfig({
      schemaName: "product",
      fieldName: "name",
    });

    expect(first.queryKey).toEqual(second.queryKey);
    expect(first.path).toBe("/dynamic/selection?schemaName=product&fieldName=name");
  });

  it("separates otherwise identical requests by tenant and project scope", () => {
    const first = getSelectionQueryConfig({
      schemaName: "product",
      fieldName: "name",
      tenantSlug: "acme",
      projectSlug: "retailerv2",
    });
    const second = getSelectionQueryConfig({
      schemaName: "product",
      fieldName: "name",
      tenantSlug: "beta",
      projectSlug: "retailerv2",
    });

    expect(first.queryKey).not.toEqual(second.queryKey);
  });

  it("serializes select-route request filters with a filter prefix", () => {
    const config = getSelectionQueryConfig({
      schemaName: "product",
      fieldName: "name",
      filterParams: {
        active: true,
        category: "featured",
      },
    });

    expect(config.path).toBe(
      "/dynamic/selection?schemaName=product&fieldName=name&filter.active=true&filter.category=featured",
    );
    expect(config.queryKey).toContainEqual({
      active: true,
      category: "featured",
    });
  });

  it("serializes array filter values as repeated query parameters", () => {
    const config = getSelectionQueryConfig({
      schemaName: "count_lists",
      fieldName: "title",
      filterParams: {
        location: ["loc-1", "loc-2"],
        tier: 0,
        archived: false,
      },
    });

    expect(config.path).toBe(
      "/dynamic/selection?schemaName=count_lists&fieldName=title&filter.archived=false&filter.location=loc-1&filter.location=loc-2&filter.tier=0",
    );
  });

  it("serializes stable dependency fields", () => {
    const config = getSelectionQueryConfig({ schemaName: "product", fieldName: "name", dataFields: ["taxRate", "price", "discountRate", "price"] });
    expect(config.path).toBe("/dynamic/selection?schemaName=product&fieldName=name&dataFields=discountRate%2Cprice%2CtaxRate");
    expect(config.queryKey).toContain("discountRate,price,taxRate");
  });
});
