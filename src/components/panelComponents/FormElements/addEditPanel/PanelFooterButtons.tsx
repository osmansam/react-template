import { useTranslation } from "react-i18next";
import { GenericButton } from "../GenericButton";
import { AdditionalButtonProps } from "./types";

type PanelFooterButtonsProps = {
  cancelButtonLabel: string;
  isCancelConfirmationDialogExist: boolean;
  onRequestCancelConfirmation: () => void;
  onCancelClick: () => void;
  additionalButtons?: AdditionalButtonProps[];
  allRequiredFilled: boolean;
  onAdditionalButtonClick: (button: AdditionalButtonProps) => void;
  isSubmitButtonActive: boolean;
  hasValidationErrors: boolean;
  hasBlockedDependentSelect: boolean;
  optionalCreateButtonActive?: boolean;
  isSubmitting: boolean;
  isCreateConfirmationDialogExist: boolean;
  onRequestCreateConfirmation: () => void;
  onCreateClick: () => void;
  buttonName?: string;
  isEditMode: boolean;
};

export const PanelFooterButtons = ({
  cancelButtonLabel,
  isCancelConfirmationDialogExist,
  onRequestCancelConfirmation,
  onCancelClick,
  additionalButtons,
  allRequiredFilled,
  onAdditionalButtonClick,
  isSubmitButtonActive,
  hasValidationErrors,
  hasBlockedDependentSelect,
  optionalCreateButtonActive,
  isSubmitting,
  isCreateConfirmationDialogExist,
  onRequestCreateConfirmation,
  onCreateClick,
  buttonName,
  isEditMode,
}: PanelFooterButtonsProps) => {
  const { t } = useTranslation();

  const isSubmitBlocked =
    hasValidationErrors ||
    hasBlockedDependentSelect ||
    (!allRequiredFilled && !optionalCreateButtonActive);

  return (
    <div className="ml-auto flex flex-row gap-4 mt-auto ">
      <GenericButton
        variant="danger"
        size="md"
        onClick={() => {
          isCancelConfirmationDialogExist
            ? onRequestCancelConfirmation()
            : onCancelClick();
        }}
      >
        {t(cancelButtonLabel)}
      </GenericButton>
      {additionalButtons &&
        additionalButtons.map((button, index) => (
          <GenericButton
            key={index}
            variant={
              button.isInputRequirementCheck && !allRequiredFilled
                ? "secondary"
                : "primary"
            }
            size="md"
            onClick={() => onAdditionalButtonClick(button)}
          >
            {t(button.label)}
          </GenericButton>
        ))}
      {isSubmitButtonActive && (
        <GenericButton
          variant={isSubmitBlocked ? "secondary" : "primary"}
          disabled={isSubmitting || isSubmitBlocked}
          size="md"
          onClick={() => {
            if (isCreateConfirmationDialogExist) {
              onRequestCreateConfirmation();
            } else {
              onCreateClick();
            }
          }}
        >
          {buttonName ? buttonName : isEditMode ? t("Update") : t("Create")}
        </GenericButton>
      )}
    </div>
  );
};
