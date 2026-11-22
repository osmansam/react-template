import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown } from "react-icons/fa6";
import { IoIosClose } from "react-icons/io";
import { GenericInputType } from "../../shared/types";
import { H6 } from "../../Typography";
import { GenericButton } from "../GenericButton";

type TextareaFieldProps = {
  input: GenericInputType;
  value: string;
  isInputRequired: boolean;
  isInputDisabled: boolean;
  openFor: string | null;
  setOpenFor: React.Dispatch<React.SetStateAction<string | null>>;
  onChange: (value: string) => void;
};

export const TextareaField = ({
  input,
  value,
  isInputRequired,
  isInputDisabled,
  openFor,
  setOpenFor,
  onChange,
}: TextareaFieldProps) => {
  const { t } = useTranslation();

  return (
    <div key={input.formKey} className="flex flex-col gap-2 relative">
      <div className="flex items-center">
        <H6>{input.label}</H6>
        {isInputRequired && (
          <>
            <span className="text-red-400">*</span>
            <span className="text-xs text-gray-400">({t("required")})</span>
          </>
        )}
        {input?.options && input?.options?.length > 0 && (
          <GenericButton
            variant="icon"
            size="sm"
            className="ml-2 p-1"
            onClick={() =>
              setOpenFor((prev) =>
                prev === input.formKey ? null : input.formKey,
              )
            }
          >
            <FaChevronDown size={16} />
          </GenericButton>
        )}
      </div>

      {openFor === input.formKey && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpenFor(null)}
          />

          {/* dropdown */}
          <ul className="absolute z-20 mt-1 w-full bg-white border rounded shadow-md max-h-40 overflow-auto">
            {/* full-width cancel row */}
            <li
              className="px-3 py-2 text-red-500 cursor-pointer hover:bg-gray-100"
              onMouseDown={() => setOpenFor(null)}
            >
              {t("Close Selection")}
            </li>

            {input.options!.map((opt) => (
              <li
                key={opt.value}
                onMouseDown={() => {
                  onChange(opt.value as string);
                  setOpenFor(null);
                }}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder}
          disabled={input.isReadOnly || isInputDisabled || false}
          className={`border text-base border-gray-300 rounded-md p-2 w-full ${input.inputClassName}`}
        />
        {value && (
          <GenericButton
            variant="icon"
            size="sm"
            className="absolute top-2 right-2 text-gray-500 hover:text-red-600 p-0"
            onClick={() => onChange("")}
          >
            <IoIosClose size={28} />
          </GenericButton>
        )}
      </div>
    </div>
  );
};
