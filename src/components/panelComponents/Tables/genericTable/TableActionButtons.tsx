import { GenericButton } from "../../FormElements/GenericButton";
import { ActionType } from "../../shared/types";
import ButtonTooltip from "../ButtonTooltip";

type TableActionButtonsProps<T> = {
  row: T;
  actions: ActionType<T>[];
  onActionClick: (action: ActionType<T>, row: T) => void;
};

export const TableActionButtons = <T,>({
  row,
  actions,
  onActionClick,
}: TableActionButtonsProps<T>) => (
  <div
    data-no-record-activate=""
    className="flex flex-row my-auto h-full gap-3 justify-center items-center"
  >
    {actions?.map((action, index) => {
      if (action?.isHidden?.(row) || action?.node === null) return null;
      const isDisabled =
        typeof action?.isDisabled === "function"
          ? action.isDisabled(row)
          : action?.isDisabled;
      if (action.node) return <div key={index}>{action.node(row)}</div>;
      return (
        <div
          key={index}
          className={`${
            action.icon &&
            "rounded-full  h-6 w-6 flex my-auto items-center justify-center"
          } ${action?.className}`}
          onClick={() => {
            if (!isDisabled) onActionClick(action, row);
          }}
          aria-disabled={isDisabled || undefined}
        >
          {action.icon && (
            <ButtonTooltip content={action.name}>{action.icon}</ButtonTooltip>
          )}
          {action.isButton && (
            <GenericButton className={action?.buttonClassName}>
              {action.name}
            </GenericButton>
          )}
        </div>
      );
    })}
  </div>
);
