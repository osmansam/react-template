import type React from "react";
import { useMemo } from "react";
import type { FormElementsState } from "../../../../types";
import type {
  TableFilterPanelInputConfig,
  TableToggleConfig,
} from "../../../../types/page";
import type { Field } from "../../../../utils/api/container";
import { buildConfiguredFilterInputs } from "../../../../utils/tableFilters";
import {
  appendShowFiltersControl,
  isTableToggleUpperSide,
} from "../../../../utils/tableToggles";
import SwitchButton from "../../common/SwitchButton";
import {
  type SelectionDataMap,
  buildDefaultFilterPanelInputs,
} from "./formInputBuilders";
import type { TranslateFn } from "./tableHelpers";

export type UseFilterControlsParams = {
  displayFields: Field[];
  constantFilter?: Record<string, unknown>;
  selectionDataMap: SelectionDataMap;
  configuredFilterInputs?: TableFilterPanelInputConfig[];
  filterSelectionDataMap: SelectionDataMap;
  configuredTableToggles: TableToggleConfig[];
  tableToggleState: Record<string, boolean>;
  setTableToggleState: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  filterPanelFormElements: FormElementsState;
  setFilterPanelFormElements: React.Dispatch<
    React.SetStateAction<FormElementsState>
  >;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  t: TranslateFn;
};

export function useFilterControls({
  displayFields,
  constantFilter,
  selectionDataMap,
  configuredFilterInputs,
  filterSelectionDataMap,
  configuredTableToggles,
  tableToggleState,
  setTableToggleState,
  showFilters,
  setShowFilters,
  filterPanelFormElements,
  setFilterPanelFormElements,
  setCurrentPage,
  t,
}: UseFilterControlsParams) {
  const filterPanelInputs = useMemo(() => {
    const defaultInputs = buildDefaultFilterPanelInputs({
      displayFields,
      constantFilter,
      selectionDataMap,
      t,
    });
    return buildConfiguredFilterInputs(
      configuredFilterInputs,
      defaultInputs,
      filterSelectionDataMap,
    );
  }, [
    displayFields,
    t,
    selectionDataMap,
    constantFilter,
    configuredFilterInputs,
    filterSelectionDataMap,
  ]);

  const hasFilterPanelInputs = filterPanelInputs.length > 0;

  const filters = useMemo(() => {
    const displayToggleControls = configuredTableToggles.map((toggle) => ({
      label: toggle.label || toggle.id,
      isUpperSide: isTableToggleUpperSide(toggle),
      node: (
        <SwitchButton
          checked={tableToggleState[toggle.id] ?? toggle.defaultValue}
          onChange={() => {
            if (tableToggleState[toggle.id] ?? toggle.defaultValue) {
              setCurrentPage(1);
            }
            setTableToggleState((current) => ({
              ...current,
              [toggle.id]: !(current[toggle.id] ?? toggle.defaultValue),
            }));
          }}
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
  }, [
    t,
    showFilters,
    hasFilterPanelInputs,
    configuredTableToggles,
    tableToggleState,
    setTableToggleState,
    setShowFilters,
    setCurrentPage,
  ]);

  const filterPanel = useMemo(
    () => ({
      isFilterPanelActive: showFilters && hasFilterPanelInputs,
      inputs: filterPanelInputs,
      formElements: filterPanelFormElements,
      setFormElements: setFilterPanelFormElements,
      closeFilters: () => setShowFilters(false),
      isApplyButtonActive: true,
    }),
    [
      showFilters,
      hasFilterPanelInputs,
      filterPanelInputs,
      filterPanelFormElements,
      setFilterPanelFormElements,
      setShowFilters,
    ],
  );

  return { filters, filterPanel };
}
