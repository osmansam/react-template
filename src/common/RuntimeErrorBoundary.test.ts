// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RuntimeErrorBoundary } from "./RuntimeErrorBoundary";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("isolates a throwing child and reports only safe metadata", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const report = vi.fn();
  function Broken(): never {
    throw new Error("secret record");
  }
  render(
    h(
      "div",
      {},
      h("p", {}, "Navigation"),
      h(RuntimeErrorBoundary, { onError: report }, h(Broken)),
    ),
  );
  expect(screen.getByText("Navigation")).toBeTruthy();
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(report).toHaveBeenCalledWith({ kind: "render" });
  expect(screen.queryByText("secret record")).toBeNull();
});
it("retries a failed subtree and resets failure on navigation", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let broken = true;
  function Content() {
    if (broken) throw new Error("failed");
    return h("p", {}, "Recovered");
  }
  const tree = (key: string) =>
    h(RuntimeErrorBoundary, { resetKey: key }, h(Content));
  const view = render(tree("a"));
  broken = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText("Recovered")).toBeTruthy();
  broken = true;
  view.rerender(tree("b"));
  expect(screen.getByRole("alert")).toBeTruthy();
  broken = false;
  view.rerender(tree("c"));
  expect(screen.getByText("Recovered")).toBeTruthy();
});
