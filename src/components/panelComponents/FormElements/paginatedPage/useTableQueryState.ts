import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTableContext as useGeneralContext } from "../../../../context/TableState.context";
import { usePageRequestConsumer } from "../../../../pageRuntime/requests/ConsumerProvider";
import {
  legacyRead,
  legacyValues,
} from "../../../../pageRuntime/requests/legacyAdapters";
import {
  useTableRequestDefaults,
  useTableRequestOverrides,
} from "../../../../pageRuntime/requests/tableOverrides";
import { usePageReadKey } from "../../../../pageRuntime/requests/usePageRead";
import { resolveSelectedRowIds } from "../../../../pageRuntime/tableOutputAdapter";
import type { FormElementsState } from "../../../../types";
import type { DataBinding, TableComponentConfig } from "../../../../types/page";
import {
  type ContainerModel,
  Types,
  useGetContainers,
} from "../../../../utils/api/container";
import {
  type TableSourceBinding,
  useDynamicCrud,
  useGetTableSourceItems,
} from "../../../../utils/dynamic";
import { getTableSourceQueryKey } from "../../../../utils/dynamicQueryKeys";
import {
  type RawContainer,
  normalizeContainer,
} from "../../../../utils/genericPageHelpers";
import { pageRequestControls } from "../../../../utils/pageRequests";
import {
  applyTableArraySource,
  getTableDataFieldNames,
  normalizeConfiguredTableRows,
} from "../../../../utils/tableConfig";
import {
  getFilterDefaultValues,
  useFilterPanelSelectionData,
} from "../../../../utils/tableFilters";
import {
  createTableToggleState,
  resolveToggleRequestEffects,
} from "../../../../utils/tableToggles";
import type { GenericItem } from "../tableActionForm";
import {
  buildFiltersById,
  mergeTableRequestFilters,
} from "./tableHelpers";

export function useTableQueryState({
  schemaName,
  actionsEnabled,
  constantFilter,
  tableConfig,
  dataBinding,
  resolvedParams,
  sourceRevision,
}: {
  schemaName: string;
  actionsEnabled: boolean;
  constantFilter?: Record<string, unknown>;
  tableConfig?: TableComponentConfig;
  dataBinding?: DataBinding;
  resolvedParams?: Record<string, unknown>;
  sourceRevision: string;
}) {
  const { rowsPerPage: generalRowsPerPage } = useGeneralContext();
  const pageRequestDefaults = useTableRequestDefaults();
  const requestSource =
    usePageRequestConsumer()?.connections.get("data")?.definition.source;
  const requestControls = requestSource
    ? pageRequestControls(requestSource)
    : ["page", "limit", "sort", "asc", "search"];
  const [requestResetKey, setRequestResetKey] = useState(0);
  const [localPageSize, setLocalPageSize] = useState<number>();
  const rowsPerPage = pageRequestDefaults
    ? (localPageSize ??
      pageRequestDefaults.controls?.limit ??
      generalRowsPerPage)
    : generalRowsPerPage;

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

  const rawContainers = useGetContainers();
  const [currentPage, setCurrentPage] = useState(
    pageRequestDefaults?.controls?.page ?? 1,
  );
  const [selectedRows, setSelectedRows] = useState<GenericItem[]>([]);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [isSelectionInitialized, setIsSelectionInitialized] = useState(false);
  const handleSelectedRowsChange = useCallback((nextRows: GenericItem[]) => {
    setIsSelectionInitialized(true);
    setSelectedRows(nextRows);
  }, []);
  const handleSelectionActiveChange = useCallback((nextActive: boolean) => {
    setIsSelectionInitialized(true);
    setIsSelectionActive(nextActive);
  }, []);

  const container: ContainerModel | undefined = useMemo(() => {
    if (!rawContainers) return undefined;
    const normalized = rawContainers.map((c: RawContainer) =>
      normalizeContainer(c),
    );
    return normalized.find(
      (c: ContainerModel) =>
        (c.schemaName || "").toLowerCase() === schemaName.toLowerCase(),
    );
  }, [rawContainers, schemaName]);

  const hasImageField = useMemo(() => {
    if (!container?.fields) return false;
    return container.fields.some(
      (field) =>
        (field.type || "").toLowerCase() === Types.Image ||
        (field.type || "").toLowerCase() === "img",
    );
  }, [container]);

  const [filterPanelFormElements, setFilterPanelFormElements] =
    useState<FormElementsState>({
      asc: pageRequestDefaults?.controls?.asc ?? 1,
      sort: pageRequestDefaults?.controls?.sort || "",
      search: pageRequestDefaults?.controls?.search || "",
    });
  const [showFilters, setShowFilters] = useState(false);

  const tableBinding = useMemo<TableSourceBinding>(
    () => ({
      kind:
        dataBinding?.kind === "pipeline" || dataBinding?.kind === "workflow"
          ? dataBinding.kind
          : "schema",
      schemaName: dataBinding?.schemaName || schemaName,
      pipelineName: dataBinding?.pipelineName,
      workflowName: dataBinding?.workflowName,
      fields: getTableDataFieldNames(
        tableConfig,
        container?.fields?.map((field) => field.name),
      ),
      params: dataBinding?.params,
    }),
    [container?.fields, dataBinding, schemaName, tableConfig],
  );

  const schemaActionsEnabled = actionsEnabled && tableBinding.kind === "schema";
  const hasConfiguredRowActions = useMemo(
    () =>
      Array.isArray(tableConfig?.actions) &&
      tableConfig.actions.some(
        (action) => action.kind !== "create" && action.enabled !== false,
      ),
    [tableConfig?.actions],
  );
  const isActionsActive = Boolean(
    actionsEnabled && (schemaActionsEnabled || hasConfiguredRowActions),
  );
  const effectiveSourceRevision = container?.updatedAt || sourceRevision;
  const configuredFilterInputs = tableConfig?.filterPanel?.inputs;
  const filtersById = useMemo(
    () => buildFiltersById(configuredFilterInputs, filterPanelFormElements),
    [configuredFilterInputs, filterPanelFormElements],
  );
  const selectedIds = useMemo(
    () => resolveSelectedRowIds(selectedRows, isSelectionInitialized),
    [isSelectionInitialized, selectedRows],
  );

  const filterSelectionDataMap = useFilterPanelSelectionData(
    configuredFilterInputs,
  );
  const configuredFilterDefaults = useMemo(
    () => getFilterDefaultValues(configuredFilterInputs),
    [configuredFilterInputs],
  );

  useEffect(() => {
    if (!Object.keys(configuredFilterDefaults).length) return;

    setFilterPanelFormElements((prev) => {
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

  const mergedFilters = useMemo(
    () =>
      mergeTableRequestFilters(
        {
          ...filterPanelFormElements,
          ...resolveToggleRequestEffects(
            configuredTableToggles,
            tableToggleState,
          ),
        } as FormElementsState,
        constantFilter,
        tableConfig,
      ),
    [
      filterPanelFormElements,
      constantFilter,
      tableConfig,
      configuredTableToggles,
      tableToggleState,
    ],
  );

  const pageRequestOverrides = useTableRequestOverrides(
    legacyValues(
      mergedFilters,
      {},
      {
        page: currentPage,
        limit: rowsPerPage,
        sort: String(mergedFilters.sort || "") || null,
        search: String(mergedFilters.search || "") || null,
      },
    ),
    legacyValues({ ...tableConfig?.constantFilters, ...constantFilter }),
    requestResetKey,
  );

  const tableSourceQueryKey = useMemo(
    () =>
      getTableSourceQueryKey(
        currentPage,
        rowsPerPage,
        tableBinding,
        mergedFilters,
        resolvedParams,
        effectiveSourceRevision,
      ),
    [
      currentPage,
      effectiveSourceRevision,
      mergedFilters,
      resolvedParams,
      rowsPerPage,
      tableBinding,
    ],
  );

  const activePageQueryKey = usePageReadKey(
    "data",
    legacyRead(
      {
        transport: "table-source",
        kind: tableBinding.kind || "schema",
        schemaName,
        pipelineName: tableBinding.pipelineName,
        workflowName: tableBinding.workflowName,
      },
      legacyValues(
        mergedFilters,
        { ...tableBinding.params, ...resolvedParams },
        { page: currentPage, limit: rowsPerPage },
        tableBinding.fields,
      ),
    ),
    pageRequestOverrides,
  );

  const crud = useDynamicCrud<GenericItem>(schemaName, hasImageField, [
    ...(activePageQueryKey || tableSourceQueryKey),
  ]);

  const itemsPayload = useGetTableSourceItems(
    currentPage,
    rowsPerPage,
    tableBinding,
    mergedFilters,
    resolvedParams,
    effectiveSourceRevision,
    true,
    pageRequestOverrides,
  );

  const sourceRows = useMemo(
    () =>
      applyTableArraySource(
        normalizeConfiguredTableRows(
          (itemsPayload?.items || []) as GenericItem[],
          tableConfig,
        ),
        tableConfig,
      ),
    [itemsPayload?.items, tableConfig],
  );

  const pagination = useMemo(
    () =>
      itemsPayload
        ? {
            totalPages: itemsPayload.totalPages,
            totalRows: itemsPayload.totalItems,
          }
        : null,
    [itemsPayload],
  );

  const previousFilterControls = useRef({
    values: [
      filterPanelFormElements.search,
      filterPanelFormElements.sort,
      filterPanelFormElements.asc,
    ],
    resetKey: requestResetKey,
  });
  useEffect(() => {
    const next = [
      filterPanelFormElements.search,
      filterPanelFormElements.sort,
      filterPanelFormElements.asc,
    ];
    if (
      previousFilterControls.current.resetKey === requestResetKey &&
      previousFilterControls.current.values.some(
        (value, index) => value !== next[index],
      )
    ) {
      setCurrentPage(1);
    }
    previousFilterControls.current = { values: next, resetKey: requestResetKey };
  }, [
    filterPanelFormElements.search,
    filterPanelFormElements.sort,
    filterPanelFormElements.asc,
    requestResetKey,
  ]);

  const resetToSharedDefaults = () => {
    if (!pageRequestDefaults) return;
    setRequestResetKey((key) => key + 1);
    setLocalPageSize(undefined);
    setCurrentPage(pageRequestDefaults.controls?.page ?? 1);
    setFilterPanelFormElements({
      asc: pageRequestDefaults.controls?.asc ?? 1,
      sort: pageRequestDefaults.controls?.sort || "",
      search: pageRequestDefaults.controls?.search || "",
    });
  };

  return {
    pageRequestDefaults,
    requestSource,
    requestControls,
    rowsPerPage,
    setLocalPageSize,
    configuredTableToggles,
    tableToggleState,
    setTableToggleState,
    currentPage,
    setCurrentPage,
    selectedRows,
    setSelectedRows,
    isSelectionActive,
    setIsSelectionActive,
    handleSelectedRowsChange,
    handleSelectionActiveChange,
    container,
    hasImageField,
    filterPanelFormElements,
    setFilterPanelFormElements,
    showFilters,
    setShowFilters,
    tableBinding,
    schemaActionsEnabled,
    isActionsActive,
    configuredFilterInputs,
    filtersById,
    selectedIds,
    filterSelectionDataMap,
    crud,
    sourceRows,
    pagination,
    resetToSharedDefaults,
  };
}
