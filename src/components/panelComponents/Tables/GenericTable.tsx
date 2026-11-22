import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
  TableStateScope,
  useTableContext as useGeneralContext,
} from "../../../context/TableState.context";
import { DEFAULT_DATE_FORMAT, RowPerPageEnum } from "../../../types";
import type { TableDateFormat } from "../../../types/page";
import { formatTableDate } from "../../../utils/tableDateFormat";
import { useTabPanelContext } from "../TabPanel/UnifiedTabPanel";
import FilterPanel from "./FilterPanel";
import { TableBodyRows } from "./genericTable/TableBodyRows";
import { TableHeader } from "./genericTable/TableHeader";
import { TableModals } from "./genericTable/TableModals";
import { TablePaginationFooter } from "./genericTable/TablePaginationFooter";
import { TableSearchBar } from "./genericTable/TableSearchBar";
import { TableToolbar } from "./genericTable/TableToolbar";
import { GenericTableProps } from "./genericTable/types";
import { useExcelUpload } from "./genericTable/useExcelUpload";
import { useHeaderScroll } from "./genericTable/useHeaderScroll";
import { useTableData } from "./genericTable/useTableData";
import { useTableInteractions } from "./genericTable/useTableInteractions";
import "./table.css";

type Props<T> = GenericTableProps<T>;

const GenericTable = <T,>({
  searchPlaceholder,
  rows,
  columns,
  rowKeys,
  actions,
  title,
  addButton,
  filters,
  imageHolder,
  addCollapsible,
  isActionsActive = true,
  isDraggable = false,
  filterPanel,
  isColumnFilter = true,
  collapsibleActions,
  onDragEnter,
  outsideSortProps,
  outsideSearchProps,
  isSearch = true,
  isExcel = false,
  isCollapsible = false,
  isToolTipEnabled = false,
  isPagination = true,
  isRowsPerPage = true,
  isActionsAtFront = false,
  isCollapsibleCheckActive = true,
  rowsPerPageValue,
  onRowsPerPageChange,
  rowsPerPageOptions = [
    RowPerPageEnum.FIRST,
    RowPerPageEnum.SECOND,
    RowPerPageEnum.THIRD,
  ],
  searchRowKeys,
  tooltipLimit = 40,
  rowClassNameFunction,
  rowStyleFunction,
  pagination,
  selectionActions,
  isSelectionEnabled = false,
  onVisibleRowIdsChange,
  activeRecordId,
  onRecordActivate,
  showOrientationToggle,
  onExcelUpload,
  dateFormat = DEFAULT_DATE_FORMAT,
  containerFields,
  onExcelExport,
  localSelectedRows,
  localSetSelectedRows,
  localIsSelectionActive,
  localSetIsSelectionActive,
  currentPage = 1,
  setCurrentPage = () => undefined,
}: Props<T>) => {
  const { t } = useTranslation();

  // Helper function to format dates
  const formatDate = (
    value: unknown,
    format?: TableDateFormat,
  ): string | null => {
    return formatTableDate(value, format || (dateFormat as TableDateFormat));
  };

  const {
    rowsPerPage: generalRowsPerPage,
    setRowsPerPage: setGeneralRowsPerPage,
    expandedRows,
    searchQuery,
    setSearchQuery,
    setExpandedRows,
    setSortConfigKey,
    sortConfigKey,
    tableColumns,
    setTableColumns,
    selectedRows: globalSelectedRows,
    setSelectedRows: globalSetSelectedRows,
    isSelectionActive: globalIsSelectionActive,
    setIsSelectionActive: globalSetIsSelectionActive,
    tabOrientation,
    setTabOrientation,
  } = useGeneralContext();

  const rowsPerPage = rowsPerPageValue ?? generalRowsPerPage;
  const setRowsPerPage = onRowsPerPageChange || setGeneralRowsPerPage;

  // Use local selection state if provided, otherwise fall back to global context
  const selectedRows = (
    localSelectedRows !== undefined ? localSelectedRows : globalSelectedRows
  ) as T[];
  const setSelectedRows = (localSetSelectedRows || globalSetSelectedRows) as (
    rows: T[],
  ) => void;
  const isSelectionActive =
    localIsSelectionActive !== undefined
      ? localIsSelectionActive
      : globalIsSelectionActive;
  const setIsSelectionActive =
    localSetIsSelectionActive || globalSetIsSelectionActive;

  const { allowOrientationToggle } = useTabPanelContext();
  const navigate = useNavigate();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState("");
  const [isColumnActiveModalOpen, setIsColumnActiveModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const hasSelectionActions =
    Boolean(selectionActions?.length) || isSelectionEnabled;

  const {
    sortConfig,
    usedColumns,
    usedRowKeys,
    currentRows,
    usedTotalRows,
    usedTotalPages,
    sortRows,
  } = useTableData({
    title,
    columns,
    rowKeys,
    searchRowKeys,
    rows,
    isActionsAtFront,
    isSearch,
    searchQuery,
    sortConfigKey,
    setSortConfigKey,
    tableColumns,
    setTableColumns,
    isRowsPerPage,
    pagination,
    currentPage,
    rowsPerPage,
    onVisibleRowIdsChange,
  });

  const {
    showHeaderLeftButton,
    showHeaderRightButton,
    headerScrollRef,
    scrollHeaderToDirection,
  } = useHeaderScroll(usedColumns?.length);

  const {
    isExcelMenuOpen,
    setIsExcelMenuOpen,
    uploadInputRef,
    handleUploadExcel,
    handleUploadClick,
  } = useExcelUpload({
    usedColumns,
    usedRowKeys,
    containerFields,
    onExcelUpload,
    t,
  });

  const {
    handleDragStart,
    handleDragOver,
    handleDrop,
    toggleRowExpansion,
    actionOnClick,
    isRowSelected,
    toggleSelectedRow,
    allVisibleSelected,
  } = useTableInteractions({
    onDragEnter,
    setExpandedRows,
    isSelectionActive,
    selectedRows,
    setSelectedRows,
    currentRows,
    navigate,
    t,
  });

  return (
    <div
      className={`${
        filterPanel?.isFilterPanelActive ? "flex flex-row gap-2" : ""
      }`}
    >
      {filterPanel?.isFilterPanelActive && <FilterPanel {...filterPanel} />}
      <div
        className={`mx-auto w-full overflow-scroll no-scrollbar flex flex-col gap-4 __className_a182b8 `}
      >
        <TableSearchBar
          isSearch={isSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          searchPlaceholder={searchPlaceholder}
          outsideSearchProps={outsideSearchProps}
          showOrientationToggle={Boolean(
            showOrientationToggle ?? allowOrientationToggle,
          )}
          tabOrientation={tabOrientation}
          setTabOrientation={setTabOrientation}
          hasSelectionActions={hasSelectionActions}
          isSelectionActive={isSelectionActive}
          filters={filters}
          t={t}
        />
        <div className="flex flex-col bg-white border border-gray-100 shadow-sm rounded-lg relative z-0">
          <TableToolbar
            title={title}
            hasSelectionActions={hasSelectionActions}
            isSelectionActive={isSelectionActive}
            setIsSelectionActive={setIsSelectionActive}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            isActionsActive={isActionsActive}
            selectionActions={selectionActions}
            filters={filters}
            isExcel={isExcel}
            onExcelUpload={onExcelUpload}
            onExcelExport={onExcelExport}
            handleUploadExcel={handleUploadExcel}
            handleUploadClick={handleUploadClick}
            uploadInputRef={uploadInputRef}
            isExcelMenuOpen={isExcelMenuOpen}
            setIsExcelMenuOpen={setIsExcelMenuOpen}
            isFilterModalOpen={isFilterModalOpen}
            setIsFilterModalOpen={setIsFilterModalOpen}
            isColumnFilter={isColumnFilter}
            isColumnActiveModalOpen={isColumnActiveModalOpen}
            setIsColumnActiveModalOpen={setIsColumnActiveModalOpen}
            addButton={addButton}
            onActionClick={actionOnClick}
            t={t}
          />
          <div className="px-6 py-4 flex flex-col gap-4 overflow-scroll no-scrollbar w-full  ">
            <div className="border border-gray-100 rounded-md w-full min-h-60 relative">
              {showHeaderLeftButton && (
                <button
                  onClick={() => scrollHeaderToDirection("left")}
                  className="absolute left-1 top-6 -translate-y-1/2 z-30 w-10 h-10 md:w-10 md:h-10 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-full flex items-center justify-center hover:bg-white hover:border-blue-400 hover:shadow-md transition-all duration-300 hover:scale-105 shadow-sm touch-manipulation"
                  aria-label="Scroll left"
                >
                  <FiChevronLeft className="text-gray-400 text-lg md:text-xl hover:text-blue-600 transition-colors" />
                </button>
              )}
              {showHeaderRightButton && (
                <button
                  onClick={() => scrollHeaderToDirection("right")}
                  className="absolute right-1 top-6 -translate-y-1/2 z-30 w-10 h-10 md:w-10 md:h-10 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-full flex items-center justify-center hover:bg-white hover:border-blue-400 hover:shadow-md transition-all duration-300 hover:scale-105 shadow-sm touch-manipulation"
                  aria-label="Scroll right"
                >
                  <FiChevronRight className="text-gray-400 text-lg md:text-xl hover:text-blue-600 transition-colors" />
                </button>
              )}
              <div
                ref={headerScrollRef}
                className={`overflow-auto scroll-smooth relative cursor-grab active:cursor-grabbing ${
                  rowsPerPage > 50 || rowsPerPage === RowPerPageEnum.ALL
                    ? "h-[600px]"
                    : "max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh]"
                }`}
              >
                <table className="bg-white w-full">
                  <TableHeader
                    hasSelectionActions={hasSelectionActions}
                    isSelectionActive={isSelectionActive}
                    allVisibleSelected={allVisibleSelected}
                    selectedRows={selectedRows}
                    setSelectedRows={setSelectedRows}
                    currentRows={currentRows}
                    isCollapsible={isCollapsible}
                    usedColumns={usedColumns}
                    usedRowKeys={usedRowKeys}
                    actions={actions}
                    isActionsActive={isActionsActive}
                    outsideSortProps={outsideSortProps}
                    sortConfig={sortConfig}
                    sortRows={sortRows}
                    t={t}
                  />
                  <TableBodyRows
                    currentRows={currentRows}
                    expandedRows={expandedRows}
                    isDraggable={isDraggable}
                    activeRecordId={activeRecordId}
                    onRecordActivate={onRecordActivate}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                    rowClassNameFunction={rowClassNameFunction}
                    rowStyleFunction={rowStyleFunction}
                    hasSelectionActions={hasSelectionActions}
                    isSelectionActive={isSelectionActive}
                    isRowSelected={isRowSelected}
                    toggleSelectedRow={toggleSelectedRow}
                    isCollapsibleCheckActive={isCollapsibleCheckActive}
                    isCollapsible={isCollapsible}
                    toggleRowExpansion={toggleRowExpansion}
                    actions={actions}
                    isActionsAtFront={isActionsAtFront}
                    isActionsActive={isActionsActive}
                    usedRowKeys={usedRowKeys}
                    usedColumns={usedColumns}
                    formatDate={formatDate}
                    tooltipLimit={tooltipLimit}
                    isToolTipEnabled={isToolTipEnabled}
                    imageHolder={imageHolder}
                    onOpenImageModal={(src) => {
                      setImageModalSrc(src);
                      setIsImageModalOpen(true);
                    }}
                    onActionClick={actionOnClick}
                    addCollapsible={addCollapsible}
                    collapsibleActions={collapsibleActions}
                    t={t}
                  />
                </table>
              </div>
            </div>
            {rows.length > 0 && isRowsPerPage && (
              <TablePaginationFooter
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                rowsPerPageOptions={rowsPerPageOptions}
                usedTotalRows={usedTotalRows}
                usedTotalPages={usedTotalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setExpandedRows={setExpandedRows}
                isPagination={isPagination}
                t={t}
              />
            )}
          </div>
          <TableModals
            actions={actions}
            selectionActions={selectionActions}
            collapsibleActions={collapsibleActions}
            addButton={addButton}
            addCollapsible={addCollapsible}
            isImageModalOpen={isImageModalOpen}
            imageModalSrc={imageModalSrc}
            onCloseImageModal={() => setIsImageModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default function ScopedTable<T>(props: Props<T>) {
  return (
    <TableStateScope>
      <GenericTable {...props} />
    </TableStateScope>
  );
}
