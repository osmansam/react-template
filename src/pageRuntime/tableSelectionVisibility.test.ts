// @vitest-environment jsdom
import { createElement as h, Fragment, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import GenericTable from "../components/panelComponents/Tables/GenericTable";
let search = "";
beforeEach(() => { search = ""; });
afterEach(cleanup);
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));
vi.mock("../context/General.context", () => ({ useGeneralContext: () => ({ rowsPerPage: 1, setRowsPerPage: vi.fn(), expandedRows: {}, setExpandedRows: vi.fn(), searchQuery: search, setSearchQuery: vi.fn(), sortConfigKey: null, setSortConfigKey: vi.fn(), tableColumns: {}, setTableColumns: vi.fn(), selectedRows: [], setSelectedRows: vi.fn(), isSelectionActive: false, setIsSelectionActive: vi.fn(), tabOrientation: "horizontal", setTabOrientation: vi.fn() }) }));
vi.mock("../components/panelComponents/TabPanel/UnifiedTabPanel", () => ({ useTabPanelContext: () => ({ allowOrientationToggle: false }) }));
vi.mock("@material-tailwind/react", () => ({ Tooltip: ({ children }: { children: ReactNode }) => children }));
it("reports actual visible identities after local pagination/search without needing edit or bulk actions", async () => {
 const rows = [{ _id: "a", name: "Alice" }, { _id: "b", name: "Bob" }], report = vi.fn();
 const props = { rows, columns: [{ key: "Name", isActive: true, isSortable: false }], rowKeys: [{ key: "name" as const }], isActionsActive: false, isSelectionEnabled: true, onVisibleRowIdsChange: report, localIsSelectionActive: true };
 const tree = (currentPage: number) => h(MemoryRouter, {}, h(GenericTable<(typeof rows)[number]>, { ...props, currentPage }));
 const view = render(tree(1));
 await waitFor(() => expect(report).toHaveBeenLastCalledWith(["a"]));
 expect(view.container.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);
 view.rerender(tree(2)); await waitFor(() => expect(report).toHaveBeenLastCalledWith(["b"]));
 search = "no match"; view.rerender(tree(1)); await waitFor(() => expect(report).toHaveBeenLastCalledWith([]));
});

it("activates details by normal mouse/keyboard row interaction without bulk selection and ignores row controls", () => {
 const rows = [{ _id: "a", name: "Alice" }, { _id: "b", name: "Bob" }], activate = vi.fn(), edit = vi.fn(), legacyAction = vi.fn();
 const props = {
  rows, columns: [{ key: "Name", isActive: true, isSortable: false }, { key: "Controls", isActive: true, isSortable: false }],
  rowKeys: [{ key: "name" as const }, { key: "name" as const, node: (row: (typeof rows)[number]) => h(Fragment, {}, h("button", { onClick: edit }, "Edit " + row.name), h("a", { href: "#details" }, "Link " + row.name), h("input", { type: "checkbox", "aria-label": "Check " + row.name })) }],
  actions: [{ name: "Legacy action", icon: h("span", {}, "Legacy action"), onClick: legacyAction }],
  isActionsActive: true, isRowsPerPage: false, isSelectionEnabled: false, localIsSelectionActive: false, activeRecordId: "a", onRecordActivate: activate,
 };
 const view = render(h(MemoryRouter, {}, h(GenericTable<(typeof rows)[number]>, props)));
 const bob = screen.getByText("Bob").closest("tr")!;
 expect(screen.getByText("Alice").closest("tr")?.getAttribute("aria-selected")).toBe("true");
 fireEvent.click(screen.getByText("Bob")); expect(activate).toHaveBeenLastCalledWith("b");
 activate.mockClear(); fireEvent.keyDown(bob, { key: "Enter" }); fireEvent.keyDown(bob, { key: " " }); expect(activate).toHaveBeenCalledTimes(2);
 activate.mockClear(); fireEvent.click(screen.getByRole("button", { name: "Edit Bob" })); expect(edit).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole("link", { name: "Link Bob" })); fireEvent.click(screen.getByRole("checkbox", { name: "Check Bob" }));
 fireEvent.click(screen.getAllByText("Legacy action")[1]); expect(legacyAction).toHaveBeenCalledTimes(1);
 expect(activate).not.toHaveBeenCalled();
 view.rerender(h(MemoryRouter, {}, h(GenericTable<(typeof rows)[number]>, { ...props, onRecordActivate: undefined, activeRecordId: undefined })));
 fireEvent.click(screen.getByText("Bob")); expect(activate).not.toHaveBeenCalled(); expect(screen.getByText("Bob").closest("tr")?.getAttribute("tabindex")).toBeNull();
});

it("reports valid row IDs even when other visible rows have invalid IDs, preserving duplicate identities", async () => {
 const rows: { _id?: string | number; name: string }[] = [{ name: "No ID" }, { _id: "", name: "Empty ID" }, { _id: NaN, name: "Invalid numeric ID" }, { _id: "dup", name: "Duplicate one" }, { _id: "dup", name: "Duplicate two" }, { _id: "b", name: "Bob" }];
 const report = vi.fn();
 render(h(MemoryRouter, {}, h(GenericTable<(typeof rows)[number]>, { rows, columns: [{ key: "Name", isSortable: false }], rowKeys: [{ key: "name" }], isActionsActive: false, isRowsPerPage: false, onVisibleRowIdsChange: report, onRecordActivate: vi.fn() })));
 await waitFor(() => expect(report).toHaveBeenLastCalledWith(["dup", "dup", "b"]));
 expect(screen.getByText("No ID").closest("tr")?.getAttribute("tabindex")).toBeNull();
 expect(screen.getByText("Bob").closest("tr")?.getAttribute("tabindex")).toBe("0");
});
