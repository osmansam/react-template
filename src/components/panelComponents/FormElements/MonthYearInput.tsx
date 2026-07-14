import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoIosClose } from "react-icons/io";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import { LuCalendar } from "react-icons/lu";

type MonthYearInputProps = {
  label?: string;
  value?: string; // Expected format: "MM-YYYY"
  onChange: (value: string) => void;
  requiredField?: boolean;
  isReadOnly?: boolean;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MonthYearInput = ({
  label,
  value,
  onChange,
  requiredField = false,
  isReadOnly = false,
}: MonthYearInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({
    left: 0,
    top: 0,
    width: 288,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { selectedMonth, selectedYear } = useMemo(() => {
    if (value) {
      const [month, year] = value.split("-");
      if (month && year) {
        return {
          selectedMonth: parseInt(month, 10),
          selectedYear: parseInt(year, 10),
        };
      }
    }
    const now = new Date();
    return {
      selectedMonth: now.getMonth() + 1,
      selectedYear: now.getFullYear(),
    };
  }, [value]);

  const [viewYear, setViewYear] = useState(selectedYear);

  // Sync viewYear when value changes externally
  useEffect(() => {
    setViewYear(selectedYear);
  }, [selectedYear]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const width = 288;
    const viewportPadding = 8;
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - width - viewportPadding,
    );

    setPopoverPosition({
      left,
      top: rect.bottom + 6,
      width,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isOpen, updatePopoverPosition]);

  const handleSelectMonth = useCallback(
    (monthIndex: number) => {
      const mm = String(monthIndex + 1).padStart(2, "0");
      onChange(`${mm}-${viewYear}`);
      setIsOpen(false);
    },
    [onChange, viewYear],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setIsOpen(false);
    },
    [onChange],
  );

  const displayText = value
    ? `${FULL_MONTHS[selectedMonth - 1]} ${selectedYear}`
    : "";

  const isCurrentMonth = (monthIndex: number) =>
    monthIndex + 1 === selectedMonth && viewYear === selectedYear;

  const popover = (
    <div
      ref={popoverRef}
      className={`
        fixed z-[99999]
        origin-top rounded-xl border border-neutral-200
        bg-white p-4 shadow-xl shadow-neutral-900/8
        transition-all duration-200 ease-out
        ${
          isOpen
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }
      `}
      style={{
        left: popoverPosition.left,
        top: popoverPosition.top,
        width: popoverPosition.width,
      }}
    >
      {/* Year Navigator */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewYear((y) => y - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <IoChevronBackOutline size={16} />
        </button>
        <span className="text-sm font-semibold text-neutral-900 tabular-nums tracking-wide">
          {viewYear}
        </span>
        <button
          type="button"
          onClick={() => setViewYear((y) => y + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <IoChevronForwardOutline size={16} />
        </button>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {MONTHS.map((month, index) => {
          const active = isCurrentMonth(index);
          return (
            <button
              key={month}
              type="button"
              onClick={() => handleSelectMonth(index)}
              className={`
                relative flex h-9 items-center justify-center
                rounded-lg text-sm font-medium
                transition-all duration-150 ease-out
                ${
                  active
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }
              `}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-col gap-2"
    >
      {/* Label */}
      {label && (
        <label className="text-sm font-medium text-neutral-700">
          {label}
          {requiredField && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={isReadOnly}
          onClick={() => {
            updatePopoverPosition();
            setIsOpen((prev) => !prev);
          }}
          className={`
            group flex w-full items-center justify-between gap-2
            rounded-lg border bg-white px-3.5 py-2.5
            text-sm shadow-sm
            transition-all duration-200 ease-out
            ${
              isOpen
                ? "border-neutral-900 ring-2 ring-neutral-900/5"
                : "border-neutral-200 hover:border-neutral-400"
            }
            ${isReadOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
          `}
        >
          <span className="flex items-center gap-2">
            <LuCalendar
              className={`text-base transition-colors ${
                isOpen ? "text-neutral-900" : "text-neutral-400"
              }`}
            />
            <span
              className={
                displayText
                  ? "font-medium text-neutral-900"
                  : "text-neutral-400"
              }
            >
              {displayText || "Select month"}
            </span>
          </span>

          <span className="flex items-center gap-1">
            {displayText && !isReadOnly && (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                className="rounded-full p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-500"
              >
                <IoIosClose size={18} />
              </span>
            )}
            <svg
              className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {typeof document !== "undefined" && createPortal(popover, document.body)}
      </div>
    </div>
  );
};

export default MonthYearInput;
