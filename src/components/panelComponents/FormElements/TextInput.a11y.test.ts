// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TextInput from "./TextInput";

afterEach(cleanup);

function renderInput(
  props: Partial<ComponentProps<typeof TextInput>> = {},
) {
  return render(
    createElement(TextInput, {
      type: "text",
      value: "",
      onChange: vi.fn(),
      ...props,
    }),
  );
}

describe("TextInput accessibility", () => {
  it("associates each label with a unique input", () => {
    render(
      createElement(
        "div",
        null,
        createElement(TextInput, {
          key: "email",
          label: "Email",
          type: "text",
          value: "",
          onChange: vi.fn(),
        }),
        createElement(TextInput, {
          key: "password",
          label: "Password",
          type: "password",
          value: "",
          onChange: vi.fn(),
        }),
      ),
    );

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    const password = screen.getByLabelText("Password") as HTMLInputElement;

    expect(email.id).not.toBe("");
    expect(password.id).not.toBe("");
    expect(email.id).not.toBe(password.id);
  });

  it("gives the password visibility control an accessible name and state", () => {
    renderInput({ label: "Password", type: "password", value: "secret" });

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Password") as HTMLInputElement).type,
    ).toBe("text");
  });

  it("exposes validation errors through aria-invalid and aria-describedby", () => {
    renderInput({ label: "Email", error: "Email is required" });

    const input = screen.getByLabelText("Email") as HTMLInputElement;
    const alert = screen.getByRole("alert");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
    expect(alert.textContent).toBe("Email is required");
  });

  it("names icon-only actions such as clear", () => {
    const onClear = vi.fn();
    renderInput({ label: "Search", value: "query", onClear });

    fireEvent.click(screen.getByRole("button", { name: "Clear value" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("announces checkbox state", () => {
    renderInput({ label: "Active", type: "checkbox", value: false });

    const toggle = screen.getByRole("button", { name: "Active" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});
