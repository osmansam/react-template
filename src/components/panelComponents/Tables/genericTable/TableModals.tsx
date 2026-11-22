import ImageModal from "../../Modals/ImageModal";
import { ActionType } from "../../shared/types";

type TableModalsProps<T> = {
  actions?: ActionType<T>[];
  selectionActions?: ActionType<T>[];
  collapsibleActions?: ActionType<T>[];
  addButton?: ActionType<T>;
  addCollapsible?: ActionType<T>;
  isImageModalOpen: boolean;
  imageModalSrc: string;
  onCloseImageModal: () => void;
};

export const TableModals = <T,>({
  actions,
  selectionActions,
  collapsibleActions,
  addButton,
  addCollapsible,
  isImageModalOpen,
  imageModalSrc,
  onCloseImageModal,
}: TableModalsProps<T>) => (
  <>
    {actions?.map((action, index) => {
      if (action?.isModal && action?.isModalOpen && action?.modal) {
        return <div key={index}>{action.modal}</div>;
      }
      return null;
    })}
    {selectionActions?.map((action, index) => {
      if (action?.isModal && action?.isModalOpen && action?.modal) {
        return <div key={index}>{action.modal}</div>;
      }
      return null;
    })}
    {collapsibleActions?.map((action, index) => {
      if (action?.isModal && action?.isModalOpen && action?.modal) {
        return <div key={index}>{action.modal}</div>;
      }
      return null;
    })}
    {addButton?.isModal && addButton?.isModalOpen && addButton?.modal && (
      <div>{addButton.modal}</div>
    )}
    {addCollapsible?.isModal &&
      addCollapsible?.isModalOpen &&
      addCollapsible?.modal && <div>{addCollapsible.modal}</div>}
    {isImageModalOpen && (
      <ImageModal
        isOpen={isImageModalOpen}
        close={onCloseImageModal}
        img={imageModalSrc}
      />
    )}
  </>
);
