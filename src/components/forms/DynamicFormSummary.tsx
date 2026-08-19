import { FormElementsState } from "../../types";
import { FormAreaKey, FormSummaryConfig } from "../../types/page";

type Props = {
  summaries: FormSummaryConfig[];
  values: FormElementsState;
  area: FormAreaKey;
};

const formatSummary = (summary: FormSummaryConfig, value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  const precision = summary.format?.precision ?? 2;
  return new Intl.NumberFormat(undefined, {
    style: summary.format?.style === "currency" ? "currency" : "decimal",
    ...(summary.format?.style === "currency"
      ? { currency: summary.format.currency || "TRY" }
      : {}),
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(Number.isFinite(numeric) ? numeric : 0);
};

const DynamicFormSummary = ({ summaries, values, area }: Props) => {
  const visible = summaries
    .filter((summary) => (summary.area || "right") === area)
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  if (!visible.length) return null;
  return (
    <dl className="mt-5 space-y-2 border-t border-neutral-100 pt-4">
      {visible.map((summary) => (
        <div key={summary.key} className="flex items-center justify-between gap-4">
          <dt className="text-sm text-neutral-500">{summary.label || summary.key}</dt>
          <dd className="text-base font-semibold tabular-nums text-neutral-950">
            {formatSummary(summary, values[summary.targetField])}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export default DynamicFormSummary;
