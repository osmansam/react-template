import { useEffect, useMemo, useState } from "react";
import type { FormElementsState } from "../../../../types";
import type { TableComponentConfig } from "../../../../types/page";
import {
  getFilterDefaultValues,
  useFilterPanelSelectionData,
} from "../../../../utils/tableFilters";
import { resolveTableDragState } from "../../../../utils/tableRowReorder";
import { createTableToggleState } from "../../../../utils/tableToggles";
import { buildFiltersById, buildRequestFilters } from "./pageHelpers";

export function useUnpaginatedTableFilters({
  tableConfig,
  constantFilter,
  resolvedParams,
}: {
  tableConfig?: TableComponentConfig;
  constantFilter?: Record<string, unknown>;
  resolvedParams?: Record<string, unknown>;
}) {
  const configuredTableToggles = useMemo(
    () => tableConfig?.toggles || [],
    [tableConfig?.toggles],
  );
  const [tableToggleState, setTableToggleState] = useState(() =>
    createTableToggleState(configuredTableToggles),
  );
  useEffect(() => {
    setTableToggleState(createTableToggleState(configuredTableToggles));
  }, [configuredTableToggles]);

  const [showFilters, setShowFilters] = useState(false);
  const [filterFormElements, setFilterFormElements] =
    useState<FormElementsState>({});
  const configuredFilterInputs = tableConfig?.filterPanel?.inputs;
  const filterSelectionDataMap = useFilterPanelSelectionData(
    configuredFilterInputs,
  );
  const configuredFilterDefaults = useMemo(
    () => getFilterDefaultValues(configuredFilterInputs),
    [configuredFilterInputs],
  );

  useEffect(() => {
    if (!Object.keys(configuredFilterDefaults).length) return;

    setFilterFormElements((prev) => {
      const next = { ...prev };
      let changed = false;

      Object.entries(configuredFilterDefaults).forEach(([key, value]) => {
        if (next[key] === undefined) {
          next[key] = value as FormElementsState[string];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [configuredFilterDefaults]);

  const tableDragState = useMemo(
    () =>
      resolveTableDragState(
        tableConfig?.drag,
        filterFormElements.sort,
        tableConfig?.constantSort?.sort,
      ),
    [
      filterFormElements.sort,
      tableConfig?.constantSort?.sort,
      tableConfig?.drag,
    ],
  );

  const requestFilters = useMemo(
    () =>
      buildRequestFilters({
        filterFormElements,
        constantFilters: tableConfig?.constantFilters,
        constantSort: tableConfig?.constantSort,
        defaultSort: tableDragState.defaultSort,
        configuredTableToggles,
        tableToggleState,
        constantFilter,
        resolvedParams,
      }),
    [
      filterFormElements,
      configuredTableToggles,
      tableToggleState,
      tableConfig?.constantFilters,
      tableConfig?.constantSort,
      tableDragState.defaultSort,
      constantFilter,
      resolvedParams,
    ],
  );

  const filtersById = useMemo(
    () => buildFiltersById(configuredFilterInputs, filterFormElements),
    [configuredFilterInputs, filterFormElements],
  );

  return {
    configuredTableToggles,
    tableToggleState,
    setTableToggleState,
    showFilters,
    setShowFilters,
    filterFormElements,
    setFilterFormElements,
    configuredFilterInputs,
    filterSelectionDataMap,
    tableDragState,
    requestFilters,
    filtersById,
  };
}
