// pages/CanPage.tsx
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit } from "react-icons/fi";
import { HiOutlineTrash } from "react-icons/hi2";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import GenericAddEditPanel from "../components/panelComponents/FormElements/GenericAddEditPanel";
import {
  FormKeyTypeEnum,
  InputTypes,
} from "../components/panelComponents/shared/types";
import GenericTable from "../components/panelComponents/Tables/GenericTable";
import { UpdatePayload } from "../utils/api";
import { useDynamicCrud, useGetDynamicItems } from "../utils/dynamic";

type CanItem = {
  _id: string;
  ad: string;
  soyad: string;
  age: number;
};

export default function CanPage() {
  const { t } = useTranslation();
  const { createDynamicItem, updateDynamicItem, deleteDynamicItem } =
    useDynamicCrud<CanItem>("can");
  const items = useGetDynamicItems<CanItem>("can");
  console.log("items", items);
  const columns = useMemo(
    () => [
      { key: t("Ad"), isSortable: true },
      { key: t("Soyad"), isSortable: true },
      { key: t("Age"), isSortable: true },
      { key: t("Actions"), isSortable: false },
    ],
    [t]
  );
  const rowKeys = useMemo(
    () => [{ key: "ad" }, { key: "soyad" }, { key: "age" }],
    []
  );
  const inputs = useMemo(
    () => [
      {
        type: InputTypes.TEXT,
        formKey: "ad",
        label: t("Ad"),
        placeholder: t("Ad"),
        required: true,
      },
      {
        type: InputTypes.TEXT,
        formKey: "soyad",
        label: t("Soyad"),
        placeholder: t("Soyad"),
        required: true,
      },
      {
        type: InputTypes.NUMBER,
        formKey: "age",
        label: t("Age"),
        placeholder: t("Age"),
        required: true,
      },
    ],
    [t]
  );

  const formKeys = useMemo(
    () => [
      { key: "ad", type: FormKeyTypeEnum.STRING },
      { key: "soyad", type: FormKeyTypeEnum.STRING },
      { key: "age", type: FormKeyTypeEnum.NUMBER },
    ],
    []
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [rowToAction, setRowToAction] = useState<CanItem | null>(null);
  // Wrapper function to match GenericAddEditPanel's expected interface
  const handleSubmitItem = useCallback(
    (item: CanItem | UpdatePayload<CanItem>) => {
      if ("id" in item && "updates" in item) {
        updateDynamicItem(item.id, item.updates);
      } else {
        createDynamicItem(item);
      }
    },
    [updateDynamicItem, createDynamicItem]
  );
  const addButton = useMemo(
    () => ({
      name: t("Add"),
      isModal: true,
      modal: (
        <GenericAddEditPanel
          isOpen={isAddOpen}
          close={() => setIsAddOpen(false)}
          inputs={inputs}
          formKeys={formKeys}
          submitItem={handleSubmitItem}
          topClassName="flex flex-col gap-2"
        />
      ),
      isModalOpen: isAddOpen,
      setIsModal: setIsAddOpen,
      isPath: false,
      icon: null,
      className: "bg-blue-500 hover:text-blue-500 hover:border-blue-500",
    }),
    [t, isAddOpen, inputs, formKeys, handleSubmitItem]
  );
  const actions = useMemo(
    () => [
      {
        name: t("Delete"),
        icon: <HiOutlineTrash />,
        setRow: setRowToAction as (value: CanItem) => void,
        modal: rowToAction ? (
          <ConfirmationDialog
            isOpen={isDeleteOpen}
            close={() => setIsDeleteOpen(false)}
            confirm={() => {
              deleteDynamicItem(rowToAction._id);
              setIsDeleteOpen(false);
            }}
            title={t("Delete")}
            text={t("GeneralDeleteMessage")}
          />
        ) : null,
        className: "text-red-500 cursor-pointer text-2xl ml-auto",
        isModal: true,
        isModalOpen: isDeleteOpen,
        setIsModal: setIsDeleteOpen,
        isPath: false,
      },
      {
        name: t("Edit"),
        icon: <FiEdit />,
        className: "text-blue-500 cursor-pointer text-xl mr-auto",
        isModal: true,
        setRow: setRowToAction as (value: CanItem) => void,
        modal: rowToAction ? (
          <GenericAddEditPanel
            isOpen={isEditOpen}
            close={() => setIsEditOpen(false)}
            inputs={inputs}
            formKeys={formKeys}
            submitItem={handleSubmitItem}
            isEditMode
            topClassName="flex flex-col gap-2"
            itemToEdit={{ id: rowToAction._id, updates: rowToAction }}
          />
        ) : null,
        isModalOpen: isEditOpen,
        setIsModal: setIsEditOpen,
        isPath: false,
      },
    ],
    [
      t,
      rowToAction,
      isDeleteOpen,
      isEditOpen,
      deleteDynamicItem,
      handleSubmitItem,
      inputs,
      formKeys,
    ]
  );
  const rows = useMemo(() => items || [], [items]);

  return (
    <div className="w-[95%] mx-auto">
      <GenericTable
        rowKeys={rowKeys}
        actions={actions}
        columns={columns}
        rows={rows}
        title={t("Can Page")}
        addButton={addButton}
        isCollapsible={false}
        isActionsActive={true}
      />
    </div>
  );
}
