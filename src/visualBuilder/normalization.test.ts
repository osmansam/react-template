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
