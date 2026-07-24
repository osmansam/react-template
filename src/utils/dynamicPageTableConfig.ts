import { TableComponentConfig } from "../types/page";

const hasTableConfigFields = (props: Record<string, unknown> | undefined) =>
  Boolean(
    props &&
      [
        props.columns,
        props.rows,
        props.nestedRows,
        props.cache,
        props.constantFilters,
        props.constantSort,
        props.addButton,
        props.actions,
        props.bulkActions,
        props.filterPanel,
        props.title,
        props.enableSearch,
      ].some((value) => value !== undefined),
  );

export const getTableConfig = (
  table: TableComponentConfig | undefined,
  props: Record<string, unknown> | undefined,
): TableComponentConfig | undefined => {
  const propsTable = props?.table as TableComponentConfig | undefined;
  const propsAsTable = hasTableConfigFields(props)
    ? (props as TableComponentConfig)
    : undefined;

  if (!table && !propsTable && !propsAsTable) return undefined;

  return {
    ...(propsAsTable || {}),
    ...(propsTable || {}),
    ...(table || {}),
    bulkActions:
      table?.bulkActions || propsTable?.bulkActions || propsAsTable?.bulkActions,
  };
};
