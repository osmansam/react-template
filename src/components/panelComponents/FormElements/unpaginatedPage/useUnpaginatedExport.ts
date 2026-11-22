import { useCallback, useState } from "react";
import { useExportDynamicItems } from "../../../../utils/dynamic";

export function useUnpaginatedExport({
  schemaName,
  requestFilters,
  searchValue,
}: {
  schemaName: string;
  requestFilters: Record<string, unknown>;
  searchValue: unknown;
}) {
  const { exportDynamicItems } = useExportDynamicItems();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExport = useCallback(
    (
      selectedFields: string[],
      includeSearch: boolean,
      includeFilters: boolean,
    ) => {
      exportDynamicItems({
        schemaName,
        fields: selectedFields,
        filters: includeFilters ? requestFilters : {},
        search: includeSearch ? String(searchValue || "") : "",
        limit: 0,
        page: 1,
      });
    },
    [exportDynamicItems, searchValue, requestFilters, schemaName],
  );

  return {
    isExportModalOpen,
    setIsExportModalOpen,
    handleExport,
  };
}
