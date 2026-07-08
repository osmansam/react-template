import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  close: () => void;
  generalClassName?: string;
  img: string;
};

const ImageModal = ({ isOpen, close, generalClassName, img }: Props) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-2xl leading-none text-neutral-700 shadow-lg transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label="Close image preview"
        >
          ×
        </button>
        <img
          src={img}
          alt="Full-size preview"
          className={`max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl ${generalClassName || ""}`}
        />
      </div>
    </div>,
    document.body,
  );
};

export default ImageModal;
