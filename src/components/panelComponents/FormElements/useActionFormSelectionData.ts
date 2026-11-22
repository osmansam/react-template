import { useQueries } from "@tanstack/react-query";
import { usePageSelectionOptions } from "../../../pageRuntime/requests/selectionOptions";
import {
  hasDependentSelectFilters,
  referencedSelectRecordFields,
} from "../../../utils/selectFilters";
import { getSelectionQueryConfig } from "../../../utils/selectionQuery";
import { get } from "../../../utils/api";
import type { TableActionConfig } from "../../../types/page";
import {
  getActionId,
  getSelectionFieldName,
  type GenericItem,
  type ActionSelectDataMap,
} from "./tableActionForm";
export const useActionFormSelectionData = (
  actions: TableActionConfig[] = [],
): ActionSelectDataMap => {
  const pageOptions = usePageSelectionOptions();
  const schemaSelectFields = actions.flatMap((action, actionIndex) =>
    (action.formFields || [])
      .filter(
        (field) =>
          field.type === "select" &&
          !hasDependentSelectFilters(field) &&
          ((field.optionsSource === "schema" && field.sourceSchemaName) ||
            pageOptions.connected(
              `actionOptions:${getActionId(action, actionIndex)}:${field.formKey}`,
            )),
      )
      .map((field) => ({
        action,
        actionId: getActionId(action, actionIndex),
        field,
      })),
  );

  const queryResults = useQueries({
    queries: schemaSelectFields.map(({ action, field, actionId }) => {
      const fieldName = getSelectionFieldName(field);
      const valueField = field.sourceValueField || "_id";
      const dataFields = Array.from(
        new Set([
          ...(field.sourceDataFields || []),
          ...referencedSelectRecordFields(
            action.formFields || [],
            field.formKey,
          ),
        ]),
      ).filter((name) => name !== fieldName && name !== valueField);
      const { path, queryKey, config } = getSelectionQueryConfig({
        schemaName: field.sourceSchemaName || "",
        fieldName,
        valueField,
        dataFields,
        filterParams: field.sourceRequestFilters,
      });
      return pageOptions(
        `actionOptions:${actionId}:${field.formKey}`,
        path,
        {
          queryKey,
          queryFn: () =>
            get<GenericItem[]>({
              path,
              config,
            }),
          enabled: Boolean(field.sourceSchemaName && fieldName),
          staleTime: Infinity,
        },
        { dataFields },
      );
    }),
  });

  return schemaSelectFields.reduce<ActionSelectDataMap>((map, item, index) => {
    const rawData = queryResults[index]?.data;
    const items = Array.isArray(rawData)
      ? rawData
      : (rawData as { data?: GenericItem[]; items?: GenericItem[] } | undefined)
          ?.data ||
        (rawData as { data?: GenericItem[]; items?: GenericItem[] } | undefined)
          ?.items ||
        [];
    map.set(`${item.actionId}:${item.field.formKey}`, items);
    return map;
  }, new Map());
};
