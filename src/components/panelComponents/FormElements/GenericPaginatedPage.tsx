import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../../../components/header/Header";
import { TableStateScope } from "../../../context/TableState.context";
import { useUserContext } from "../../../context/User.context";
import { useSelectionData } from "../../../hooks/useSelectionData";
import { useTenantProject } from "../../../hooks/useTenantProject";
import TableOutputPublisher from "../../../pageRuntime/TableOutputPublisher";
import { tableRequestConfig } from "../../../pageRuntime/requests/tableConfig";
import type { TableOutputState } from "../../../pageRuntime/tableOutputAdapter";
import { useTableRecordSelection } from "../../../pageRuntime/useTableRecordSelection";
import type {
  ComponentOutputDefinition,
  DataBinding,
  TableComponentConfig,
} from "../../../types/page";
import type { Field } from "../../../utils/api/container";
import {
  reorderDynamicArrayRows,
  updateDynamicArrayRow,
} from "../../../utils/api/dynamicArray";
import { useExportDynamicItems } from "../../../utils/dynamic";
import { humanize } from "../../../utils/genericPageHelpers";
import { canUseConfiguredBulkSchemaActions } from "../../../utils/tableActions";
import {
  applyTableNestedRows,
  getArraySourceMutationTarget,
  isTableSearchEnabled,
} from "../../../utils/tableConfig";
import { useTableLookupSelectionData } from "../../../utils/tableLookupSelection";
import {
  reorderCurrentPageRows,
  resolveTableDragState,
} from "../../../utils/tableRowReorder";
import { useGeneratedRelationTableColumns } from "../../../utils/useGeneratedRelationTableColumns";
import ExportModal from "../Modals/ExportModal";
import GenericTable from "../Tables/GenericTable";
import type { GenericItem } from "./tableActionForm";
import { TableResetDefaultsButton } from "./paginatedPage/ActionModals";
import { buildFormInputsAndKeys } from "./paginatedPage/formInputBuilders";
import { buildBaseRowKeys } from "./paginatedPage/rowKeyBuilder";
import {
  type ExportScope,
  buildExportPayload,
  buildTableColumns,
  computeRowStyle,
  resolveDisplayFields,
} from "./paginatedPage/tableHelpers";
import { useBulkActions } from "./paginatedPage/useBulkActions";
import { useFilterControls } from "./paginatedPage/useFilterControls";
import { useRowActions } from "./paginatedPage/useRowActions";
import { useTableQueryState } from "./paginatedPage/useTableQueryState";

type Props = {
  schemaName: string;
  includeFields?: string[];
  excludeFields?: string[];
  actionsEnabled?: boolean;
  isHeader?: boolean;
  constantFilter?: Record<string, unknown>; // Constant filter that won't be editable
  customTitle?: string;
  tableConfig?: TableComponentConfig;
  dataBinding?: DataBinding;
  componentId?: string;
  outputs?: ComponentOutputDefinition[];
  resolvedParams?: Record<string, unknown>;
  sourceRevision?: string;
};

function GenericPaginatedPageContent({
  schemaName,
  includeFields,
  excludeFields,
  actionsEnabled = true,
  isHeader = false,
  constantFilter,
  tableConfig,
  customTitle,
  dataBinding,
  componentId,
  outputs,
  resolvedParams,
  sourceRevision = "",
}: Props) {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const { requestConfig } = useTenantProject();

  const {
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
  } = useTableQueryState({
    schemaName,
    actionsEnabled,
    constantFilter,
    tableConfig,
    dataBinding,
    resolvedParams,
    sourceRevision,
  });

  const {
    createDynamicItem,
    createMultipleDynamicItem,
    updateDynamicItem,
    executeWorkflow,
    deleteDynamicItem,
    deleteMultipleDynamicItem,
    updateMultipleDynamicItem,
  } = crud;

  const bulkEditActionConfig = tableConfig?.bulkActions?.edit;
  const bulkDeleteActionConfig = tableConfig?.bulkActions?.delete;
  const bulkSchemaActionsEnabled = canUseConfiguredBulkSchemaActions(
    actionsEnabled,
    tableBinding,
  );
  const isBulkSelectionEnabled = Boolean(
    (bulkEditActionConfig && bulkEditActionConfig.enabled !== false) ||
    (bulkDeleteActionConfig && bulkDeleteActionConfig.enabled !== false),
  );

  const displayFields: Field[] = useMemo(
    () =>
      resolveDisplayFields({
        containerFields: container?.fields,
        tableConfig,
        tableToggleState,
        configuredTableToggles,
        includeFields,
        excludeFields,
        userRole: user?.role,
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
        constantFilter,
        tableConfig,
        tableToggleState,
        configuredTableToggles,
        lookupSelectionDataMap,
        selectionDataMap,
        updateDynamicItem,
      }),
    [
      displayFields,
      updateDynamicItem,
      selectionDataMap,
      lookupSelectionDataMap,
      constantFilter,
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
        constantFilter,
        tableConfig,
        generatedColumns: generatedRelationTableColumns.columns,
        isActionsActive,
        t,
      }),
    [
      displayFields,
      t,
      isActionsActive,
      constantFilter,
      tableConfig,
      generatedRelationTableColumns.columns,
    ],
  );

  const { inputs, formKeys, constantFilterKeys } = useMemo(
    () =>
      buildFormInputsAndKeys({
        displayFields,
        constantFilter,
        selectionDataMap,
        t,
      }),
    [displayFields, t, selectionDataMap, constantFilter],
  );

  const rows = useMemo(
    () =>
      applyTableNestedRows(
        sourceRows,
        tableConfig,
        t,
        lookupSelectionDataMap,
      ),
    [sourceRows, tableConfig, t, lookupSelectionDataMap],
  );

  const tableDragState = useMemo(
    () =>
      resolveTableDragState(
        tableConfig?.drag,
        filterPanelFormElements.sort,
        tableConfig?.constantSort?.sort,
      ),
    [
      filterPanelFormElements.sort,
      tableConfig?.constantSort?.sort,
      tableConfig?.drag,
    ],
  );

  const hasRecordOutput =
    outputs?.some((output) => output.source.kind === "tableSelectedRecord") ===
    true;
  const { selectedRecord, activeRecordId, activateRecord, reportVisibleRowIds } =
    useTableRecordSelection(sourceRows, hasRecordOutput);
  const tableOutputState = useMemo<TableOutputState>(
    () => ({
      filters: filtersById,
      search:
        typeof filterPanelFormElements.search === "string"
          ? filterPanelFormElements.search
          : String(filterPanelFormElements.search ?? ""),
      selectedIds,
      selectedRecord,
    }),
    [filterPanelFormElements.search, filtersById, selectedIds, selectedRecord],
  );

  const handleRowDrag = useCallback(
    (draggedRow: GenericItem, targetRow: GenericItem) => {
      const result = reorderCurrentPageRows(
        rows,
        draggedRow,
        targetRow,
        tableDragState.orderField,
        (currentPage - 1) * rowsPerPage + 1,
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
      currentPage,
      rows,
      rowsPerPage,
      tableDragState.orderField,
      updateMultipleDynamicItem,
      schemaName,
    ],
  );

  const outsideSort = useMemo(
    () => ({ filterPanelFormElements, setFilterPanelFormElements }),
    [filterPanelFormElements, setFilterPanelFormElements],
  );

  const outsideSearchProps = useMemo(
    () => ({ t, filterPanelFormElements, setFilterPanelFormElements }),
    [t, filterPanelFormElements, setFilterPanelFormElements],
  );
  const searchEnabled = isTableSearchEnabled(tableConfig);

  const rowStyleFunction = useCallback(
    (row: GenericItem): React.CSSProperties =>
      computeRowStyle(row, tableConfig, container),
    [container, tableConfig],
  );

  const { addButton, actions } = useRowActions({
    schemaName,
    tableConfig,
    actionsEnabled,
    schemaActionsEnabled,
    isActionsActive,
    constantFilter,
    constantFilterKeys,
    displayFields,
    inputs,
    formKeys,
    rows,
    requestConfig,
    createDynamicItem,
    updateDynamicItem,
    deleteDynamicItem,
    executeWorkflow,
    t,
  });

  const { selectionActions } = useBulkActions({
    bulkEditActionConfig,
    bulkDeleteActionConfig,
    bulkSchemaActionsEnabled,
    displayFields,
    selectionDataMap,
    selectedRows,
    setSelectedRows,
    setIsSelectionActive,
    updateMultipleDynamicItem,
    deleteMultipleDynamicItem,
    t,
  });

  const { filters, filterPanel } = useFilterControls({
    displayFields,
    constantFilter,
    selectionDataMap,
    configuredFilterInputs,
    filterSelectionDataMap,
    configuredTableToggles,
    tableToggleState,
    setTableToggleState,
    showFilters,
    setShowFilters,
    filterPanelFormElements,
    setFilterPanelFormElements,
    setCurrentPage,
    t,
  });

  const { exportDynamicItems } = useExportDynamicItems();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExport = (
    selectedFields: string[],
    includeSearch: boolean,
    includeFilters: boolean,
    exportScope: ExportScope,
    pageCount?: number,
  ) => {
    exportDynamicItems(
      buildExportPayload({
        schemaName,
        selectedFields,
        includeSearch,
        includeFilters,
        exportScope,
        pageCount,
        rowsPerPage,
        currentPage,
        filterPanelFormElements,
      }),
    );
  };

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
        {pageRequestDefaults && (
          <TableResetDefaultsButton onClick={resetToSharedDefaults} />
        )}
        <GenericTable
          {...(pageRequestDefaults
            ? {
                rowsPerPageValue: rowsPerPage,
                onRowsPerPageChange: (value: number) => {
                  setLocalPageSize(value);
                  setCurrentPage(1);
                },
              }
            : {})}
          searchPlaceholder={tableConfig?.searchPlaceholder}
          rowKeys={rowKeys}
          actions={actions}
          columns={columns}
          rows={rows}
          isDraggable={tableDragState.enabled}
          onDragEnter={tableDragState.enabled ? handleRowDrag : undefined}
          rowStyleFunction={rowStyleFunction}
          title={customTitle || t(humanize(schemaName))}
          addButton={addButton}
          isCollapsible={tableConfig?.nestedRows?.enabled === true}
          isActionsActive={isActionsActive}
          isSearch={!requestControls.includes("search") && searchEnabled}
          outsideSortProps={
            requestControls.includes("sort") ? outsideSort : undefined
          }
          {...(pagination &&
            tableRequestConfig(undefined, requestSource).mode ===
              "paginated" && { pagination })}
          outsideSearchProps={
            searchEnabled && requestControls.includes("search")
              ? outsideSearchProps
              : undefined
          }
          selectionActions={selectionActions}
          isSelectionEnabled={isBulkSelectionEnabled}
          onVisibleRowIdsChange={
            hasRecordOutput ? reportVisibleRowIds : undefined
          }
          activeRecordId={hasRecordOutput ? activeRecordId : undefined}
          onRecordActivate={hasRecordOutput ? activateRecord : undefined}
          isExcel={true}
          onExcelUpload={
            schemaActionsEnabled && !hasImageField
              ? createMultipleDynamicItem
              : undefined
          }
          onExcelExport={
            schemaActionsEnabled ? () => setIsExportModalOpen(true) : undefined
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
          currentPage={currentPage}
          totalPages={pagination?.totalPages || 1}
        />
      </div>
    </>
  );
}

export default function GenericPaginatedPage(props: Props) {
  return (
    <TableStateScope>
      <GenericPaginatedPageContent {...props} />
    </TableStateScope>
  );
}
