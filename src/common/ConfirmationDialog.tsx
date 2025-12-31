import { Dialog, Transition } from "@headlessui/react";

export function ConfirmationDialog({
  isOpen,
  close,
  confirm,
  title,
  text,
}: {
  isOpen: boolean;
  close: () => void;
  confirm: () => void;
  title: string;
  text: string;
}) {
  return (
    <Transition
      show={isOpen}
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      <Dialog onClose={() => close()}>
        <Dialog.Overlay />
        <div
          id="popup"
          className="z-[99999] fixed w-full flex justify-center inset-0"
        >
          <div
            onClick={close}
            className="w-full h-full bg-neutral-900/40 backdrop-blur-sm z-0 absolute inset-0"
          />
          <div className="mx-auto container">
            <div className="flex items-center justify-center h-full w-full">
              <div className="bg-white rounded-xl shadow-xl fixed overflow-hidden sm:h-auto w-10/12 lg:w-1/4 border border-neutral-200">
                <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-center lg:justify-start">
                  <p className="text-base font-semibold text-neutral-900">
                    {title}
                  </p>
                </div>
                <div className="p-6 text-center">
                  <p className="text-sm text-neutral-600">{text}</p>
                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                      onClick={close}
                      className="px-4 py-2 bg-transparent hover:bg-neutral-100 rounded-lg text-sm font-medium text-neutral-700 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 shadow-sm rounded-lg text-sm font-medium text-white transition-all active:scale-95"
                      onClick={confirm}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
