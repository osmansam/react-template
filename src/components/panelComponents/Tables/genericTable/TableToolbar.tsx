import { Tooltip } from "@material-tailwind/react";
import React, { Dispatch, RefObject, SetStateAction } from "react";
import { FaFileExcel, FaFileUpload } from "react-icons/fa";
import { PiFadersHorizontal } from "react-icons/pi";
import { RiFilter3Line } from "react-icons/ri";
import { GenericButton } from "../../FormElements/GenericButton";
import { H4, H5, P1 } from "../../Typography";
import { ActionType, FilterType } from "../../shared/types";
import ColumnActiveModal from "../ColumnActiveModal";
import IconButton from "../IconButton";
import SelectionToggleButton from "../SelectionToggleButton";
import { TableActionButtons } from "./TableActionButtons";
import { TableFilterList } from "./TableFilterList";

type TableToolbarProps<T> = {
  title?: string;
  hasSelectionActions: boolean;
  isSelectionActive: boolean;
  setIsSelectionActive: (isActive: boolean) => void;
  selectedRows: T[];
  setSelectedRows: (rows: T[]) => void;
  isActionsActive: boolean;
  selectionActions?: ActionType<T>[];
  filters?: FilterType[];
  isExcel: boolean;
  onExcelUpload?: (items: Partial<T>[]) => void;
  onExcelExport?: () => void;
  handleUploadExcel: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadClick: () => void;
  uploadInputRef: RefObject<HTMLInputElement>;
  isExcelMenuOpen: boolean;
  setIsExcelMenuOpen: Dispatch<SetStateAction<boolean>>;
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: Dispatch<SetStateAction<boolean>>;
  isColumnFilter: boolean;
  isColumnActiveModalOpen: boolean;
  setIsColumnActiveModalOpen: Dispatch<SetStateAction<boolean>>;
  addButton?: ActionType<T>;
  onActionClick: (action: ActionType<T>, row: T) => void;
  t: (key: string) => string;
};

export const TableToolbar = <T,>({
  title,
  hasSelectionActions,
  isSelectionActive,
  setIsSelectionActive,
  selectedRows,
  setSelectedRows,
  isActionsActive,
  selectionActions,
  filters,
  isExcel,
  onExcelUpload,
  onExcelExport,
  handleUploadExcel,
  handleUploadClick,
  uploadInputRef,
  isExcelMenuOpen,
  setIsExcelMenuOpen,
  isFilterModalOpen,
  setIsFilterModalOpen,
  isColumnFilter,
  isColumnActiveModalOpen,
  setIsColumnActiveModalOpen,
  addButton,
  onActionClick,
  t,
}: TableToolbarProps<T>) => (
  <div className="flex flex-col sm:flex-row flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-2 sm:gap-4 px-3 sm:px-6 border-b border-gray-200 py-3 sm:py-4">
    <div className="flex flex-row gap-2 items-center w-full sm:w-auto">
      {hasSelectionActions && (
        <Tooltip
          content={
            isSelectionActive ? t("Close Selection") : t("Activate Selection")
          }
          placement="top"
        >
          <SelectionToggleButton
            isActive={isSelectionActive}
            onClick={() => {
              if (isSelectionActive) setSelectedRows([]);
              setIsSelectionActive(!isSelectionActive);
            }}
          />
        </Tooltip>
      )}
      {title && <H4 className="mr-auto text-base sm:text-lg">{title}</H4>}
    </div>
    {hasSelectionActions &&
      isSelectionActive &&
      isActionsActive &&
      selectedRows.length > 0 && (
        <TableActionButtons
          row={{} as unknown as T}
          actions={selectionActions || []}
          onActionClick={onActionClick}
        />
      )}
    <div className="flex flex-row flex-wrap gap-2 sm:gap-4 relative items-center w-full sm:w-auto sm:ml-auto justify-end">
      {!(hasSelectionActions && isSelectionActive) && (
        <>
          {/* Alt filters (Total vs) */}
          <TableFilterList filters={filters} isUpper={false} />
          {/* Excel Button with Dropdown - mobilde de göster */}
          {(isExcel || onExcelUpload) && (
            <>
              {onExcelUpload && (
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleUploadExcel}
                  style={{ display: "none" }}
                  ref={uploadInputRef}
                />
              )}
              <Tooltip content={t("Excel")} placement="top">
                <IconButton
                  label={t("Excel")}
                  icon={<FaFileExcel />}
                  onClick={() => {
                    setIsExcelMenuOpen((prev) => !prev);
                    setIsColumnActiveModalOpen(false);
                    setIsFilterModalOpen(false);
                  }}
                  active={isExcelMenuOpen}
                />
              </Tooltip>
              {isExcelMenuOpen && (
                <div className="absolute top-10 right-0 flex flex-col gap-2 bg-white rounded-md py-2 px-2 max-w-fit border border-gray-200 drop-shadow-lg z-[60] min-w-48">
                  {onExcelExport && (
                    <div
                      onClick={() => {
                        onExcelExport();
                        setIsExcelMenuOpen(false);
                      }}
                      className="flex flex-row items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                    >
                      <FaFileExcel className="text-green-600" />
                      <P1 className="text-sm font-medium">
                        {t("Download Excel")}
                      </P1>
                    </div>
                  )}
                  {onExcelUpload && (
                    <div
                      onClick={() => {
                        handleUploadClick();
                        setIsExcelMenuOpen(false);
                      }}
                      className="flex flex-row items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                    >
                      <FaFileUpload className="text-blue-600" />
                      <P1 className="text-sm font-medium">
                        {t("Upload Excel")}
                      </P1>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {/* Mobile Filter Button - dropdown style */}
          {filters && filters.some((f) => f.isUpperSide && !f.isDisabled) && (
            <>
              <Tooltip content={t("Filters")} placement="top">
                <IconButton
                  label={t("Filters")}
                  icon={<RiFilter3Line />}
                  onClick={() => {
                    setIsFilterModalOpen((prev) => !prev);
                    setIsExcelMenuOpen(false);
                    setIsColumnActiveModalOpen(false);
                  }}
                  active={isFilterModalOpen}
                  className="sm:hidden"
                />
              </Tooltip>
              {isFilterModalOpen && (
                <div className="absolute top-10 right-0 flex flex-col gap-2 bg-white rounded-md py-4 px-2 max-w-fit border-t border-gray-200 drop-shadow-lg z-50 min-w-64 sm:hidden">
                  {filters
                    .filter((filter) => filter.isUpperSide && !filter.isDisabled)
                    .map((filter, index) => (
                      <div
                        key={index}
                        className="flex flex-row justify-between items-center gap-4 pb-3 border-b border-gray-100 last:border-b-0"
                      >
                        {filter.label && (
                          <H5 className="text-sm font-semibold text-gray-700">
                            {filter.label}
                          </H5>
                        )}
                        <div className="flex items-center">{filter.node}</div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
          {/* Column Filter Button */}
          {isColumnFilter && (
            <>
              <Tooltip content={t("Filter Columns")} placement="top">
                <IconButton
                  label={t("Filter Columns")}
                  icon={<PiFadersHorizontal />}
                  onClick={() => {
                    setIsColumnActiveModalOpen((prev) => !prev);
                    setIsExcelMenuOpen(false);
                    setIsFilterModalOpen(false);
                  }}
                  active={isColumnActiveModalOpen}
                />
              </Tooltip>
              {isColumnActiveModalOpen && title && (
                <div className="absolute top-10 right-0 flex flex-col gap-2 bg-white rounded-md py-4 px-2 max-w-fit border-t border-gray-200  drop-shadow-lg z-50 min-w-64">
                  <ColumnActiveModal title={title} />
                </div>
              )}
            </>
          )}
          {/* Add Button - mobilde yeni satırda */}
          {addButton && !addButton.isDisabled && (
            <GenericButton
              variant="black"
              size="sm"
              className={`${
                addButton.className || ""
              } text-sm w-full sm:w-auto order-last sm:order-none`}
              onClick={() => onActionClick(addButton, {} as unknown as T)}
            >
              <H5 className="text-xs sm:text-sm whitespace-nowrap">
                {addButton.name}
              </H5>
            </GenericButton>
          )}
        </>
      )}
    </div>
  </div>
);
