// @vitest-environment jsdom
import { createElement as h } from "react";
import { act, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { useTableRecordSelection } from "./useTableRecordSelection";
it("shows the first visible record without bulk selection, switches on activation and resolves fresh data", () => {
 const original = [{ _id: "a", name: "Alice" }, { _id: "b", name: "Bob" }];
 let report: (ids: readonly (string | number)[]) => void = () => {}, activate: (id: string | number) => void = () => {};
 let renders = 0;
 function Harness({ rows, enabled = true }: { rows: unknown[]; enabled?: boolean }) {
  renders++; const state = useTableRecordSelection(rows, enabled); report = state.reportVisibleRowIds; activate = state.activateRecord;
  return h("output", {}, state.selectedRecord?.name as string || "empty");
 }
 const view = render(h(Harness, { rows: original }));
 act(() => report(["a", "b"])); expect(screen.getByText("Alice")).toBeTruthy();
 act(() => activate("b")); expect(screen.getByText("Bob")).toBeTruthy();
 act(() => activate("missing")); expect(screen.getByText("Bob")).toBeTruthy();
 const before = renders; for (let i=0; i<5; i++) act(() => report(["a", "b"])); expect(renders - before).toBeLessThanOrEqual(1);
 const updated = [{ _id: "a", name: "Alice" }, { _id: "b", name: "Bob updated" }];
 view.rerender(h(Harness, { rows: updated })); expect(screen.getByText("empty")).toBeTruthy();
 act(() => report(["a", "b"])); expect(screen.getByText("Bob updated")).toBeTruthy();
 act(() => report(["a"])); expect(screen.getByText("Alice")).toBeTruthy();
 act(() => report([])); expect(screen.getByText("empty")).toBeTruthy();
 act(() => report(["a", "b"])); expect(screen.getByText("Alice")).toBeTruthy();
 view.rerender(h(Harness, { rows: updated, enabled: false })); expect(screen.getByText("empty")).toBeTruthy();
});
