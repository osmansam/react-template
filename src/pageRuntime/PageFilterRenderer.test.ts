import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PageRuntimeProvider } from "./PageRuntimeProvider";
import PageFilterRenderer from "./PageFilterRenderer";
import type { PageFilterDefinition, PageModel } from "../types/page";

describe("PageFilterRenderer", () => {
  it("renders month-year page filters with the month-year picker", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T15:30:00.000Z"));
    try {
      const filter: PageFilterDefinition = {
        id: "pfl_month",
        key: "month",
        label: "Month",
        type: "monthYear",
        defaultPreset: "currentMonthYear",
        placement: { kind: "navbar" },
      };
      const page: PageModel = {
        name: "Reports",
        filters: [filter],
        sections: [],
      };

      const markup = renderToStaticMarkup(
        React.createElement(
          PageRuntimeProvider,
          { page },
          React.createElement(PageFilterRenderer, { filter }),
        ),
      );

      expect(markup).toContain("July 2026");
      expect(markup).not.toContain('type="text"');
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not render the filter key as a fallback label", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T15:30:00.000Z"));
    try {
      const filter: PageFilterDefinition = {
        id: "pfl_month",
        key: "internalMonthKey",
        label: "",
        type: "monthYear",
        defaultPreset: "currentMonthYear",
        placement: { kind: "navbar" },
      };
      const page: PageModel = {
        name: "Reports",
        filters: [filter],
        sections: [],
      };

      const markup = renderToStaticMarkup(
        React.createElement(
          PageRuntimeProvider,
          { page },
          React.createElement(PageFilterRenderer, { filter }),
        ),
      );

      expect(markup).not.toContain("internalMonthKey");
      expect(markup).toContain("July 2026");
    } finally {
      vi.useRealTimers();
    }
  });
});

it.each([["tr", "Eylül 2026"], ["en", "September 2026"]])("uses the configured %s filter language", (language, expected) => {
  const filter = { id: "month", key: "month", label: "", type: "monthYear" as const, defaultValue: "09-2026", language, placement: { kind: "navbar" as const } };
  const page = { name: "Reports", filters: [filter], sections: [] };
  const markup = renderToStaticMarkup(React.createElement(PageRuntimeProvider, { page }, React.createElement(PageFilterRenderer, { filter })));
  expect(markup).toContain(expected);
});
