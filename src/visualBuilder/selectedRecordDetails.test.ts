// @vitest-environment jsdom
import { createElement as h, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import VisualBlock from "./VisualBlock";
import { PageRuntimeProvider } from "../pageRuntime/PageRuntimeProvider";
import TableOutputPublisher from "../pageRuntime/TableOutputPublisher";
import type { ComponentBlock, PageModel, ComponentOutputDefinition } from "../types/page";
import type { VisualHostActionEvent } from "../visual-engine/renderer/VisualRenderer";
import { sampleDocument } from "./testFixtures";
const clicks: VisualHostActionEvent[] = [];
vi.mock("./VisualRecordActions", () => ({ default: ({ children }: { children: (host: unknown) => React.ReactNode }) => children({ onHostAction: (event: VisualHostActionEvent) => clicks.push(event), getHostActionState: () => ({}) }) }));
const outputs: ComponentOutputDefinition[] = [{ id: "record", key: "selectedRecord", type: "record", source: { kind: "tableSelectedRecord" } }];
const details: ComponentBlock = { id: "details", type: "custom", dataBinding: { kind: "schema", parameters: { item: { source: "componentOutput", componentId: "customers", outputId: "record" } } }, props: { visualBuilder: { document: { ...sampleDocument, root: { ...sampleDocument.root, children: [{ id: "name", type: "heading", level: 2, text: "{{item.name}}" }, { id: "email", type: "text", text: "{{item.contact.email}}" }, { id: "edit", type: "button", label: "Edit customer", action: { name: "record", config: {} } }] } } } } };
const page: PageModel = { name: "Customers", sections: [{ type: "component", component: { id: "customers", type: "table", outputs } }, { type: "component", component: details }] };
it("updates separate visual panels through typed table outputs, preserves hidden IDs, and clears on deselect/unmount", async () => {
 function Harness() {
  const [record, setRecord] = useState<Record<string, unknown>>(), [mounted, setMounted] = useState(true);
  return h(PageRuntimeProvider, { page },
   h("button", { onClick: () => setRecord({ _id: "a", name: "Alice", contact: { email: "alice@example.com" } }) }, "Select Alice"),
   h("button", { onClick: () => setRecord({ _id: "b", name: "Bob", contact: { email: "bob@example.com" } }) }, "Select Bob"),
   h("button", { onClick: () => setRecord({ _id: "b", name: "Bob updated", contact: { email: "new@example.com" } }) }, "Refresh row"),
   h("button", { onClick: () => setRecord(undefined) }, "Clear"), h("button", { onClick: () => setMounted(false) }, "Unmount table"),
   mounted ? h(TableOutputPublisher, { componentId: "customers", outputs, state: { filters: {}, search: "", selectedRecord: record } }) : null,
   h(VisualBlock, { component: details }), h(VisualBlock, { component: { ...details, id: "details-copy" } }));
 }
 // The copy needs its own configured consumer entry in the real page graph.
 page.sections!.push({ type: "component", component: { ...details, id: "details-copy" } });
 render(h(Harness));
 expect(screen.getAllByText(/No visible record/)).toHaveLength(2);
 fireEvent.click(screen.getByText("Select Alice")); await screen.findAllByRole("heading", { name: "Alice" });
 fireEvent.click(screen.getByText("Select Bob")); await screen.findAllByRole("heading", { name: "Bob" });
 expect(screen.queryByRole("heading", { name: "Alice" })).toBeNull();
 fireEvent.click((await screen.findAllByRole("button", { name: "Edit customer" }))[0]);
 expect(clicks.at(-1)?.item?._id).toBe("b");
 fireEvent.click(screen.getByText("Refresh row")); await screen.findAllByRole("heading", { name: "Bob updated" });
 expect(screen.getAllByText("new@example.com")).toHaveLength(2);
 fireEvent.click(screen.getByText("Clear")); await waitFor(() => expect(screen.getAllByText(/No visible record/)).toHaveLength(2));
 fireEvent.click(screen.getByText("Select Alice")); await screen.findAllByRole("heading", { name: "Alice" });
 fireEvent.click(screen.getByText("Unmount table")); await waitFor(() => expect(screen.getAllByText(/No visible record/)).toHaveLength(2));
});
it("reports invalid references instead of showing stale or unresolved customer fields", () => {
 const invalid = { ...details, id: "invalid", dataBinding: { kind: "schema" as const, parameters: { item: { source: "componentOutput" as const, componentId: "missing", outputId: "record" } } } };
 render(h(PageRuntimeProvider, { page: { ...page, sections: [{ type: "component", component: invalid }] } }, h(VisualBlock, { component: invalid })));
 expect(screen.getByRole("alert").textContent).toMatch(/connection/i);
 expect(screen.queryByText("{{item.name}}")).toBeNull();
});
