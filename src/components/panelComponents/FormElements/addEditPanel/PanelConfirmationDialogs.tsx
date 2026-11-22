import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "../../../../common/ConfirmationDialog";

type PanelConfirmationDialogsProps = {
  isCancelConfirmationDialogOpen: boolean;
  onCloseCancelDialog: () => void;
  onConfirmCancel: () => void;
  isCreateConfirmationDialogOpen: boolean;
  onCloseCreateDialog: () => void;
  onConfirmCreate: () => void;
  createConfirmationDialogHeader?: string;
  createConfirmationDialogText?: string;
  isConfirmationDialogOpen: boolean;
  onCloseConfirmationDialog: () => void;
  onConfirmDialog: () => void;
  confirmationDialogHeader?: string;
  confirmationDialogText?: string;
};

export const PanelConfirmationDialogs = ({
  isCancelConfirmationDialogOpen,
  onCloseCancelDialog,
  onConfirmCancel,
  isCreateConfirmationDialogOpen,
  onCloseCreateDialog,
  onConfirmCreate,
  createConfirmationDialogHeader,
  createConfirmationDialogText,
  isConfirmationDialogOpen,
  onCloseConfirmationDialog,
  onConfirmDialog,
  confirmationDialogHeader,
  confirmationDialogText,
}: PanelConfirmationDialogsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {isCancelConfirmationDialogOpen && (
        <ConfirmationDialog
          isOpen={isCancelConfirmationDialogOpen}
          close={onCloseCancelDialog}
          confirm={onConfirmCancel}
          title={t("Cancel Entry")}
          text={`${t("Are you sure you want to cancel this entry?")}`}
        />
      )}
      {isCreateConfirmationDialogOpen && (
        <ConfirmationDialog
          isOpen={isCreateConfirmationDialogOpen}
          close={onCloseCreateDialog}
          confirm={onConfirmCreate}
          title={createConfirmationDialogHeader ?? t("Create Entry")}
          text={
            createConfirmationDialogText ??
            `${t("Are you sure you want to create this entry?")}`
          }
        />
      )}
      {isConfirmationDialogOpen && (
        <ConfirmationDialog
          isOpen={isConfirmationDialogOpen}
          close={onCloseConfirmationDialog}
          confirm={onConfirmDialog}
          title={confirmationDialogHeader ?? t("Create Entry")}
          text={
            confirmationDialogText ??
            `${t("Are you sure you want to create this entry?")}`
          }
        />
      )}
    </>
  );
};
