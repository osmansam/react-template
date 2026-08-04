import { describe, expect, it } from "vitest";
import { resolveProjectLocale } from "./localeResolution";

describe("resolveProjectLocale", () => {
  it("uses saved locale only when enabled", () => {
    expect(resolveProjectLocale(["en", "tr"], "tr", "en", "en")).toBe("tr");
    expect(resolveProjectLocale(["en", "tr"], "de", "tr", "en", "de")).toBe("tr");
  });

  it("falls back to project source rather than hardcoded English", () => {
    expect(resolveProjectLocale(["tr"], null, "de", "tr", "de")).toBe("tr");
  });
});
