import React, { useMemo } from "react";
import { DataBinding, InfoBlocksConfig } from "../../../types/page";
import {
  resolveConditionalColor,
  resolveTemplate,
} from "../../../utils/templateExpressions";
import {
  useGetTableSourceItems,
  useGetWorkflowData,
} from "../../../utils/dynamic";

type InfoBlocksProps = {
  config?: InfoBlocksConfig;
  dataBinding?: DataBinding;
};

const InfoBlocks: React.FC<InfoBlocksProps> = ({ config, dataBinding }) => {
  const source = config?.source || "static";
  const shouldFetchTable =
    source !== "static" &&
    source !== "workflow" &&
    Boolean(dataBinding?.schemaName);
  const payload = useGetTableSourceItems<Record<string, unknown>>(
    1,
    1,
    shouldFetchTable
      ? {
          kind: dataBinding?.kind as "schema" | "pipeline" | "workflow",
          schemaName: dataBinding?.schemaName,
          pipelineName: dataBinding?.pipelineName,
          workflowName: dataBinding?.workflowName,
          params: dataBinding?.params,
        }
      : {},
    {},
  );
  const workflowData = useGetWorkflowData<Record<string, unknown>>(
    source === "workflow"
      ? {
          schemaName: dataBinding?.schemaName,
          workflowName: dataBinding?.workflowName,
          params: dataBinding?.params,
        }
      : {},
  );

  const context = useMemo<Record<string, unknown>>(() => {
    if (source === "workflow") {
      return workflowData || {};
    }
    const firstItem = payload?.items?.[0] || {};
    return {
      ...firstItem,
      items:
        (firstItem as Record<string, unknown>).items !== undefined
          ? (firstItem as Record<string, unknown>).items
          : payload?.items || [],
      totalItems: payload?.totalItems,
      totalPages: payload?.totalPages,
      currentPage: payload?.currentPage,
    };
  }, [payload, source, workflowData]);

  const items = (config?.items || []).slice(0, 5);

  if (items.length === 0) return null;

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
      }}
    >
      {items.map((item, index) => {
        const color = item.color?.trim();
        const titleColor = resolveConditionalColor(
          item.titleColorRules,
          context,
        );
        const footerColor = resolveConditionalColor(
          item.footerColorRules,
          context,
        );
        return (
          <div
            key={`${item.title || "info-block"}-${index}`}
            className="group relative min-h-[96px] overflow-hidden rounded-lg border border-neutral-200/80 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)]"
            style={
              color
                ? {
                    borderLeftColor: color,
                    borderLeftWidth: 4,
                  }
                : undefined
            }
          >
            <div className="flex h-full min-w-0 flex-col justify-between gap-2">
              <div
                className="truncate text-[13px] font-medium leading-5 text-neutral-500"
                style={titleColor ? { color: titleColor } : undefined}
              >
                {resolveTemplate(item.title, context)}
              </div>
              <div className="truncate text-[28px] font-semibold leading-8 tracking-normal text-neutral-950 tabular-nums">
                {resolveTemplate(item.value, context)}
              </div>
              <div
                className="truncate text-[13px] font-medium leading-5 text-neutral-400"
                style={footerColor ? { color: footerColor } : undefined}
              >
                {resolveTemplate(item.footer, context)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InfoBlocks;
