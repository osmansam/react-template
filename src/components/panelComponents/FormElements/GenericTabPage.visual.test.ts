// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GenericTabPage from "./GenericTabPage";
vi.mock("../../../visualBuilder/VisualBlock", () => ({ default: () => createElement("p", null, "Visual catalog child") }));
vi.mock("./GenericPaginatedPage", () => ({ default: () => createElement("p", null, "Unexpected table") }));
vi.mock("./GenericUnpaginatedPage", () => ({ default: () => null }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("../../../pageRuntime/ComponentRequestBoundary", () => ({ ComponentRequestBoundary: ({ children }: { children: (value: unknown) => unknown }) => children({ values: {}, sourceRevisionFor: () => "" }) }));
afterEach(cleanup);
it("mounts a visual child as a visual block rather than a schema table", async () => {
 Object.defineProperty(HTMLElement.prototype, "scroll", { configurable: true, value: () => {} });
 render(createElement(MemoryRouter, {}, createElement(GenericTabPage, { tabs: [{ schemaName: "", label: "Catalog", component: { id: "visual", type: "custom", props: { visualBuilder: {} } } }] })));
 expect(await screen.findByText("Visual catalog child")).toBeTruthy();
 expect(screen.queryByText("Unexpected table")).toBeNull();
});
