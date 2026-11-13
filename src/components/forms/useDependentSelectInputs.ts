import {
  QueryClient,
  QueryClientContext,
  useQueries,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useContext, useRef } from "react";
import { usePageSelectionOptions } from "../../pageRuntime/requests/selectionOptions";
import type { FormElementsState } from "../../types";
import type { FormFieldConfig, FormFieldMappingConfig } from "../../types/page";
import { get } from "../../utils/api";
import { evaluateRowCondition } from "../../utils/genericPageHelpers";
import {
  getSelectFilterDependencies,
  hasDependentSelectFilters,
  referencedSelectRecordFields,
  resolveSelectFilters,
  validateSelectFilterBindings,
  type SelectFilterOption,
} from "../../utils/selectFilters";
import { getSelectionQueryConfig } from "../../utils/selectionQuery";
import {
  getEffectiveSelectDataFields,
  renderOptionTemplate,
} from "../../utils/selectOptionConfig";
import {
  GenericInputType,
  InputTypes,
  OptionType,
} from "../panelComponents/shared/types";

type SelectionResponse =
  | Array<Record<string, unknown>>
  | {
      data?: Array<Record<string, unknown>>;
      items?: Array<Record<string, unknown>>;
    };

export interface UseDependentSelectInputsOptions {
  enabled?: boolean;
  defaultSlotPrefix?: string;
  initialRecord?: Record<string, unknown>;
  objectListMappings?: readonly FormFieldMappingConfig[];
}

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const extractSelectionItems = (
  payload: unknown,
): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter(isRecordObject);
  }
  if (isRecordObject(payload)) {
    const list = payload.data ?? payload.items;
    if (Array.isArray(list)) return list.filter(isRecordObject);
  }
  return [];
};

const toSelectOptions = (
  input: GenericInputType,
  items: Array<Record<string, unknown>>,
): OptionType[] => {
  const valueField = input.sourceValueField || "_id";
  const labelField = input.sourceLabelField || valueField;
  const filteredItems = input.sourceFilterCondition?.trim()
    ? items.filter((item) =>
        evaluateRowCondition(
          item as Record<string, unknown> & { _id: string },
          input.sourceFilterCondition!,
        ),
      )
    : items;

  return filteredItems.map((item) => {
    const rawValue = item[valueField] ?? item._id ?? "";
    const rawLabel = item[labelField] ?? item[valueField] ?? item._id ?? "";
    const label = String(rawLabel);
    const hasTemplate = Boolean(
      input.optionDisplay?.leftTemplate || input.optionDisplay?.rightTemplate,
    );
    return {
      value: String(rawValue),
      label,
      ...(hasTemplate
        ? {
            leftLabel: input.optionDisplay?.leftTemplate
              ? renderOptionTemplate(input.optionDisplay.leftTemplate, item)
              : label,
            rightLabel: input.optionDisplay?.rightTemplate
              ? renderOptionTemplate(input.optionDisplay.rightTemplate, item)
              : "",
          }
        : {}),
      sourceItem: item,
    };
  });
};

const appendInitialRecordOption = (
  input: GenericInputType,
  baseOptions: OptionType[],
  values: FormElementsState,
  initialRecord?: Record<string, unknown>,
): OptionType[] => {
  if (!initialRecord || !isRecordObject(initialRecord[input.formKey])) {
    return baseOptions;
  }
  const rawRecord = initialRecord[input.formKey] as Record<string, unknown>;
  const valueField = input.sourceValueField || "_id";
  const labelField = input.sourceLabelField || valueField;
  const currentVal = values[input.formKey];
  const candidateVal = String(
    (typeof currentVal === "string" || typeof currentVal === "number"
      ? currentVal
      : undefined) ??
      rawRecord[valueField] ??
      rawRecord._id ??
      "",
  );
  if (
    !candidateVal ||
    baseOptions.some(
      (opt) => String(opt.value) === candidateVal && Boolean(opt.sourceItem),
    )
  ) {
    return baseOptions;
  }
  return [
    ...baseOptions,
    {
      value: candidateVal,
      label: String(rawRecord[labelField] ?? candidateVal),
      sourceItem: rawRecord,
    },
  ];
};

type PlannedDependentQuery = {
  index: number;
  ready: boolean;
  validationError?: string;
  message?: string;
  queryOptions: UseQueryOptions<SelectionResponse>;
};

export const useDependentSelectInputs = (
  inputs: GenericInputType[],
  values: FormElementsState,
  options?: UseDependentSelectInputsOptions,
): GenericInputType[] => {
  const enabled = options?.enabled !== false;
  const defaultSlotPrefix = options?.defaultSlotPrefix || "options";
  const pageOptions = usePageSelectionOptions();
  const contextQueryClient = useContext(QueryClientContext);
  const fallbackClientRef = useRef<QueryClient>();
  if (!contextQueryClient && !fallbackClientRef.current) {
    fallbackClientRef.current = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  }
  const queryClient = contextQueryClient || fallbackClientRef.current!;

  const validationErrors = validateSelectFilterBindings(inputs);
  const validationErrorsByField = new Map<string, string>();
  validationErrors.forEach((err) => {
    const colonIndex = err.indexOf(":");
    if (colonIndex > 0) {
      const key = err.slice(0, colonIndex).trim();
      if (!validationErrorsByField.has(key)) {
        validationErrorsByField.set(key, err);
      }
    }
  });

  const optionsByField = new Map<string, OptionType[]>();
  inputs.forEach((input) => {
    if (input.type === InputTypes.SELECT && !input.sourceFilterBindings?.length) {
    if (input.type === InputTypes.SELECT && !hasDependentSelectFilters(input)) {
      optionsByField.set(
        input.formKey,
        appendInitialRecordOption(
          input,
          [...(input.options || [])],
          values,
          options?.initialRecord,
        ),
      );
    }
  });

  const managedInputs = inputs.filter((input) => {
    if (input.type !== InputTypes.SELECT) return false;
    if (input.sourceFilterBindings?.length) return true;
    if (hasDependentSelectFilters(input)) return true;
    const slot =
      input.selectionRequestSlot || `${defaultSlotPrefix}:${input.formKey}`;
    return (
      !input.selectionRequestSlot &&
      (input.options?.length ?? 0) === 0 &&
      ((input.optionsSource === "schema" && Boolean(input.sourceSchemaName)) ||
        pageOptions.connected(slot))
    );
  });

  const managedKeys = new Set(managedInputs.map((input) => input.formKey));
  const planByKey = new Map<string, PlannedDependentQuery>();

  const buildQueryPlan = (input: GenericInputType, index: number): PlannedDependentQuery => {
    const slot =
      input.selectionRequestSlot || `${defaultSlotPrefix}:${input.formKey}`;
    const valueField = input.sourceValueField || "_id";
    const fieldName = input.sourceLabelField || valueField;
    const dataFields = Array.from(
      new Set([
        ...getEffectiveSelectDataFields(
          input as unknown as FormFieldConfig,
          [...(options?.objectListMappings || [])],
        ),
        ...referencedSelectRecordFields(inputs, input.formKey),
      ]),
    ).filter((name) => name !== fieldName && name !== valueField);

    const validationError = validationErrorsByField.get(input.formKey);
    if (validationError) {
      const { path, queryKey } = getSelectionQueryConfig({
        schemaName: input.sourceSchemaName || "",
        fieldName,
        valueField,
        dataFields,
      });
      return {
        index,
        ready: false,
        validationError,
        message: validationError,
        queryOptions: pageOptions(
          slot,
          path,
          {
            queryKey,
            queryFn: () => get<SelectionResponse>({ path }),
            enabled: false,
            staleTime: Infinity,
          },
          { ready: false, trackRead: false },
        ),
      };
    }

    const resolved = input.sourceFilterBindings?.length
    const isDependent = hasDependentSelectFilters(input);
    const resolved = isDependent
      ? resolveSelectFilters(
          input,
          inputs,
          values as Record<string, unknown>,
          optionsByField as ReadonlyMap<string, readonly SelectFilterOption[]>,
        )
      : {
          ready: true,
          filters: { ...(input.sourceRequestFilters || {}) },
          message: undefined,
        };

    const { path, queryKey } = getSelectionQueryConfig({
      schemaName: input.sourceSchemaName || "",
      fieldName,
      valueField,
      dataFields,
      filterParams: resolved.ready ? resolved.filters : input.sourceRequestFilters,
      filterParams: resolved.ready ? resolved.filters : undefined,
    });

    const canFetch =
      enabled &&
      resolved.ready &&
      (Boolean(input.sourceSchemaName && fieldName) || pageOptions.connected(slot));

    const queryOptions = pageOptions(
      slot,
      path,
      {
        queryKey,
        queryFn: () => get<SelectionResponse>({ path }),
        enabled: canFetch,
        staleTime: Infinity,
      },
      {
        filters: resolved.ready ? resolved.filters : undefined,
        dataFields,
        ready: canFetch,
        trackRead: !input.sourceFilterBindings?.length,
        trackRead: !isDependent,
      },
    );

    if (canFetch) {
      const cachedRaw = queryClient.getQueryData(queryOptions.queryKey);
      if (cachedRaw !== undefined) {
        const selectedPayload = queryOptions.select
          ? queryOptions.select(cachedRaw as never)
          : cachedRaw;
        const cachedOptions = appendInitialRecordOption(
          input,
          toSelectOptions(input, extractSelectionItems(selectedPayload)),
          values,
          options?.initialRecord,
        );
        optionsByField.set(input.formKey, cachedOptions);
      }
    }

    return {
      index,
      ready: resolved.ready,
      message: resolved.message,
      queryOptions,
    };
  };

  for (let pass = 0; pass <= managedInputs.length; pass += 1) {
    let progressed = false;
    managedInputs.forEach((input, index) => {
      if (planByKey.has(input.formKey)) return;
      const peerManagedDeps = (input.sourceFilterBindings || []).flatMap((rule) =>
        rule?.value &&
        (rule.value.source === "field" || rule.value.source === "record") &&
        managedKeys.has(rule.value.fieldKey)
          ? [rule.value.fieldKey]
          : [],
      const peerManagedDeps = getSelectFilterDependencies(input, inputs).filter(
        (depKey) => managedKeys.has(depKey),
      );
      if (
        pass < managedInputs.length &&
        peerManagedDeps.some((depKey) => !planByKey.has(depKey))
      ) {
        return;
      }
      planByKey.set(input.formKey, buildQueryPlan(input, index));
      progressed = true;
    });
    if (!progressed || planByKey.size === managedInputs.length) break;
  }

  const queryResults = useQueries(
    {
      queries: managedInputs.map(
        (input, index) =>
          (planByKey.get(input.formKey) || buildQueryPlan(input, index))
            .queryOptions,
      ),
    },
    queryClient,
  );

  return inputs.map((input) => {
    const plan = planByKey.get(input.formKey);
    if (!plan) return input;

    const isDependent = Boolean(input.sourceFilterBindings?.length);
    const isDependent = hasDependentSelectFilters(input);
    const result = queryResults[plan.index];

    if (plan.validationError) {
      return {
        ...input,
        options: [],
        isAutoFill: false,
        selectionStatus: "error",
        selectionMessage: plan.validationError,
        retrySelection: undefined,
      };
    }

    if (!plan.ready) {
      return {
        ...input,
        options: [],
        isAutoFill: false,
        selectionStatus: "waiting",
        selectionMessage:
          plan.message || "Choose the referenced input value first.",
        retrySelection: undefined,
      };
    }

    if (result?.isError) {
      return {
        ...input,
        options: [],
        isAutoFill: false,
        selectionStatus: "error",
        selectionMessage: "Failed to load options.",
        retrySelection: () => {
          void result.refetch();
        },
      };
    }

    if (
      result?.isPending ||
      (result?.fetchStatus === "fetching" && result?.data === undefined)
    ) {
      return {
        ...input,
        options: [],
        ...(isDependent ? { isAutoFill: false } : {}),
        selectionStatus: "loading",
        selectionMessage: "Loading options…",
        retrySelection: undefined,
      };
    }

    const loadedOptions = appendInitialRecordOption(
      input,
      toSelectOptions(input, extractSelectionItems(result?.data)),
      values,
      options?.initialRecord,
    );

    return {
      ...input,
      options: loadedOptions,
      ...(isDependent ? { isAutoFill: false } : {}),
      selectionStatus: undefined,
      selectionMessage: undefined,
      retrySelection: undefined,
    };
  });
};
