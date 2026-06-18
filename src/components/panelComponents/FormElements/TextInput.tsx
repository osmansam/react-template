import { useEffect, useRef, useState } from "react";
import { SketchPicker } from "react-color";
import "react-day-picker/dist/style.css";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FiMinusCircle } from "react-icons/fi";
import { GoPlusCircle } from "react-icons/go";
import { IoIosClose } from "react-icons/io";
import {
  MdOutlineCheckBox,
  MdOutlineCheckBoxOutlineBlank,
} from "react-icons/md";
import { H6 } from "../Typography";
import { GenericButton } from "./GenericButton";

type TextInputProps = {
  label?: string;
  placeholder?: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (value: any) => void;
  className?: string;
  disabled?: boolean;
  onClear?: () => void;
  isDatePicker?: boolean;
  isTopFlexRow?: boolean;
  inputWidth?: string;
  requiredField?: boolean;
  isDateInitiallyOpen?: boolean;
  minNumber?: number;
  maxNumber?: number;
  isMinNumber?: boolean;
  isNumberButtonsActive?: boolean;
  isOnClearActive?: boolean;
  isDebounce?: boolean;
  isDatePickerLabel?: boolean;
  isReadOnly?: boolean;
  error?: string; // Validation error message
};

const TextInput = ({
  label,
  placeholder,
  value,
  type,
  onChange,
  disabled,
  isTopFlexRow,
  onClear,
  inputWidth,
  minNumber = 0,
  maxNumber,
  isMinNumber = true,
  isNumberButtonsActive = false,
  isOnClearActive = true,
  requiredField = false,
  isDebounce = false,
  isReadOnly = false,
  error,
  className = "px-3 py-2 border border-neutral-200 rounded-lg __className_a182b8 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all",
}: TextInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleDivClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Debounce onChange
  const handleChange = (e: { target: { value: string | number } }) => {
    const inputValue = e.target.value;

    // Allow empty string for number inputs during editing
    if (type === "number" && inputValue === "") {
      setLocalValue("");
      if (isDebounce) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        const timer = setTimeout(() => {
          onChange(isMinNumber ? minNumber : "");
        }, 1000);
        setDebounceTimer(timer);
      } else {
        onChange(isMinNumber ? minNumber : "");
      }
      return;
    }

    const newValue =
      type === "number"
        ? Math.min(
            maxNumber ?? Number.POSITIVE_INFINITY,
            isMinNumber
              ? Math.max(Number(minNumber), Number(inputValue))
              : Number(inputValue),
          )
        : inputValue;
    setLocalValue(newValue);
    if (isDebounce) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(() => {
        onChange(newValue);
      }, 1000);
      setDebounceTimer(timer);
    } else {
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    if (disabled || isReadOnly) return;
    if (type === "number") {
      const newValue = Math.min(
        maxNumber ?? Number.POSITIVE_INFINITY,
        Math.max(minNumber, +localValue + 1),
      );
      setLocalValue(newValue);

      if (isDebounce) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        const timer = setTimeout(() => {
          onChange(newValue);
        }, 1000);
        setDebounceTimer(timer);
      } else {
        onChange(newValue);
      }

      if (inputRef.current) {
        inputRef.current.readOnly = true;
        setTimeout(() => {
          if (inputRef.current) inputRef.current.readOnly = false;
        }, 0);
      }
    }
  };
  const handleDecrement = () => {
    if (disabled || isReadOnly) return;
    if (type === "number" && +localValue > minNumber) {
      const newValue = Math.max(minNumber, +localValue - 1);
      setLocalValue(newValue);

      if (isDebounce) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        const timer = setTimeout(() => {
          onChange(newValue);
        }, 1000);
        setDebounceTimer(timer);
      } else {
        onChange(newValue);
      }

      if (inputRef.current) {
        inputRef.current.readOnly = true;
        setTimeout(() => {
          if (inputRef.current) inputRef.current.readOnly = false;
        }, 0);
      }
    }
  };

  const inputClassName = `${className} ${
    inputWidth ? "border-neutral-200" : ""
  } w-full text-sm ${
    type === "number" ? "inputHideNumberArrows" : ""
  } placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed ${
    error
      ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
      : ""
  }`;

  const handleWheel = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };
  const isInputLocked = disabled || isReadOnly;

  if (type === "color") {
    return (
      <div
        className={` flex ${
          isTopFlexRow ? "flex-row sm:flex-col" : "flex-col"
        } gap-2  w-full items-center`}
      >
        <H6 className="min-w-10 text-sm font-medium text-neutral-700">
          {label}
          {requiredField && (
            <>
              <span className="text-error-500">* </span>
            </>
          )}
        </H6>
        <div className=" flex flex-row gap-2 ">
          <SketchPicker
            color={value}
            onChange={(color) => {
              onChange(color.hex);
            }}
          />

          <GenericButton
            onClick={() => {
              onChange("");
            }}
            variant="danger"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <IoIosClose size={20} />
          </GenericButton>
        </div>
      </div>
    );
  }
  if (type === "checkbox") {
    return (
      <div className="flex justify-between items-center w-full">
        {/* Label on the left */}
        <H6 className="my-auto text-sm font-medium text-neutral-700">
          {label}
          {requiredField && <span className="text-error-500">*</span>}
        </H6>

        {/* Icon on the right */}
        <GenericButton
          type="button"
          disabled={disabled}
          onClick={() => {
            const newValue = !(localValue ?? value);
            setLocalValue(newValue);
            onChange(newValue);
          }}
          variant="icon"
        >
          {localValue ?? value ? (
            <MdOutlineCheckBox className="h-6 w-6" />
          ) : (
            <MdOutlineCheckBoxOutlineBlank className="h-6 w-6" />
          )}
        </GenericButton>
      </div>
    );
  }

  return (
    <div
      className={` flex ${isTopFlexRow ? "flex-row gap-4 " : "flex-col gap-2"}`}
      onClick={handleDivClick}
    >
      <H6
        className={`${
          isTopFlexRow ? "min-w-20 " : "min-w-10"
        } my-auto text-sm font-medium text-neutral-700`}
      >
        {label}
        {requiredField && (
          <>
            <span className="text-error-500">* </span>
          </>
        )}
      </H6>
      <div
        className={`flex items-center justify-end ${
          isNumberButtonsActive ? "gap-4" : "gap-2"
        } ${inputWidth ? inputWidth : "w-full"} relative`}
      >
        <input
          id={"number-input"}
          ref={inputRef}
          type={
            type === "password" && !showPassword
              ? "password"
              : type === "password"
              ? "text"
              : type
          }
          style={{
            fontSize: "16px",
          }}
          placeholder={placeholder}
          disabled={isInputLocked}
          value={localValue}
          onChange={handleChange}
          className={inputClassName}
          {...(type === "number"
            ? {
                ...(isMinNumber ? { min: minNumber } : {}),
                ...(maxNumber !== undefined ? { max: maxNumber } : {}),
              }
            : {})}
          onWheel={type === "number" ? handleWheel : undefined}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-neutral-500 hover:text-neutral-700 focus:outline-none transition-colors"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={18} />
            ) : (
              <AiOutlineEye size={18} />
            )}
          </button>
        )}
        {isNumberButtonsActive && (
          <FiMinusCircle
            className={`w-7 h-7 flex-shrink-0 focus:outline-none transition-colors active:scale-95 ${
              isInputLocked
                ? "text-neutral-300 cursor-not-allowed"
                : "text-error-500 hover:text-error-600 cursor-pointer"
            }`}
            onClick={handleDecrement}
          />
        )}
        {isNumberButtonsActive && (
          <GoPlusCircle
            className={`w-7 h-7 flex-shrink-0 focus:outline-none transition-colors active:scale-95 ${
              isInputLocked
                ? "text-neutral-300 cursor-not-allowed"
                : "text-success-500 hover:text-success-600 cursor-pointer"
            }`}
            onClick={handleIncrement}
          />
        )}
        {onClear && isOnClearActive && (
          <GenericButton
            onClick={() => {
              setLocalValue("");
              onClear();
            }}
            variant="icon"
            className="w-8 h-8 my-auto text-xl text-neutral-400 hover:text-neutral-600"
          >
            <IoIosClose size={24} />
          </GenericButton>
        )}
      </div>
      {error && <p className="text-error-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default TextInput;
