import { describe, expect, it } from "vitest";
import { formatTableDate } from "./tableDateFormat";

describe("formatTableDate", () => {
  it("preserves the calendar day of an ISO midnight value", () => {
    expect(formatTableDate("2026-05-16T00:00:00.000Z", "MM/DD/YYYY"))
      .toBe("05/16/2026");
    expect(formatTableDate("2026-05-16T00:00:00.000Z", "DD/MM/YYYY"))
      .toBe("16/05/2026");
  });

  it("supports every configured table date format", () => {
    expect(formatTableDate("2026-05-16", "MM-DD-YYYY")).toBe("05-16-2026");
    expect(formatTableDate("2026-05-16", "DD-MM-YYYY")).toBe("16-05-2026");
    expect(formatTableDate("2026-05-16", "YYYY/MM/DD")).toBe("2026/05/16");
    expect(formatTableDate("2026-05-16", "YYYY-MM-DD")).toBe("2026-05-16");
  });
});
