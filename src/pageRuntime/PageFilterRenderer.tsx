import React, { useEffect, useState } from "react";
import type { PageFilterDefinition } from "../types/page";
import {
  usePageRuntimeSelector,
  usePageRuntimeStore,
} from "./PageRuntimeProvider";

type PageFilterRendererProps = {
  filter: PageFilterDefinition;
};

type DateRangeValue = {
  start: string;
  end: string;
  preset?: string;
  timezone?: string;
};

const stringifyValue = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
};

const isDateRangeValue = (value: unknown): value is DateRangeValue =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Record<string, unknown>).start === "string" &&
  typeof (value as Record<string, unknown>).end === "string";

const dateInputValue = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(value);
  return match?.[1] ?? "";
};

const startOfDayUtc = (date: string): string =>
  `${date}T00:00:00.000Z`;

const endOfDayUtc = (date: string): string =>
  `${date}T23:59:59.999Z`;

const singleDateValue = (date: string): string | null =>
  date ? startOfDayUtc(date) : null;

const buildDateRangeValue = (
  startDate: string,
  endDate: string,
): DateRangeValue | null => {
  if (!startDate || !endDate) return null;
  const start = startOfDayUtc(startDate);
  const end = endOfDayUtc(endDate);
  return Date.parse(start) < Date.parse(end) ? { start, end } : null;
};

const parseValue = (raw: string, filter: PageFilterDefinition): unknown => {
  if (filter.type === "number") return raw === "" ? null : Number(raw);
  if (filter.type === "boolean") return raw === "true";
  if (filter.type === "stringArray") {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (filter.type === "numberArray") {
    return raw
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
  return raw;
};

export const PageFilterRenderer: React.FC<PageFilterRendererProps> = ({
  filter,
}) => {
  const store = usePageRuntimeStore();
  const runtimeValue = usePageRuntimeSelector(
    (snapshot) => snapshot.pageFilters[filter.id],
  );
  const value = runtimeValue?.status === "available" ? runtimeValue.value : "";

  const setValue = (next: unknown) => {
    store.setPageFilterValue(filter.id, next);
  };

  if (filter.type === "dateRange") {
    return (
      <DateRangeFilter
        filter={filter}
        value={runtimeValue?.status === "available" ? runtimeValue.value : null}
        onChange={setValue}
      />
    );
  }

  if (filter.type === "date") {
    return (
      <label className="flex min-w-44 flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">
          {filter.label || filter.key}
        </span>
        <input
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          type="date"
          value={dateInputValue(value)}
          onChange={(event) => setValue(singleDateValue(event.target.value))}
        />
      </label>
    );
  }

  if (filter.type === "boolean") {
    return (
      <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => setValue(event.target.checked)}
        />
        <span>{filter.label || filter.key}</span>
      </label>
    );
  }

  return (
    <label className="flex min-w-44 flex-col gap-1 text-sm">
      <span className="font-medium text-neutral-700">
        {filter.label || filter.key}
      </span>
      <input
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        type={filter.type === "number" ? "number" : "text"}
        value={stringifyValue(value)}
        onChange={(event) => setValue(parseValue(event.target.value, filter))}
      />
    </label>
  );
};

const DateRangeFilter: React.FC<{
  filter: PageFilterDefinition;
  value: unknown;
  onChange: (value: DateRangeValue | null) => void;
}> = ({ filter, value, onChange }) => {
  const [draft, setDraft] = useState({ start: "", end: "" });

  useEffect(() => {
    if (!isDateRangeValue(value)) {
      setDraft({ start: "", end: "" });
      return;
    }
    setDraft({
      start: dateInputValue(value.start),
      end: dateInputValue(value.end),
    });
  }, [value]);

  const updateDraft = (next: { start: string; end: string }) => {
    setDraft(next);
    const nextValue = buildDateRangeValue(next.start, next.end);
    if (nextValue) {
      onChange(nextValue);
    } else if (!next.start && !next.end) {
      onChange(null);
    }
  };

  return (
    <div className="flex min-w-72 flex-col gap-1 text-sm">
      <span className="font-medium text-neutral-700">
        {filter.label || filter.key}
      </span>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Start date
          <input
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            type="date"
            value={draft.start}
            onChange={(event) =>
              updateDraft({ ...draft, start: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          End date
          <input
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            type="date"
            value={draft.end}
            onChange={(event) =>
              updateDraft({ ...draft, end: event.target.value })
            }
          />
        </label>
      </div>
    </div>
  );
};

export default PageFilterRenderer;
