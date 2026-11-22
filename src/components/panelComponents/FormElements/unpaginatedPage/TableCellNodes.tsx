import { IoCheckmark, IoCloseOutline } from "react-icons/io5";
import { CheckSwitch } from "../../../../common/CheckSwitch";
import type { GrowthPercentagePresentation } from "./cellFormatters";

export type ProgressBarCellProps = {
  width: number | string;
  height: number | string;
  trackColor: string;
  percent: number;
  color: string;
  showValue: boolean;
  value: number;
  max: number;
};

export function ProgressBarCell({
  width,
  height,
  trackColor,
  percent,
  color,
  showValue,
  value,
  max,
}: ProgressBarCellProps) {
  return (
    <span className="inline-flex items-center gap-3 align-middle">
      <span
        className="inline-flex overflow-hidden rounded-full"
        style={{
          width,
          height,
          backgroundColor: trackColor,
        }}
      >
        <span
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
          }}
        />
      </span>
      {showValue && (
        <span className="text-sm font-medium text-neutral-500">
          {value}/{max}
        </span>
      )}
    </span>
  );
}

export function GrowthPercentageCell({
  presentation,
}: {
  presentation: Extract<GrowthPercentagePresentation, { kind: "formatted" }>;
}) {
  return (
    <span
      style={{
        color: presentation.color,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <span>{presentation.arrow}</span>
      <span>
        {presentation.sign}
        {presentation.formattedNumber}%
      </span>
    </span>
  );
}

export function BooleanBadgeCell({ isTrue }: { isTrue: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        isTrue
          ? "bg-green-100 text-green-700"
          : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {isTrue ? "Yes" : "No"}
    </span>
  );
}

export function BooleanSwitchCell({
  isChecked,
  isInteractive,
  label,
  onToggle,
}: {
  isChecked: boolean;
  isInteractive: boolean;
  label?: string;
  onToggle: () => void;
}) {
  if (!isInteractive) {
    return (
      <span aria-label={`${label}: ${isChecked ? "Yes" : "No"}`}>
        {isChecked ? (
          <IoCheckmark className="text-blue-500 text-2xl" />
        ) : (
          <IoCloseOutline className="text-red-800 text-2xl" />
        )}
      </span>
    );
  }

  return <CheckSwitch checked={isChecked} onChange={onToggle} />;
}

export function BadgeCell({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
      {text}
    </span>
  );
}
