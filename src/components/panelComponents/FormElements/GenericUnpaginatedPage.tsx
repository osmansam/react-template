import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TableStateScope } from "../../../context/TableState.context";
import { useUserContext } from "../../../context/User.context";
import { useSelectionData } from "../../../hooks/useSelectionData";
import { useTenantProject } from "../../../hooks/useTenantProject";
import {
  legacyRead,
  legacyValues,
} from "../../../pageRuntime/requests/legacyAdapters";
import { useTableRequestOverrides } from "../../../pageRuntime/requests/tableOverrides";
import { usePageReadKey } from "../../../pageRuntime/requests/usePageRead";
import TableOutputPublisher from "../../../pageRuntime/TableOutputPublisher";
import {
  resolveSelectedRowIds,
  type TableOutputState,
} from "../../../pageRuntime/tableOutputAdapter";
import { useTableRecordSelection } from "../../../pageRuntime/useTableRecordSelection";
import type { FormElementsState } from "../../../types";
import type {
  ComponentOutputDefinition,
  DataBinding,
  TableComponentConfig,
} from "../../../types/page";
import {
  type ContainerModel,
  type Field,
  useGetContainers,
} from "../../../utils/api/container";
import {
  reorderDynamicArrayRows,
  updateDynamicArrayRow,
} from "../../../utils/api/dynamicArray";
import { useDynamicCrud, useGetDynamicItems } from "../../../utils/dynamic";
import { humanize } from "../../../utils/genericPageHelpers";
import {
  applyTableArraySource,
  applyTableNestedRows,
  getArraySourceMutationTarget,
  isTableSearchEnabled,
  normalizeConfiguredTableRows,
} from "../../../utils/tableConfig";
import { buildConfiguredFilterInputs } from "../../../utils/tableFilters";
import { useTableLookupSelectionData } from "../../../utils/tableLookupSelection";
import {
  reorderCurrentPageRows,
  sortRowsByOrderField,
} from "../../../utils/tableRowReorder";
import { useGeneratedRelationTableColumns } from "../../../utils/useGeneratedRelationTableColumns";
import { Header } from "../../header/Header";
import ExportModal from "../Modals/ExportModal";
import GenericTable from "../Tables/GenericTable";
import type { GenericItem } from "./tableActionForm";
import { buildBaseRowKeys } from "./unpaginatedPage/buildBaseRowKeys";
import { buildFilterControls } from "./unpaginatedPage/buildFilterControls";
import {
  buildAddEditFormConfig,
  buildDefaultFilterPanelInputs,
} from "./unpaginatedPage/formInputBuilders";
import {
  buildTableColumns,
  computeDisplayFields,
  computeRowStyle,
  containerHasImageField,
  findMatchingContainer,
} from "./unpaginatedPage/pageHelpers";
import { useUnpaginatedBulkActions } from "./unpaginatedPage/useUnpaginatedBulkActions";
import { useUnpaginatedExport } from "./unpaginatedPage/useUnpaginatedExport";
import { useUnpaginatedRowActions } from "./unpaginatedPage/useUnpaginatedRowActions";
import { useUnpaginatedTableFilters } from "./unpaginatedPage/useUnpaginatedTableFilters";

type Props = {
  schemaName: string;
  includeFields?: string[];
  excludeFields?: string[];
  actionsEnabled?: boolean;
  isHeader?: boolean;
  constantFilter?: Record<string, unknown>;
  customTitle?: string;
  tableConfig?: TableComponentConfig;
  dataBinding?: DataBinding;
  componentId?: string;
  outputs?: ComponentOutputDefinition[];
  resolvedParams?: Record<string, unknown>;
  sourceRevision?: string;
};

function GenericUnpaginatedPageContent({
  schemaName,
  includeFields,
  excludeFields,
  actionsEnabled = true,
  isHeader = false,
  constantFilter,
  customTitle,
  tableConfig,
  componentId,
  outputs,
  resolvedParams,
  sourceRevision = "",
}: Props) {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const { requestConfig } = useTenantProject();

  const {
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
  } = useUnpaginatedTableFilters({
    tableConfig,
    constantFilter,
    resolvedParams,
  });

  const [currentPage, setCurrentPage] = useState(1);
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

  const pageRequestOverrides = useTableRequestOverrides(
    legacyValues(requestFilters),
    legacyValues({ ...tableConfig?.constantFilters, ...constantFilter }),
  );
  const items = useGetDynamicItems<GenericItem>(
    schemaName,
    requestFilters as FormElementsState,
    sourceRevision,
    pageRequestOverrides,
  );
  const activePageQueryKey = usePageReadKey(
    "data",
    legacyRead({ transport: "list", schemaName }, legacyValues(requestFilters)),
    pageRequestOverrides,
  );
  const rawContainers = useGetContainers();

  const container: ContainerModel | undefined = useMemo(
    () => findMatchingContainer(rawContainers, schemaName),
    [rawContainers, schemaName],
  );

  const rowStyleFunction = useCallback(
    (row: GenericItem): React.CSSProperties =>
      computeRowStyle(row, container, tableConfig),
    [container, tableConfig],
  );

  const hasImageField = useMemo(
    () => containerHasImageField(container),
    [container],
  );

  const {
    createDynamicItem,
    createMultipleDynamicItem,
    updateDynamicItem,
    executeWorkflow,
    deleteDynamicItem,
    deleteMultipleDynamicItem,
    updateMultipleDynamicItem,
  } = useDynamicCrud<GenericItem>(
    schemaName,
    hasImageField,
    activePageQueryKey ? [...activePageQueryKey] : undefined,
  );

  const displayFields: Field[] = useMemo(
    () =>
      computeDisplayFields({
        container,
        includeFields,
        excludeFields,
        userRole: user?.role,
        tableConfig,
        tableToggleState,
        configuredTableToggles,
      }),
    [
      container,
      includeFields,
      excludeFields,
      user,
      tableConfig,
      tableToggleState,
      configuredTableToggles,
    ],
  );

  const selectionDataMap = useSelectionData(container?.fields || []);
  const lookupSelectionDataMap = useTableLookupSelectionData(tableConfig);

  const generatedRelationTableColumns = useGeneratedRelationTableColumns({
    tableConfig,
    toggleState: tableToggleState,
    toggles: configuredTableToggles,
    updateRow: async (id, updates, row) => {
      const target = getArraySourceMutationTarget(row);
      if (target) {
        await updateDynamicArrayRow({
          ...requestConfig,
          schemaName,
          parentId: target.parentId,
          arrayField: target.arrayField,
          rowIdentityField: target.rowIdentityField,
          rowIdentity: target.rowIdentity,
          updates,
        });
        return;
      }
      updateDynamicItem(id, updates);
    },
  });

  const baseRowKeys = useMemo(
    () =>
      buildBaseRowKeys({
        displayFields,
        updateDynamicItem,
        selectionDataMap,
        lookupSelectionDataMap,
        tableConfig,
        tableToggleState,
        configuredTableToggles,
      }),
    [
      displayFields,
      updateDynamicItem,
      selectionDataMap,
      lookupSelectionDataMap,
      tableConfig,
      tableToggleState,
      configuredTableToggles,
    ],
  );

  const rowKeys = useMemo(
    () => [...baseRowKeys, ...generatedRelationTableColumns.rowKeys],
    [baseRowKeys, generatedRelationTableColumns.rowKeys],
  );

  const columns = useMemo(
    () =>
      buildTableColumns({
        displayFields,
        tableConfig,
        generatedColumns: generatedRelationTableColumns.columns,
        actionsEnabled,
        t,
      }),
    [
      displayFields,
      t,
      actionsEnabled,
      tableConfig,
      generatedRelationTableColumns.columns,
    ],
  );

  const { inputs, formKeys } = useMemo(
    () =>
      buildAddEditFormConfig({
        displayFields,
        selectionDataMap,
        t,
      }),
    [displayFields, t, selectionDataMap],
  );

  const { addButton, actions } = useUnpaginatedRowActions({
    t,
    schemaName,
    requestConfig,
    tableConfig,
    constantFilter,
    actionsEnabled,
    items,
    displayFields,
    inputs,
    formKeys,
    createDynamicItem,
    updateDynamicItem,
    deleteDynamicItem,
    executeWorkflow,
  });

  const { isBulkSelectionEnabled, selectionActions } =
    useUnpaginatedBulkActions({
      t,
      schemaName,
      tableConfig,
      actionsEnabled,
      displayFields,
      selectionDataMap,
      selectedRows,
      setSelectedRows,
      setIsSelectionActive,
      executeWorkflow,
      updateMultipleDynamicItem,
      deleteMultipleDynamicItem,
    });

  const filterPanelInputs = useMemo(() => {
    const defaultInputs = buildDefaultFilterPanelInputs({
      displayFields,
      selectionDataMap,
      t,
    });
    return buildConfiguredFilterInputs(
      configuredFilterInputs,
      defaultInputs,
      filterSelectionDataMap,
    );
  }, [
    displayFields,
    t,
    selectionDataMap,
    configuredFilterInputs,
    filterSelectionDataMap,
  ]);
  const hasFilterPanelInputs = filterPanelInputs.length > 0;

  const filters = useMemo(
    () =>
      buildFilterControls({
        configuredTableToggles,
        tableToggleState,
        setTableToggleState,
        hasFilterPanelInputs,
        showFilters,
        setShowFilters,
        t,
      }),
    [
      t,
      showFilters,
      hasFilterPanelInputs,
      configuredTableToggles,
      tableToggleState,
      setTableToggleState,
      setShowFilters,
    ],
  );

  const filterPanel = useMemo(
    () => ({
      isFilterPanelActive: showFilters && hasFilterPanelInputs,
      inputs: filterPanelInputs,
      formElements: filterFormElements,
      setFormElements: setFilterFormElements,
      closeFilters: () => setShowFilters(false),
      isApplyButtonActive: true,
    }),
    [
      showFilters,
      hasFilterPanelInputs,
      filterPanelInputs,
      filterFormElements,
      setFilterFormElements,
      setShowFilters,
    ],
  );

  const sourceRows = useMemo(
    () =>
      applyTableArraySource(
        normalizeConfiguredTableRows(items || [], tableConfig),
        tableConfig,
      ),
    [items, tableConfig],
  );
  const rows = useMemo(() => {
    const nestedRows = applyTableNestedRows(
      sourceRows,
      tableConfig,
      t,
      lookupSelectionDataMap,
    );
    return tableDragState.enabled
      ? sortRowsByOrderField(nestedRows, tableDragState.orderField)
      : nestedRows;
  }, [sourceRows, tableConfig, t, lookupSelectionDataMap, tableDragState]);

  const selectedIds = useMemo(
    () => resolveSelectedRowIds(selectedRows, isSelectionInitialized),
    [isSelectionInitialized, selectedRows],
  );
  const hasRecordOutput =
    outputs?.some((output) => output.source.kind === "tableSelectedRecord") ===
    true;
  const {
    selectedRecord,
    activeRecordId,
    activateRecord,
    reportVisibleRowIds,
  } = useTableRecordSelection(sourceRows, hasRecordOutput);
  const tableOutputState = useMemo<TableOutputState>(
    () => ({
      filters: filtersById,
      search: String(filterFormElements.search ?? ""),
      selectedIds,
      selectedRecord,
    }),
    [filterFormElements.search, filtersById, selectedIds, selectedRecord],
  );

  const handleRowDrag = useCallback(
    (draggedRow: GenericItem, targetRow: GenericItem) => {
      const result = reorderCurrentPageRows(
        rows,
        draggedRow,
        targetRow,
        tableDragState.orderField,
        1,
      );
      if (result.updates.length) {
        const firstTarget = getArraySourceMutationTarget(result.rows[0]);
        if (firstTarget) {
          void reorderDynamicArrayRows({
            ...requestConfig,
            schemaName,
            parentId: firstTarget.parentId,
            arrayField: firstTarget.arrayField,
            rowIdentityField: firstTarget.rowIdentityField,
            orderField: tableDragState.orderField,
            rowIdentities: result.rows.map(
              (row) => getArraySourceMutationTarget(row)?.rowIdentity,
            ),
          });
          return;
        }
        updateMultipleDynamicItem(result.updates);
      }
    },
    [
      requestConfig,
      rows,
      tableDragState.orderField,
      updateMultipleDynamicItem,
      schemaName,
    ],
  );

  const { isExportModalOpen, setIsExportModalOpen, handleExport } =
    useUnpaginatedExport({
      schemaName,
      requestFilters,
      searchValue: filterFormElements.search,
    });

  return (
    <>
      {componentId && outputs && outputs.length > 0 && (
        <TableOutputPublisher
          componentId={componentId}
          outputs={outputs}
          state={tableOutputState}
        />
      )}
      {isHeader && <Header />}
      <div className="w-full mx-auto">
        <GenericTable
          searchPlaceholder={tableConfig?.searchPlaceholder}
          rowKeys={rowKeys}
          actions={actions}
          columns={columns}
          rows={rows || []}
          isDraggable={tableDragState.enabled}
          onDragEnter={tableDragState.enabled ? handleRowDrag : undefined}
          rowStyleFunction={rowStyleFunction}
          title={customTitle || t(humanize(schemaName))}
          addButton={addButton}
          isCollapsible={tableConfig?.nestedRows?.enabled === true}
          isActionsActive={actionsEnabled}
          isSearch={isTableSearchEnabled(tableConfig)}
          selectionActions={selectionActions}
          isSelectionEnabled={isBulkSelectionEnabled}
          onVisibleRowIdsChange={
            hasRecordOutput ? reportVisibleRowIds : undefined
          }
          activeRecordId={hasRecordOutput ? activeRecordId : undefined}
          onRecordActivate={hasRecordOutput ? activateRecord : undefined}
          isExcel={!hasImageField}
          onExcelUpload={!hasImageField ? createMultipleDynamicItem : undefined}
          onExcelExport={
            actionsEnabled ? () => setIsExportModalOpen(true) : undefined
          }
          filters={filters}
          filterPanel={filterPanel}
          containerFields={container?.fields}
          localSelectedRows={selectedRows}
          localSetSelectedRows={handleSelectedRowsChange}
          localIsSelectionActive={isSelectionActive}
          localSetIsSelectionActive={handleSelectionActiveChange}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <ExportModal
          isOpen={isExportModalOpen}
          close={() => setIsExportModalOpen(false)}
          fields={displayFields}
          onExport={handleExport}
          schemaName={humanize(schemaName)}
          currentPage={1}
          totalPages={1}
          showPaginationScopes={false}
        />
      </div>
    </>
  );
}

export default function GenericUnpaginatedPage(props: Props) {
  return (
    <TableStateScope>
      <GenericUnpaginatedPageContent {...props} />
    </TableStateScope>
  );
}
