import axios, { AxiosHeaders, type AxiosAdapter } from "axios";
import { describe, expect, it } from "vitest";
import { createPageRepository } from "./pageRepository";
import { listVisualBlocks, readVisualBlock } from "./pageAdapter";
import { sampleDocument, samplePage, visualComponent } from "./testFixtures";

describe("page repository full save", () => {
  it("reloads the latest page, preserves unrelated changes and confirms persisted content", async () => {
    const client = axios.create(); let page = samplePage(); page.name = "Concurrent metadata edit";
    const requests: string[] = [];
    client.defaults.adapter = (async config => {
      requests.push(`${config.method} ${config.url}`);
      if (config.method === "patch") {
        const payload = JSON.parse(config.data);
        expect(payload).not.toHaveProperty("id"); expect(payload.name).toBe("Concurrent metadata edit");
        expect(payload.variables[0].initialValue).toBe("keep");
        page = { ...payload, id: "page-1" };
      }
      return { config, data: { data: { data: structuredClone(page) } }, status: 200, statusText: "OK", headers: new AxiosHeaders() };
    }) satisfies AxiosAdapter;
    const repo = createPageRepository({ tenant: "acme", project: "shop" }, client);
    const saved = await repo.save({ pageId: "page-1", target: { componentId: "visual", baseline: visualComponent, isNew: false }, value: { document: { ...sampleDocument, name: "New layout" } } });
    expect(requests).toEqual(["get /admin/page/page-1", "patch /admin/page/page-1", "get /admin/page/page-1"]);
    expect(readVisualBlock(listVisualBlocks(saved)[0]).document.name).toBe("New layout");
  });
  it("does not claim success when a backend response fails to retain the document", async () => {
    const client = axios.create(); const page = samplePage();
    client.defaults.adapter = async config => ({ config, data: { data: { data: page } }, status: 200, statusText: "OK", headers: new AxiosHeaders() });
    const repo = createPageRepository({ tenant: "acme", project: "shop" }, client);
    await expect(repo.save({ pageId: "page-1", target: { componentId: "visual", baseline: visualComponent, isNew: false }, value: { document: { ...sampleDocument, name: "Not retained" } } })).rejects.toThrow(/could not be confirmed/i);
  });
});
