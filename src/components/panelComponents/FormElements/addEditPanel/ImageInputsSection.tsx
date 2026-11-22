import React from "react";
import { useTranslation } from "react-i18next";
import { FormElementsState, NO_IMAGE_URL } from "../../../../types";
import { GenericInputType } from "../../shared/types";

type ImageInputsSectionProps = {
  imageInputs: GenericInputType[];
  formElements: FormElementsState;
  onFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    input: GenericInputType,
  ) => void;
};

export const ImageInputsSection = ({
  imageInputs,
  formElements,
  onFileChange,
}: ImageInputsSectionProps) => {
  const { t } = useTranslation();

  return (
    <div>
      {/* Image inputs */}
      {imageInputs.map((input) => {
        const value = formElements[input.formKey];
        // If value is a File object, create a preview URL
        const imageSrc =
          value instanceof File
            ? URL.createObjectURL(value)
            : typeof value === "string" && value
              ? value
              : NO_IMAGE_URL;

        return (
          <div className="flex flex-col gap-2" key={input.formKey}>
            <img
              src={imageSrc}
              alt="image"
              className="w-full h-40 object-contain rounded-md"
            />
            <label
              key={input.formKey}
              className="w-fit ml-auto inline-block bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded-md cursor-pointer my-auto border-b sm:border-b-0"
            >
              {t("Upload")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  onFileChange(e, input);
                }}
                className="hidden"
              />
            </label>
          </div>
        );
      })}
    </div>
  );
};
