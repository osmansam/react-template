import { Dispatch, SetStateAction } from "react";
import { RowPerPageEnum } from "../../../../types";
import { GenericButton } from "../../FormElements/GenericButton";
import { Caption } from "../../Typography";

type TablePaginationFooterProps = {
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  rowsPerPageOptions?: number[];
  usedTotalRows: number;
  usedTotalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setExpandedRows: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
  isPagination: boolean;
  t: (key: string) => string;
};

export const TablePaginationFooter = ({
  rowsPerPage,
  setRowsPerPage,
  rowsPerPageOptions,
  usedTotalRows,
  usedTotalPages,
  currentPage,
  setCurrentPage,
  setExpandedRows,
  isPagination,
  t,
}: TablePaginationFooterProps) => (
  <div className="w-fit ml-auto flex flex-row gap-4">
    <div className="flex flex-row gap-2 px-6 items-center">
      <Caption>{t("Rows per page")}:</Caption>
      <select
        className=" rounded-md py-2 flex items-center focus:outline-none h-8 text-xs cursor-pointer"
        value={rowsPerPage}
        onChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          const totalNewPages = Math.ceil(
            usedTotalRows / Number(e.target.value),
          );
          if (currentPage > totalNewPages) {
            setCurrentPage(Number(totalNewPages));
          }
        }}
      >
        {rowsPerPageOptions?.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
        <option value={RowPerPageEnum.ALL}>{t("ALL")}</option>
      </select>
    </div>
    {isPagination && (
      <div className=" flex flex-row gap-2 items-center">
        <Caption>
          {Math.min((currentPage - 1) * rowsPerPage + 1, usedTotalRows)}–
          {Math.min(currentPage * rowsPerPage, usedTotalRows)} {"of"}{" "}
          {usedTotalRows}
        </Caption>
        <div className="flex flex-row gap-4">
          <GenericButton
            onClick={() => {
              if (currentPage > 1) {
                setCurrentPage(Number(currentPage) - 1);
                setExpandedRows({});
              }
            }}
            variant="ghost"
            size="sm"
            disabled={currentPage === 1}
          >
            {"<"}
          </GenericButton>
          <GenericButton
            onClick={() => {
              if (currentPage < usedTotalPages) {
                setCurrentPage(Number(currentPage) + 1);
                setExpandedRows({});
              }
            }}
            variant="ghost"
            size="sm"
            disabled={currentPage === usedTotalPages}
          >
            {">"}
          </GenericButton>
        </div>
      </div>
    )}
  </div>
);
