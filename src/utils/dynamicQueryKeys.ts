export type DynamicTableSourceBinding = {
  kind?: "schema" | "pipeline" | "workflow";
  schemaName?: string;
  pipelineName?: string;
  workflowName?: string;
  fields?: string[];
  params?: Record<string, unknown>;
};

export function getTableSourceQueryKey(
  page: number,
  limit: number,
  binding: DynamicTableSourceBinding,
  filters: Record<string, unknown>,
  resolvedParams?: Record<string, unknown>,
) {
  const mergedParams = {
    ...(binding.params || {}),
    ...(resolvedParams || {}),
  };

  return [
    "dynamic",
    binding.schemaName || "",
    "table-source",
    binding.kind || "schema",
    binding.pipelineName || "",
    binding.workflowName || "",
    {
      page,
      limit,
      filters,
      fields: binding.fields || [],
      params: mergedParams,
    },
  ] as const;
}

export function shouldInvalidateDynamicQuery(
  queryKey: readonly unknown[],
  schemaName: string,
) {
  return (
    queryKey[0] === "dynamic" &&
    (queryKey[1] === schemaName || queryKey[2] === "table-source")
  );
}
