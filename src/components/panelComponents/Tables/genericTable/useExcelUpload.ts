import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { Field } from "../../../../utils/api/container";
import { ColumnType, RowKeyType } from "../../shared/types";
import { parseExcelRows } from "./excelUtils";

type UseExcelUploadParams<T> = {
  usedColumns: ColumnType[] | undefined;
  usedRowKeys: RowKeyType<T>[];
  containerFields?: Field[];
  onExcelUpload?: (items: Partial<T>[]) => void;
  t: (key: string) => string;
};

export const useExcelUpload = <T,>({
  usedColumns,
  usedRowKeys,
  containerFields,
  onExcelUpload,
  t,
}: UseExcelUploadParams<T>) => {
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const buffer = e.target?.result;
      if (buffer) {
        try {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(buffer, { type: "array" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          if (!data || data.length === 0) {
            toast.error(t("No data found in the Excel file"));
            return;
          }

          const items = parseExcelRows(
            data,
            usedColumns,
            usedRowKeys,
            containerFields,
          );

          if (items.length > 0 && onExcelUpload) {
            onExcelUpload(items as Partial<T>[]);
            toast.success(t(`${items.length} items uploaded successfully`));
          } else if (items.length === 0) {
            toast.warning(t("No valid items found in the Excel file"));
          }
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          toast.error(t("Error reading Excel file"));
        }
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      toast.error(t("Error reading file"));
    };
    reader.readAsArrayBuffer(file);
    // Reset the input so the same file can be uploaded again
    event.target.value = "";
  };

  const handleUploadClick = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.click();
    } else {
      toast.error(t("Upload input is not available"));
    }
  };

  return {
    isExcelMenuOpen,
    setIsExcelMenuOpen,
    uploadInputRef,
    handleUploadExcel,
    handleUploadClick,
  };
};
