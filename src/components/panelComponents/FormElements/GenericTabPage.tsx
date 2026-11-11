import { PageRequestConsumerProvider, useConnectedDataBinding, usePageRequestConsumer } from "../../../pageRuntime/requests/ConsumerProvider";
import { lazy, Suspense, useMemo, useState } from "react";
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

const VisualBlock = lazy(() => import("../../../visualBuilder/VisualBlock"));

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

const ConnectedTabTable = ({ tab, instanceKey, label, resolvedParams = tab.resolvedParams, sourceRevision = tab.sourceRevision }: { tab: TabConfig; instanceKey: string; label: string; resolvedParams?: Record<string, unknown>; sourceRevision?: string }) => {
  const binding = useConnectedDataBinding(tab.dataBinding || { kind: "schema", schemaName: tab.schemaName });
  const connected = usePageRequestConsumer()?.connections.has("data");
  const Page = tab.isPaginated === false && !connected ? GenericUnpaginatedPage : GenericPaginatedPage;
  return <Page key={instanceKey} schemaName={binding?.schemaName || tab.schemaName} includeFields={tab.includeFields} excludeFields={tab.excludeFields} actionsEnabled={tab.actionsEnabled ?? true} constantFilter={tab.constantFilter} customTitle={tab.customTitle || label} tableConfig={tab.tableConfig} dataBinding={binding} componentId={tab.componentId} outputs={tab.outputs} resolvedParams={resolvedParams} sourceRevision={sourceRevision} />;
};
const PaginatedTabContent = ({ tab, instanceKey, label }: { tab: TabConfig; instanceKey: string; label: string }) => tab.component ? <ComponentRequestBoundary component={tab.component} sourceRevision={tab.sourceRevision ?? ""}>{({ values, sourceRevisionFor }) => <ConnectedTabTable tab={tab} instanceKey={instanceKey} label={label} resolvedParams={values} sourceRevision={sourceRevisionFor(tab.schemaName)} />}</ComponentRequestBoundary> : <ConnectedTabTable tab={tab} instanceKey={instanceKey} label={label} />;

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
          content: t.component ? <PageRequestConsumerProvider component={t.component}>{t.component.type === "custom" && t.component.props?.visualBuilder !== undefined ? <Suspense fallback={<p role="status">Loading visual section…</p>}><VisualBlock component={t.component} /></Suspense> : <PaginatedTabContent key={instanceKey} tab={t} instanceKey={instanceKey} label={label} />}</PageRequestConsumerProvider> : <ConnectedTabTable tab={t} instanceKey={instanceKey} label={label} />,
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
