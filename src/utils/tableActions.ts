import { TableSourceBinding } from "./dynamic";

export const canUseConfiguredBulkSchemaActions = (
  actionsEnabled: boolean,
  tableBinding: TableSourceBinding,
) => actionsEnabled && Boolean(tableBinding.schemaName);
