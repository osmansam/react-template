// @vitest-environment jsdom
import { createElement as h, type ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { GeneralContextProvider } from "../../../context/General.context";
import GenericTable from "./GenericTable";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
vi.mock("@material-tailwind/react", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../TabPanel/UnifiedTabPanel", () => ({
  useTabPanelContext: () => ({ allowOrientationToggle: false }),
}));
afterEach(cleanup);
it("keeps two tables' search, sort and selection independent", () => {
  const rows = [
    { _id: "a", name: "Alice" },
    { _id: "b", name: "Bob" },
  ];
  const table = (id: string) =>
    h(
      "section",
      { "aria-label": id },
      h(GenericTable<(typeof rows)[number]>, {
        title: id,
        searchPlaceholder: id + " search",
        rows,
        columns: [{ key: "Name", isActive: true, isSortable: true }],
        rowKeys: [{ key: "name" }],
        isActionsActive: false,
        isRowsPerPage: false,
        isSelectionEnabled: true,
      }),
    );
  render(
    h(
      MemoryRouter,
      {},
      h(GeneralContextProvider, {}, table("First"), table("Second")),
    ),
  );
  fireEvent.change(screen.getByPlaceholderText("First search"), {
    target: { value: "Alice" },
  });
  expect(
    within(screen.getByRole("region", { name: "First" })).queryByText("Bob"),
  ).toBeNull();
  expect(
    within(screen.getByRole("region", { name: "Second" })).getByText("Bob"),
  ).toBeTruthy();
  fireEvent.change(screen.getByPlaceholderText("First search"), {
    target: { value: "" },
  });
  const second = screen.getByRole("region", { name: "Second" });
  const before = within(second)
    .getAllByRole("row")
    .map((row) => row.textContent);
  fireEvent.click(
    within(screen.getByRole("region", { name: "First" })).getByText("Name"),
  );
  expect(
    within(second)
      .getAllByRole("row")
      .map((row) => row.textContent),
  ).toEqual(before);
  fireEvent.click(within(screen.getByRole("region", {name:"First"})).getByRole("button", {name:"Enable selection"}));
  expect(within(screen.getByRole("region", {name:"First"})).getAllByRole("checkbox").length).toBeGreaterThan(0);
  expect(within(second).queryAllByRole("checkbox")).toHaveLength(0);

});
