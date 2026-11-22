import type React from "react";
import type { TFunction } from "i18next";
import type { TableToggleConfig } from "../../../../types/page";
import {
  appendShowFiltersControl,
  isTableToggleUpperSide,
} from "../../../../utils/tableToggles";
import SwitchButton from "../../common/SwitchButton";

export const buildFilterControls = ({
  configuredTableToggles,
  tableToggleState,
  setTableToggleState,
  hasFilterPanelInputs,
  showFilters,
  setShowFilters,
  t,
}: {
  configuredTableToggles: TableToggleConfig[];
  tableToggleState: Record<string, boolean>;
  setTableToggleState: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  hasFilterPanelInputs: boolean;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  t: TFunction;
}) => {
  const displayToggleControls = configuredTableToggles.map((toggle) => ({
    label: toggle.label || toggle.id,
    isUpperSide: isTableToggleUpperSide(toggle),
    node: (
      <SwitchButton
        checked={tableToggleState[toggle.id] ?? toggle.defaultValue}
        onChange={() =>
          setTableToggleState((current) => ({
            ...current,
            [toggle.id]: !(current[toggle.id] ?? toggle.defaultValue),
          }))
        }
      />
    ),
  }));

  return appendShowFiltersControl(
    displayToggleControls,
    hasFilterPanelInputs
      ? {
          label: t("Show Filters"),
          isUpperSide: true,
          node: (
            <SwitchButton
              checked={showFilters}
              onChange={() => setShowFilters(!showFilters)}
            />
          ),
        }
      : undefined,
  );
};
