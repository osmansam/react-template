import { describe, expect, it } from "vitest";
import { normalizeResponse } from "../utils/api/normalizeResponse";
import { axiosClient } from "../utils/api/axiosClient";
import { AxiosHeaders } from "axios";

describe("authored visual JSON", () => {
  const visual = { document: { version: 2, "--custom-token": "kept", effects: { "light-rays": { ProductSKU: "CaseSensitive" } }, bindings: { text: { path: ["ProductSKU"] } } }, theme: { palettes: { light: { "primary-foreground": "#ffffff" } } } };
  it("normalizes legacy metadata while preserving all authored visual keys", () => {
    expect(normalizeResponse({ ID: "p", Sections: [{ Component: { Props: { VisualBuilder: visual } } }] })).toEqual({ id: "p", sections: [{ component: { props: { visualBuilder: visual } } }] });
  });
  it("preserves visual JSON through the actual runtime Axios interceptor", async () => {
    const result = await axiosClient.get("/page", { adapter: async config => ({ config, data: [{ Name: "Inventory", sections: [{ component: { props: { visualBuilder: visual } } }] }], headers: new AxiosHeaders(), status: 200, statusText: "OK" }) });
    expect(result.data[0].sections[0].component.props.visualBuilder).toEqual(visual);
    expect(result.data[0].name).toBe("Inventory");
  });
});


it("preserves request slot identities while normalizing connection metadata", async () => {
 const response = await axiosClient.get("/page", { adapter: async config => ({ config, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: { Name: "Catalog", Sections: [{ Component: { ID: "visual", Type: "custom", RequestBindings: { "collection:Catalog_Rows": { RequestId: "Products_MAIN" }, "dataset:dataset_15476fa8": { RequestId: "old" } } } }] } }) });
 expect(response.data.sections[0].component.requestBindings).toEqual({ "collection:Catalog_Rows": { requestId: "Products_MAIN" }, "dataset:dataset_15476fa8": { requestId: "old" } });
});
