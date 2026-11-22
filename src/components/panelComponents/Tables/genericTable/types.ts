import React from "react";
import {
  DateFormatEnum,
  FormElementsState,
} from "../../../../types";
import { Field } from "../../../../utils/api/container";
import { OutsideSearchProps } from "../../../../utils/outsideSearch";
import {
  ActionType,
  ColumnType,
  FilterType,
  PanelFilterType,
  RowKeyType,
} from "../../shared/types";

export type PaginationProps = {
  totalPages: number;
  totalRows: number;
};

export type OutsideSortProps = {
  filterPanelFormElements: FormElementsState;
  setFilterPanelFormElements: (state: FormElementsState) => void;
};

export type SortConfig = {
  key: string;
  direction: "ascending" | "descending";
};

export type GenericTableProps<T> = {
  searchPlaceholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  isDraggable?: boolean;
  onDragEnter?: (DraggedRow: T, TargetRow: T) => void;
  isActionsActive: boolean;
  columns: ColumnType[];
  isCollapsible?: boolean;
  rowKeys: RowKeyType<T>[];
  searchRowKeys?: RowKeyType<T>[];
  actions?: ActionType<T>[];
  isPdf?: boolean;
  collapsibleActions?: ActionType<T>[];
  title?: string;
  addButton?: ActionType<T>;
  addCollapsible?: ActionType<T>;
  filterPanel?: PanelFilterType;
  isColumnFilter?: boolean;
  imageHolder?: string;
  tooltipLimit?: number;
  rowsPerPageOptions?: number[];
  rowsPerPageValue?: number;
  onRowsPerPageChange?: (value: number) => void;
  filters?: FilterType[];
  isRowsPerPage?: boolean;
  rowClassNameFunction?: (row: T) => string;
  rowStyleFunction?: (row: T) => React.CSSProperties;
  isSearch?: boolean;
  isPagination?: boolean;
  isActionsAtFront?: boolean;
  isCollapsibleCheckActive?: boolean;
  isExcel?: boolean;
  excelFileName?: string;
  pagination?: PaginationProps;
  outsideSortProps?: OutsideSortProps;
  outsideSearchProps?: OutsideSearchProps;
  selectionActions?: ActionType<T>[];
  isSelectionEnabled?: boolean;
  onVisibleRowIdsChange?: (ids: readonly (string | number)[]) => void;
  activeRecordId?: string | number;
  onRecordActivate?: (id: string | number) => void;
  isToolTipEnabled?: boolean;
  isEmtpyExcel?: boolean;
  showOrientationToggle?: boolean;
  onExcelUpload?: (items: Partial<T>[]) => void;
  dateFormat?: DateFormatEnum;
  containerFields?: Field[];
  onExcelExport?: () => void;
  localSelectedRows?: T[];
  localSetSelectedRows?: (rows: T[]) => void;
  localIsSelectionActive?: boolean;
  localSetIsSelectionActive?: (isActive: boolean) => void;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
};
