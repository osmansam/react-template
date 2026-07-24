import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RouteLoadingFallback } from "./RouteLoadingFallback";

describe("RouteLoadingFallback", () => {
  it("announces route loading without interrupting the user", () => {
    const markup = renderToStaticMarkup(createElement(RouteLoadingFallback));

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Loading page...");
  });
});
