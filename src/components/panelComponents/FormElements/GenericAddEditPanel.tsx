import { createPortal } from "react-dom";
import { H6 } from "../Typography";
import TabInputScreen from "./TabInputScreen";
import { FormFieldRenderer } from "./addEditPanel/FormFieldRenderer";
import { ImageInputsSection } from "./addEditPanel/ImageInputsSection";
import { PanelConfirmationDialogs } from "./addEditPanel/PanelConfirmationDialogs";
import { PanelFooterButtons } from "./addEditPanel/PanelFooterButtons";
import { GenericAddEditPanelProps } from "./addEditPanel/types";
import { useAddEditForm } from "./addEditPanel/useAddEditForm";

type Props<T> = GenericAddEditPanelProps<T>;

const GenericAddEditPanel = <T,>({
  isOpen,
  close,
  inputs,
  formKeys,
  additionalButtons,
  topClassName,
  generalClassName,
  buttonName,
  constantValues,
  isEditMode = false,
  itemToEdit,
  handleUpdate,
  anotherPanel,
  optionalCreateButtonActive,
  allowOptionalSubmitForActivityTable,
  cancelButtonLabel = "Cancel",
  submitFunction,
  additionalSubmitFunction,
  additionalCancelFunction,
  isSubmitButtonActive = true,
  isCancelConfirmationDialogExist = false,
  isCreateConfirmationDialogExist = false,
  createConfirmationDialogText,
  createConfirmationDialogHeader,
  isCreateCloseActive = true,
  anotherPanelTopClassName,
  isConfirmationDialogRequired,
  confirmationDialogText,
  confirmationDialogHeader,
  upperMessage,
  setForm,
  submitItem,
  nonImageInputsClassName,
}: Props<T>) => {
  const {
    isTabInputScreenOpen,
    tabInputScreenOptions,
    modalRef,
    formElements,
    setFormElements,
    imageInputs,
    nonImageInputs,
    resetTextInput,
    openFor,
    setOpenFor,
    attemptedSubmit,
    fieldErrors,
    isSubmitting,
    allRequiredFilled,
    hasBlockedDependentSelect,
    hasValidationErrors,
    isValueEmpty,
    isConfirmationDialogOpen,
    setIsConfirmationDialogOpen,
    confirmationDialogFunction,
    setConfirmationDialogFunction,
    isCancelConfirmationDialogOpen,
    setIsCancelConfirmationDialogOpen,
    isCreateConfirmationDialogOpen,
    setIsCreateConfirmationDialogOpen,
    handleFileChange,
    handleInputClear,
    handleFieldChange,
    handleSelectChange,
    handleCancelButtonClick,
    handleCreateButtonClick,
    handleAdditionalButtonClick,
  } = useAddEditForm({
    isOpen,
    close,
    inputs,
    formKeys,
    constantValues,
    isEditMode,
    itemToEdit,
    handleUpdate,
    optionalCreateButtonActive,
    allowOptionalSubmitForActivityTable,
    submitFunction,
    additionalSubmitFunction,
    additionalCancelFunction,
    isCreateCloseActive,
    isConfirmationDialogRequired,
    setForm,
    submitItem,
  });

  const renderGenericAddEditModal = () => {
    if (isTabInputScreenOpen) {
      return (
        <TabInputScreen
          options={tabInputScreenOptions.map((o) => ({
            value: o.value,
            label: o.label,
            imageUrl: o.imageUrl,
            keywords: o?.keywords,
            triggerExtraModal: o?.triggerExtraModal,
          }))}
          topClassName={generalClassName}
          formElements={formElements}
          setFormElements={setFormElements}
          inputs={inputs}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setForm={setForm as any}
        />
      );
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        className={`bg-white rounded-md shadow-lg ${
          anotherPanelTopClassName
            ? ""
            : "w-11/12 md:w-3/4 lg:w-1/2 xl:w-2/5 max-w-full"
        }   max-h-[90vh]   ${generalClassName} `}
      >
        <div className="rounded-tl-md rounded-tr-md px-4  flex flex-col gap-4 py-6 justify-between  h-full">
          {upperMessage?.length && upperMessage?.length > 0 && (
            <div className="flex flex-col px-4 py-2 border-b space-y-1">
              {upperMessage.map((msg, index) => (
                <H6 key={index}>{msg}</H6>
              ))}
            </div>
          )}
          <div
            className={`${
              topClassName
                ? topClassName
                : "grid grid-cols-1 md:grid-cols-2 gap-4 "
            }`}
          >
            <ImageInputsSection
              imageInputs={imageInputs}
              formElements={formElements}
              onFileChange={handleFileChange}
            />
            <div
              className={`${
                nonImageInputsClassName
                  ? nonImageInputsClassName
                  : "flex flex-col gap-4"
              }`}
            >
              {/* nonimage inputs */}
              {nonImageInputs.map((input) => (
                <FormFieldRenderer
                  key={input.formKey}
                  input={input}
                  formElements={formElements}
                  setFormElements={setFormElements}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  setForm={setForm as any}
                  resetTextInput={resetTextInput}
                  attemptedSubmit={attemptedSubmit}
                  fieldErrors={fieldErrors}
                  openFor={openFor}
                  setOpenFor={setOpenFor}
                  isValueEmpty={isValueEmpty}
                  onFieldChange={handleFieldChange}
                  onSelectChange={handleSelectChange}
                  onInputClear={handleInputClear}
                />
              ))}
            </div>
          </div>
          <PanelFooterButtons
            cancelButtonLabel={cancelButtonLabel}
            isCancelConfirmationDialogExist={isCancelConfirmationDialogExist}
            onRequestCancelConfirmation={() =>
              setIsCancelConfirmationDialogOpen(true)
            }
            onCancelClick={handleCancelButtonClick}
            additionalButtons={additionalButtons}
            allRequiredFilled={allRequiredFilled}
            onAdditionalButtonClick={handleAdditionalButtonClick}
            isSubmitButtonActive={isSubmitButtonActive}
            hasValidationErrors={hasValidationErrors}
            hasBlockedDependentSelect={hasBlockedDependentSelect}
            optionalCreateButtonActive={optionalCreateButtonActive}
            isSubmitting={isSubmitting}
            isCreateConfirmationDialogExist={isCreateConfirmationDialogExist}
            onRequestCreateConfirmation={() =>
              setIsCreateConfirmationDialogOpen(true)
            }
            onCreateClick={handleCreateButtonClick}
            buttonName={buttonName}
            isEditMode={isEditMode}
          />
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="__className_a182b8 fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-75 z-[99999]">
      {anotherPanel ? (
        <div
          className={`${anotherPanelTopClassName} rounded-md bg-white relative z-10`}
        >
          {anotherPanel}
          {renderGenericAddEditModal()}
        </div>
      ) : (
        renderGenericAddEditModal()
      )}
      <PanelConfirmationDialogs
        isCancelConfirmationDialogOpen={isCancelConfirmationDialogOpen}
        onCloseCancelDialog={() => setIsCancelConfirmationDialogOpen(false)}
        onConfirmCancel={handleCancelButtonClick}
        isCreateConfirmationDialogOpen={isCreateConfirmationDialogOpen}
        onCloseCreateDialog={() => setIsCreateConfirmationDialogOpen(false)}
        onConfirmCreate={() => {
          handleCreateButtonClick();
          setIsCreateConfirmationDialogOpen(false);
        }}
        createConfirmationDialogHeader={createConfirmationDialogHeader}
        createConfirmationDialogText={createConfirmationDialogText}
        isConfirmationDialogOpen={isConfirmationDialogOpen}
        onCloseConfirmationDialog={() => {
          setIsConfirmationDialogOpen(false);
          setConfirmationDialogFunction(null);
        }}
        onConfirmDialog={() => {
          confirmationDialogFunction?.();
          setIsConfirmationDialogOpen(false);
          setConfirmationDialogFunction(null);
        }}
        confirmationDialogHeader={confirmationDialogHeader}
        confirmationDialogText={confirmationDialogText}
      />
    </div>,
    document.body,
  );
};

export default GenericAddEditPanel;
