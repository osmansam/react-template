import React, { Dispatch, SetStateAction } from "react";
import { NavigateFunction } from "react-router-dom";
import { toast } from "react-toastify";
import { ActionType } from "../../shared/types";
import {
  areAllVisibleSelected,
  isRowSelectedInList,
  toggleRowInSelection,
} from "./tableDataUtils";

type UseTableInteractionsParams<T> = {
  onDragEnter?: (draggedRow: T, targetRow: T) => void;
  setExpandedRows: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
  isSelectionActive: boolean;
  selectedRows: T[];
  setSelectedRows: (rows: T[]) => void;
  currentRows: T[];
  navigate: NavigateFunction;
  t: (key: string) => string;
};

export const useTableInteractions = <T,>({
  onDragEnter,
  setExpandedRows,
  isSelectionActive,
  selectedRows,
  setSelectedRows,
  currentRows,
  navigate,
  t,
}: UseTableInteractionsParams<T>) => {
  const handleDragStart = (
    e: React.DragEvent<HTMLTableRowElement>,
    draggedRow: T,
  ) => {
    e.dataTransfer.setData("draggedRow", JSON.stringify(draggedRow));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent<HTMLTableRowElement>,
    targetRow: T,
  ) => {
    e.preventDefault();
    const draggedRowData = e.dataTransfer.getData("draggedRow");
    const draggedRow: T = JSON.parse(draggedRowData);
    if (onDragEnter) onDragEnter(draggedRow, targetRow);
    setExpandedRows({});
  };

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows((prevExpandedRows) => ({
      ...prevExpandedRows,
      [rowId]: !prevExpandedRows[rowId],
    }));
  };

  const actionOnClick = (action: ActionType<T>, row: T) => {
    if (action.setRow) action.setRow(row);
    if (action.onClick) action.onClick(row);
    if (action?.isModal && action.setIsModal) {
      if (isSelectionActive) {
        if (selectedRows.length === 0) {
          toast.error(
            t("Please select at least one row to perform this action."),
          );
          return;
        }
      }
      action?.setIsModal(true);
    } else if (action.isPath && action.path) {
      navigate(action.path);
    }
  };

  const isRowSelected = (row: T) => isRowSelectedInList(selectedRows, row);

  const toggleSelectedRow = (row: T) => {
    setSelectedRows(toggleRowInSelection(selectedRows, row));
  };

  const allVisibleSelected = areAllVisibleSelected(selectedRows, currentRows);

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
    toggleRowExpansion,
    actionOnClick,
    isRowSelected,
    toggleSelectedRow,
    allVisibleSelected,
  };
};
