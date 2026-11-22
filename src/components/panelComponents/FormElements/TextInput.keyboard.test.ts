// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TextInput from "./TextInput";
afterEach(cleanup);
it("supports named native number controls and caller supplied form attributes", () => {
  const change = vi.fn();
  render(
    h(TextInput, {
      id: "quantity",
      name: "quantity",
      label: "Quantity",
      type: "number",
      value: 1,
      onChange: change,
      isNumberButtonsActive: true,
      helpText: "Number of seats",
    }),
  );
  const input = screen.getByLabelText("Quantity") as HTMLInputElement;
  expect(input.id).toBe("quantity");
  expect(input.name).toBe("quantity");
  expect(
    document.getElementById(input.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toContain("Number of seats");
  fireEvent.click(screen.getByRole("button", { name: "Increase Quantity" }));
  expect(change).toHaveBeenLastCalledWith(2);
  expect(
    screen.getByRole("button", { name: "Decrease Quantity" }).tagName,
  ).toBe("BUTTON");
});
it("does not change a read-only checkbox", () => {
  const change = vi.fn();
  render(
    h(TextInput, {
      type: "checkbox",
      label: "Active",
      value: false,
      onChange: change,
      isReadOnly: true,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Active" }));
  expect(change).not.toHaveBeenCalled();
});
