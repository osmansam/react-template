import React from "react";
import { describe, expect, it } from "vitest";
import { LinkCell, renderLinkedCellContent } from "./LinkCell";

const field = { name: "customerEmail", type: "string" } as any;
const row = { customerEmail: "buyer@example.com" };
const emailLink = {
  linkTemplate: "mailto:{{value}}",
  linkType: "email" as const,
};

describe("renderLinkedCellContent", () => {
  it("wraps formatted cell content with LinkCell when an email link is configured", () => {
    const fallback = React.createElement("span", null, "buyer@example.com");
    const result = renderLinkedCellContent(field, row, emailLink, fallback);

    expect(React.isValidElement(result)).toBe(true);
    expect((result as React.ReactElement).type).toBe(LinkCell);
    expect((result as React.ReactElement).props).toMatchObject({
      field,
      row,
      linkConfig: emailLink,
      labelOverride: fallback,
    });
  });

  it("returns formatted cell content unchanged when no link is configured", () => {
    const fallback = React.createElement("span", null, "Plain");
    expect(renderLinkedCellContent(field, row, undefined, fallback)).toBe(fallback);
  });
});
