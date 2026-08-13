import { TableSourceBinding } from "./dynamic";
import type { TableActionConfig } from "../types/page";
import { evaluateRowCondition } from "./genericPageHelpers";

export const canUseConfiguredBulkSchemaActions = (
  actionsEnabled: boolean,
  tableBinding: TableSourceBinding,
) => actionsEnabled && Boolean(tableBinding.schemaName);

export const getTableActionRowState = (
  action: Pick<
    TableActionConfig,
    "hiddenCondition" | "disabledCondition" | "requiredCondition"
  >,
  row: Record<string, unknown> & { _id: string },
) => ({
  hidden:
    !!action.hiddenCondition?.trim() &&
    evaluateRowCondition(row, action.hiddenCondition),
  disabled:
    (!!action.disabledCondition?.trim() &&
      evaluateRowCondition(row, action.disabledCondition)) ||
    (!!action.requiredCondition?.trim() &&
      !evaluateRowCondition(row, action.requiredCondition)),
});
