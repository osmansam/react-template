import { expect, it } from "vitest";
import { tableRequestConfig } from "./tableConfig";
import type { PageRequestSource } from "../../types/pageRequests";
it("uses the connected schema for both table metadata and mutations", () => {
 expect(tableRequestConfig({ kind: "schema", schemaName: "old" }, { transport: "table-source", kind: "schema", schemaName: "new" })).toEqual({ binding: { kind: "schema", schemaName: "new", pipelineName: undefined, workflowName: undefined }, mode: "paginated", schemaActions: true });
});
it("uses nonpaginated tables for transports without page controls", () => {
 for (const transport of ["list", "pipeline", "workflow", "selection"] as const) {
  const source: PageRequestSource = { transport, schemaName: "products", pipelineName: "summary", workflowName: "summary", fieldName: "name" };
  expect(tableRequestConfig(undefined, source).mode).toBe("unpaginated");
 }
});
