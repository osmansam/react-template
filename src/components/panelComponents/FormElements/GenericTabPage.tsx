import { useMemo, useState } from "react";
import { IconType } from "react-icons";
// import { GiGreatPyramid } from "react-icons/gi";
import { useGeneralContext } from "../../../context/General.context";
import type {
  ComponentBlock,
  ComponentOutputDefinition,
  DataBinding,
  TableComponentConfig,
} from "../../../types/page";
import { ComponentRequestBoundary } from "../../../pageRuntime/ComponentRequestBoundary";
import { getIconByName } from "../../../utils/menuIcons";
import UnifiedTabPanel from "../TabPanel/UnifiedTabPanel";
import GenericPaginatedPage from "./GenericPaginatedPage";
import GenericUnpaginatedPage from "./GenericUnpaginatedPage";
import { buildTabInstanceKey } from "./tabInstanceKey";

type TabConfig = {
  schemaName: string;
  label?: string;
  icon?: IconType;
  iconName?: string; // Icon name string (e.g., "MdSportsEsports")
  includeFields?: string[];
  excludeFields?: string[];
  actionsEnabled?: boolean;
  isPaginated?: boolean; // Add isPaginated prop, default true
  constantFilter?: Record<string, unknown>; // Constant filter that won't be editable
  customTitle?: string;
  tableConfig?: TableComponentConfig;
  dataBinding?: DataBinding;
  componentId?: string;
  outputs?: ComponentOutputDefinition[];
  instanceKey?: string;
  component?: ComponentBlock;
  resolvedParams?: Record<string, unknown>;
  sourceRevision?: string;
};

type Props = {
  tabs: TabConfig[];
  showLocationSelector?: boolean;
  allowOrientationToggle?: boolean;
};

const humanize = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const PaginatedTabContent = ({
  tab,
  instanceKey,
  label,
}: {
  tab: TabConfig;
  instanceKey: string;
  label: string;
}) => {
  const renderPage = (
    resolvedParams = tab.resolvedParams,
    sourceRevision = tab.sourceRevision,
  ) => (
    <GenericPaginatedPage
      key={instanceKey}
      schemaName={tab.schemaName}
      includeFields={tab.includeFields}
      excludeFields={tab.excludeFields}
      actionsEnabled={tab.actionsEnabled ?? true}
      constantFilter={tab.constantFilter}
      customTitle={tab.customTitle || label}
      tableConfig={tab.tableConfig}
      dataBinding={tab.dataBinding}
      componentId={tab.componentId}
      outputs={tab.outputs}
      resolvedParams={resolvedParams}
      sourceRevision={sourceRevision}
    />
  );

  return tab.component ? (
    <ComponentRequestBoundary component={tab.component}>
      {({ values, sourceRevisionFor }) =>
        renderPage(
          values,
          sourceRevisionFor(tab.dataBinding?.schemaName || tab.schemaName),
        )
      }
    </ComponentRequestBoundary>
  ) : (
    renderPage()
  );
};

export default function GenericTabPage({
  tabs,
  allowOrientationToggle = true,
}: Props) {
  const { setCurrentPage, setSearchQuery } = useGeneralContext();
  const [activeTab, setActiveTab] = useState(0);
  const builtTabs = useMemo(
    () =>
      tabs.map((t, idx) => {
        const label = t.label ?? humanize(t.schemaName);
        const isPaginated = t.isPaginated ?? true; // Default to true
        const instanceKey = buildTabInstanceKey({ ...t, label }, idx);

        // Get icon from iconName string or use the icon prop
        let iconElement = undefined;
        if (t.iconName) {
          const IconComponent = getIconByName(t.iconName);
          iconElement = <IconComponent className="text-lg font-thin" />;
        } else if (t.icon) {
          iconElement = <t.icon className="text-lg font-thin" />;
        }

        return {
          number: idx,
          label,
          icon: iconElement,
          isDisabled: false,
          content: isPaginated ? (
            <PaginatedTabContent
              key={instanceKey}
              tab={t}
              instanceKey={instanceKey}
              label={label}
            />
          ) : (
            <GenericUnpaginatedPage
              key={instanceKey}
              schemaName={t.schemaName}
              includeFields={t.includeFields}
              excludeFields={t.excludeFields}
              actionsEnabled={t.actionsEnabled ?? true}
              customTitle={t.customTitle || label}
              tableConfig={t.tableConfig}
            />
          ),
        };
      }),
    [tabs],
  );

  return (
    <>
      <div className="flex flex-col gap-2 h-full">
        <UnifiedTabPanel
          tabs={builtTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          additionalOpenAction={() => {
            setCurrentPage(1);
            setSearchQuery("");
          }}
          allowOrientationToggle={allowOrientationToggle}
        />
      </div>
    </>
  );
}
