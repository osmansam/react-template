import React, {
  PropsWithChildren,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGeneralContext } from "../../../context/General.context";
import useIsLargeScreen from "../../../hooks/useIsLargeScreen";
import { getTabSlug } from "../../../utils/slug";
import { Tab } from "../shared/types";
import { OrientationToggle } from "./OrientationToggle";
import TabPanel from "./TabPanel";
import VerticalTabPanel from "./VerticalTabPanel";

const TAB_QUERY_PARAM = "tab";

const resolveTabIndex = (tabValue: number, tabs: Tab[]) => {
  const byAdjustedIndex = tabs.findIndex((_, index) => index === tabValue);
  if (byAdjustedIndex !== -1) {
    return byAdjustedIndex;
  }

  return tabs.findIndex((tab) => tab.number === tabValue);
};

// TabPanel için local context
type TabPanelContextType = {
  allowOrientationToggle: boolean;
};

const TabPanelContext = createContext<TabPanelContextType>({
  allowOrientationToggle: false,
});

export const useTabPanelContext = () => useContext(TabPanelContext);

const TabPanelProvider = ({
  children,
  allowOrientationToggle = false,
}: PropsWithChildren<{ allowOrientationToggle?: boolean }>) => {
  return (
    <TabPanelContext.Provider value={{ allowOrientationToggle }}>
      {children}
    </TabPanelContext.Provider>
  );
};

type Props = {
  tabs: Tab[];
  activeTab: number;
  setActiveTab: (tab: number) => void;
  additionalClickAction?: () => void;
  additionalOpenAction?: () => void;
  topClassName?: string;
  filters?: React.ReactNode[];
  isLanguageChange?: boolean;
  sideClassName?: string;
  allowOrientationToggle?: boolean;
  // Sadece bazı ekranlarda (örn. Orders) toggle'ı TabPanel filtrelerine enjekte etmek için
  injectOrientationToggleToFilters?: boolean;
};

const UnifiedTabPanel: React.FC<Props> = ({
  allowOrientationToggle = false,
  filters,
  injectOrientationToggleToFilters = false,
  activeTab,
  setActiveTab,
  additionalOpenAction,
  ...props
}) => {
  const { tabOrientation, setTabOrientation } = useGeneralContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isLargeScreen = useIsLargeScreen();
  const visibleTabs = useMemo(
    () => props.tabs.filter((tab) => !tab.isDisabled),
    [props.tabs]
  );

  const tabParam = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get(TAB_QUERY_PARAM);
  }, [location.search]);

  const requestedTabIndex = useMemo(() => {
    if (!tabParam) {
      return -1;
    }

    return visibleTabs.findIndex((tab) => getTabSlug(tab.label) === tabParam);
  }, [tabParam, visibleTabs]);

  const currentTabIndex = useMemo(
    () => resolveTabIndex(activeTab, visibleTabs),
    [activeTab, visibleTabs]
  );

  const effectiveActiveTab =
    requestedTabIndex !== -1
      ? requestedTabIndex
      : currentTabIndex !== -1
        ? currentTabIndex
        : 0;

  // Mobile'da her zaman horizontal
  const actualOrientation = !isLargeScreen ? "horizontal" : tabOrientation;

  const TabComponent =
    actualOrientation === "vertical" ? VerticalTabPanel : TabPanel;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const currentTab =
      visibleTabs[effectiveActiveTab] ?? visibleTabs[0] ?? null;

    if (!currentTab) {
      return;
    }

    const currentTabSlug = getTabSlug(currentTab.label);

    if (activeTab !== effectiveActiveTab) {
      setActiveTab(effectiveActiveTab);
    }

    if (tabParam === null) {
      searchParams.set(TAB_QUERY_PARAM, currentTabSlug);
      navigate(
        {
          pathname: location.pathname,
          search: `?${searchParams.toString()}`,
        },
        { replace: true }
      );
      return;
    }

    if (requestedTabIndex === -1 && tabParam !== currentTabSlug) {
      searchParams.set(TAB_QUERY_PARAM, currentTabSlug);
      navigate(
        {
          pathname: location.pathname,
          search: `?${searchParams.toString()}`,
        },
        { replace: true }
      );
    }
  }, [
    activeTab,
    effectiveActiveTab,
    location.pathname,
    location.search,
    navigate,
    requestedTabIndex,
    setActiveTab,
    tabParam,
    visibleTabs,
  ]);

  const handleSetActiveTab = (tab: number) => {
    if (effectiveActiveTab !== tab) {
      setActiveTab(tab);
      additionalOpenAction?.();
    }

    const nextTab = visibleTabs[tab] ?? visibleTabs[0];
    if (!nextTab) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const nextTabSlug = getTabSlug(nextTab.label);
    if (searchParams.get(TAB_QUERY_PARAM) === nextTabSlug) {
      return;
    }

    searchParams.set(TAB_QUERY_PARAM, nextTabSlug);

    startTransition(() => {
      navigate(
        {
          pathname: location.pathname,
          search: `?${searchParams.toString()}`,
        },
        { replace: true }
      );
    });
  };

  // Toggle button'ı filter'ların başına ekle (yalnızca açıkça istenirse)
  const enhancedFilters = React.useMemo(() => {
    if (!injectOrientationToggleToFilters) return filters;

    if (!allowOrientationToggle || !isLargeScreen) {
      return filters;
    }

    const toggleButton = (
      <OrientationToggle
        key="orientation-toggle"
        orientation={tabOrientation}
        onChange={setTabOrientation}
      />
    );

    // Toggle button'ı her zaman en başa ekle (sağda ilk eleman olacak)
    return filters ? [toggleButton, ...filters] : [toggleButton];
  }, [
    allowOrientationToggle,
    isLargeScreen,
    tabOrientation,
    setTabOrientation,
    filters,
  ]);

  return (
    <TabPanelProvider allowOrientationToggle={allowOrientationToggle}>
      <TabComponent
        {...props}
        additionalOpenAction={additionalOpenAction}
        activeTab={effectiveActiveTab}
        setActiveTab={handleSetActiveTab}
        filters={enhancedFilters}
      />
    </TabPanelProvider>
  );
};

export default UnifiedTabPanel;
