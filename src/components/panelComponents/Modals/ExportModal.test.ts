import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ExportModal from "./ExportModal";

describe("ExportModal", () => {
  it("renders its backdrop above the fixed sidebar", () => {
    const markup = renderToStaticMarkup(
      createElement(ExportModal, {
        isOpen: true,
        close: () => undefined,
        fields: [],
        onExport: () => undefined,
        schemaName: "Orders",
        currentPage: 1,
        totalPages: 1,
      }),
    );

    expect(markup).toContain("z-[60]");
  });
});
