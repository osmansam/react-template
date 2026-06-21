import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IoIosClose } from "react-icons/io";
import { MdArrowDropDown, MdOutlineDone } from "react-icons/md";
import Select, {
  ActionMeta,
  GroupBase,
  InputActionMeta,
  MultiValue,
  OptionProps,
  PropsValue,
  SingleValue,
  components,
} from "react-select";
import { OptionType } from "../../../types";
import { H6 } from "../Typography";
import { GenericButton } from "./GenericButton";

const CustomOption = (
  props: OptionProps<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { value: any; label: string },
    boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GroupBase<{ value: any; label: string }>
  >
) => (
  <components.Option {...props}>
    {props.label}
    {props.isSelected && (
      <MdOutlineDone className="text-blue-700 font-bold text-xl " />
    )}
  </components.Option>
);

interface SelectInputProps {
  label?: string;
  options: OptionType[];
  value: PropsValue<OptionType> | null;
  onChange: (
    value: SingleValue<OptionType> | MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>
  ) => void;
  onClear?: () => void;
  onChangeTrigger?: (
    value: SingleValue<OptionType> | MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>
  ) => void;
  placeholder?: string;
  isMultiple?: boolean;
  requiredField?: boolean;
  isAutoFill?: boolean;
  isOnClearActive?: boolean;
  isReadOnly?: boolean;
  isTopFlexRow?: boolean;
  suggestedOption?: { value: string; label: string }[] | null;
  isSortDisabled?: boolean;
  customControlBackgroundColor?: string;
}

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
};

const customFilterOption = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: { value: any; label: string },

  searchInput: string
) => {
  const normalizedLabel = normalizeText(option.label);
  const normalizedSearch = normalizeText(searchInput);
  return normalizedLabel.includes(normalizedSearch);
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}
const SelectInput = ({
  label,
  options,
  value,
  onChange,
  onChangeTrigger,
  isMultiple,
  placeholder,
  onClear,
  isOnClearActive = true,
  isAutoFill = true,
  requiredField = false,
  isReadOnly = false,
  isTopFlexRow = false,
  isSortDisabled = false,
  suggestedOption,
  customControlBackgroundColor,
}: SelectInputProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [isSearchable, setIsSearchable] = useState(false);
  const [isDownIconClicked, setIsDownIconClicked] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile(768);

  const sortedOptions = useMemo(() => {
    if (isSortDisabled) return options;

    return [...options].sort((a, b) => {
      const aStartsWith = normalizeText(a.label).startsWith(
        normalizeText(searchInput)
      );
      const bStartsWith = normalizeText(b.label).startsWith(
        normalizeText(searchInput)
      );
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;
      return a?.label?.localeCompare(b.label);
    });
  }, [options, searchInput, isSortDisabled]);
  const customStyles = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: (base: any, state: any) => ({
      ...base,
      border: state.isFocused ? "1px solid #171717" : "1px solid #e5e5e5",
      borderRadius: "0.5rem",
      fontSize: "0.875rem",
      minHeight: "36px",
      height: "auto",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(23, 23, 23, 0.1)" : "none",
      transition: "all 0.2s",
      "&:hover": {
        borderColor: state.isFocused ? "#171717" : "#d4d4d4",
      },
      ...(customControlBackgroundColor && {
        backgroundColor: customControlBackgroundColor,
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menu: (base: any) => ({
      ...base,
      borderRadius: "0.625rem",
      border: "1px solid #e5e5e5",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
      overflow: "hidden",
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menuList: (base: any) => ({
      ...base,
      padding: "4px",
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    option: (base: any, state: any) => ({
      ...base,
      borderRadius: "0.375rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      margin: "2px 0",
      color: state.isSelected ? "#171717" : "#525252",
      cursor: "pointer",
      backgroundColor: state.isSelected ? "#f5f5f5" : "transparent",
      "&:hover": {
        backgroundColor: "#fafafa",
        color: "#171717",
      },
      fontSize: "0.875rem",
      transition: "all 0.15s",
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    placeholder: (base: any) => ({
      ...base,
      color: "#a3a3a3",
      fontSize: "0.875rem",
      fontWeight: 400,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    singleValue: (base: any) => ({
      ...base,
      fontSize: "0.875rem",
      color: "#171717",
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#f5f5f5",
      borderRadius: "0.375rem",
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#171717",
      fontSize: "0.875rem",
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#737373",
      "&:hover": {
        backgroundColor: "#e5e5e5",
        color: "#171717",
      },
    }),
  };

  const handleInputChange = useCallback(
    (newValue: string, actionMeta: InputActionMeta) => {
      if (actionMeta.action === "input-change") {
        setSearchInput(newValue);
        return newValue;
      }
    },
    []
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DropdownIndicator = (props: any) => {
    return (
      <components.DropdownIndicator {...props}>
        <MdArrowDropDown
          className="text-neutral-500 text-xl transition-colors hover:text-neutral-700"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsSearchable(false);
            setIsDownIconClicked(true);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            setIsSearchable(false);
            setIsDownIconClicked(true);
          }}
        />
      </components.DropdownIndicator>
    );
  };

  useEffect(() => {
    if (options.length === 1 && !value && isAutoFill) {
      const actionMeta: ActionMeta<OptionType> = {
        action: "select-option",
        option: options[0],
      };
      onChange(options[0], actionMeta);
      onChangeTrigger && onChangeTrigger(options[0], actionMeta);
    }
  }, [options, value, onChange]);

  return (
    <div
      ref={selectRef}
      className={`flex ${
        isTopFlexRow
          ? "flex-row items-center sm:flex-col sm:items-baseline "
          : "flex-col"
      } gap-2 __className_a182b8 `}
    >
      <H6 className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <span>{label}</span>
        {requiredField && <span className="text-error-500">*</span>}

        {Array.isArray(suggestedOption) &&
          suggestedOption
            // only keep suggestions that exist in the available options
            .filter((opt) => options.some((o) => o.value === opt.value))
            // exclude already selected ones
            .filter((opt) => {
              if (isMultiple) {
                const curr = (value as MultiValue<OptionType>) || [];
                return !curr.some((v) => v.value === opt.value);
              } else {
                const curr = value as SingleValue<OptionType> | null;
                return (curr?.value ?? null) !== opt.value;
              }
            })
            // render a button per remaining suggestion
            .map((opt) => (
              <GenericButton
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();

                  const candidate = opt as OptionType;
                  const actionMeta: ActionMeta<OptionType> = {
                    action: "select-option",
                    option: candidate,
                  };

                  if (isMultiple) {
                    const curr = (value as MultiValue<OptionType>) || [];
                    const next = [...curr, candidate];
                    onChange(next, actionMeta);
                    onChangeTrigger && onChangeTrigger(next, actionMeta);
                  } else {
                    onChange(candidate, actionMeta);
                    onChangeTrigger && onChangeTrigger(candidate, actionMeta);
                  }
                }}
                variant="outline"
                size="sm"
                className="ml-2 text-xs sm:text-sm rounded-full"
                title={`Use suggested: ${opt.label}`}
              >
                {opt.label}
              </GenericButton>
            ))}
      </H6>

      <div className="flex flex-row gap-2 w-full ">
        <div className="w-full ">
          {isMultiple ? (
            <Select
              isMulti
              options={options}
              onChange={(value, actionMeta) => {
                onChange(value, actionMeta);
                onChangeTrigger && onChangeTrigger(value, actionMeta);
              }}
              value={value}
              components={{ Option: CustomOption, DropdownIndicator }}
              placeholder={placeholder}
              styles={customStyles}
              closeMenuOnSelect={false}
              filterOption={customFilterOption}
              isSearchable={!isSearchable && !isDownIconClicked}
              onMenuClose={() => {
                setIsSearchable(false);
                setIsDownIconClicked(false);
              }}
              isDisabled={isReadOnly}
              menuShouldScrollIntoView={true}
              menuPlacement={isMobile ? "bottom" : "auto"}
              menuPosition={isMobile ? "absolute" : "fixed"}
            />
          ) : (
            <Select
              options={sortedOptions}
              onChange={(value, actionMeta) => {
                onChange(value, actionMeta);
                onChangeTrigger && onChangeTrigger(value, actionMeta);
                setIsSearchable(false);
                setIsDownIconClicked(false);
              }}
              value={value}
              components={{ Option: CustomOption, DropdownIndicator }}
              placeholder={placeholder}
              styles={customStyles}
              filterOption={customFilterOption}
              hideSelectedOptions={true}
              isSearchable={!isSearchable && !isDownIconClicked}
              onInputChange={handleInputChange}
              onMenuClose={() => {
                setIsSearchable(false);
                setIsDownIconClicked(false);
              }}
              isDisabled={isReadOnly}
              menuShouldScrollIntoView={true}
              menuPlacement={isMobile ? "bottom" : "auto"}
              menuPosition={isMobile ? "absolute" : "fixed"}
              isClearable={false}
              backspaceRemovesValue={true}
            />
          )}
        </div>
        {!isReadOnly && !isMultiple && isOnClearActive && value && onClear && (
          <GenericButton
            onClick={onClear}
            variant="icon"
            className="w-9 h-9 my-auto text-neutral-400 hover:text-neutral-600"
          >
            <IoIosClose size={24} />
          </GenericButton>
        )}
      </div>
    </div>
  );
};

export default React.memo(SelectInput);
