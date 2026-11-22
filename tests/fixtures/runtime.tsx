/* eslint-disable react-refresh/only-export-components -- standalone browser test entry */
import {ConfirmationDialog} from "../../src/common/ConfirmationDialog";
import type { ComponentBlock } from "../../src/types/page";
import { lazy, Suspense, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeneralContextProvider } from "../../src/context/General.context";
import GenericTable from "../../src/components/panelComponents/Tables/GenericTable";
import { RuntimeErrorBoundary } from "../../src/common/RuntimeErrorBoundary";
import { useWebSocket } from "../../src/hooks/useWebSocket";
import { useExportDynamicItems } from "../../src/utils/dynamic";
import DateInput from "../../src/components/panelComponents/FormElements/DateInput";
import "../../src/index.css";
import "../../src/utils/i18n";
const VisualBlock = lazy(() => import("../../src/visualBuilder/VisualBlock"));
const Chart = lazy(() => import("../../src/components/charts/DynamicChart"));
history.replaceState({}, "", "/t/qa/p/demo/fixture");
const visualFixture: ComponentBlock = {
  id: "fixture-visual",
  type: "custom",
  props: {
    visualBuilder: {
      document: {
        version: 2,
        id: "fixture-document",
        name: "Fixture",
        root: {
          id: "root",
          type: "section",
          children: [
            {
              id: "heading",
              type: "heading",
              level: 2,
              text: "Runtime visual",
            },
          ],
        },
      },
    },
  },
};
const rows = [
  { _id: "a", name: "Alice" },
  { _id: "b", name: "Bob" },
];
function Updates() {
  useWebSocket();
  return null;
}
function Broken({ broken }: { broken: boolean }) {
  if (broken) throw new Error("Fixture render failure");
  return <p>Section recovered</p>;
}
function Fixture() {
  const [dialog, setDialog] = useState(false);
  const [updates, setUpdates] = useState(true),
    [visual, setVisual] = useState(false),
    [chart, setChart] = useState(false),
    [date, setDate] = useState(false),
    [broken, setBroken] = useState(false);
  const { exportDynamicItems } = useExportDynamicItems();
  return (
    <main className="space-y-6 p-4">
      <h1>Runtime regression fixture</h1>
      <button onClick={()=>setDialog(true)}>Open confirmation</button><ConfirmationDialog isOpen={dialog} close={()=>setDialog(false)} confirm={()=>setDialog(false)} title="Confirm fixture" text="Confirm this local action"/>
      <button onClick={() => setUpdates(!updates)}>
        {updates ? "Stop updates" : "Start updates"}
      </button>
      {updates && <Updates />}
      {["First", "Second"].map((title) => (
        <section key={title} aria-label={title}>
          <GenericTable
            title={title}
            rows={rows}
            columns={[{ key: "Name", isActive: true, isSortable: true }]}
            rowKeys={[{ key: "name" }]}
            isActionsActive={false}
            isRowsPerPage={false}
            isSelectionEnabled
            searchPlaceholder={`${title} search`}
          />
        </section>
      ))}
      <button onClick={() => setVisual(true)}>Show visual</button>
      {visual && (
        <Suspense fallback={<p>Loading visual</p>}>
          <VisualBlock component={visualFixture} />
        </Suspense>
      )}
      <button onClick={() => setChart(true)}>Show chart</button>
      {chart && (
        <Suspense fallback={<p>Loading chart</p>}>
          <section aria-label="Chart">
            <Chart
              config={{
                type: "bar",
                schemaName: "products",
                pipelineName: "summary",
                title: "Product chart",
                height: 260,
                additionalParams: { indexBy: "category", keys: ["value"] },
              }}
            />
          </section>
        </Suspense>
      )}
      <button onClick={() => setDate(true)}>Show date control</button>
      {date && <DateInput label="Event date" value="" onChange={() => {}} />}
      <button
        onClick={() =>
          exportDynamicItems({
            schemaName: "products",
            fields: ["name"],
            filters: {},
            search: "",
            limit: 10,
            page: 1,
          })
        }
      >
        Export records
      </button>
      <button onClick={() => setBroken(true)}>Break section</button>
      <button onClick={() => setBroken(false)}>Repair section</button>
      <RuntimeErrorBoundary resetKey={String(broken)}>
        <Broken broken={broken} />
      </RuntimeErrorBoundary>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter initialEntries={["/t/qa/p/demo/fixture"]}>
      <QueryClientProvider client={new QueryClient()}>
        <GeneralContextProvider>
          <Fixture />
        </GeneralContextProvider>
      </QueryClientProvider>
    </MemoryRouter>
  </StrictMode>,
);
