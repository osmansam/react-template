import React from "react";
import { IoCheckmark, IoCloseOutline } from "react-icons/io5";
import { CheckSwitch } from "../../../../common/CheckSwitch";

export type ProgressBarData = {
  width: number | string;
  height: number | string;
  trackColor: string;
  percent: number;
  color: string;
  showValue?: boolean;
  value: number | string;
  max: number | string;
};

export function ProgressBarCell({
  progress,
}: {
  progress: ProgressBarData | null | undefined;
}) {
  if (!progress) return <span>-</span>;

  return (
    <span className="inline-flex items-center gap-3 align-middle">
      <span
        className="inline-flex overflow-hidden rounded-full"
        style={{
          width: progress.width,
          height: progress.height,
          backgroundColor: progress.trackColor,
        }}
      >
        <span
          className="h-full rounded-full"
          style={{
            width: `${progress.percent}%`,
            backgroundColor: progress.color,
          }}
        />
      </span>
      {progress.showValue && (
        <span className="text-sm font-medium text-neutral-500">
          {progress.value}/{progress.max}
        </span>
      )}
    </span>
  );
}

export function GrowthPercentageCell({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const sign = isPositive ? "+" : "";
  const arrow = isPositive ? "↑" : isNegative ? "↓" : "→";
  const color = isPositive
    ? "#2e7d32"
    : isNegative
      ? "#c62828"
      : "#827717";

  return (
    <span
      style={{
        color,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <span>{arrow}</span>
      <span>
        {sign}
        {value.toLocaleString()}%
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
  isEditableSwitch,
  label,
  onToggle,
}: {
  isChecked: boolean;
  isEditableSwitch: boolean;
  label?: string;
  onToggle: () => void;
}) {
  if (!isEditableSwitch) {
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
