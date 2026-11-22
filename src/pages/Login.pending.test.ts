// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import Login from "./Login";
vi.mock("../utils/api/auth", () => ({
  useLogin: () => ({ login: vi.fn(), isPending: true }),
  useRegister: () => ({ register: vi.fn(), isPending: false }),
  getLoginConfigFieldLabel: (f: { name: string }) => f.name,
  useLoginConfig: () => ({
    data: {
      loginFields: [{ name: "email" }, { name: "password", isHashed: true }],
      registerFields: [],
      isRegisterActive: true,
    },
  }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
afterEach(cleanup);
it("prevents repeated login submission while pending and supplies autofill metadata", () => {
  render(
    h(
      MemoryRouter,
      {},
      h(QueryClientProvider, { client: new QueryClient() }, h(Login)),
    ),
  );
  expect(
    (screen.getByRole("button", { name: "Sign In" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText("email") as HTMLInputElement).autocomplete,
  ).toBe("username");
  expect(
    (screen.getByLabelText("password") as HTMLInputElement).autocomplete,
  ).toBe("current-password");
});
