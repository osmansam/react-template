import { describe, expect, it } from "vitest";
import { CANONICAL_THEME_COLOR_TOKENS, THEME_GRADIENT_TOKENS, type SiteTheme } from "./types";
import { parseSiteTheme } from "./validation";

function validPalette(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const palette: Record<string, unknown> = {};
  for (const token of CANONICAL_THEME_COLOR_TOKENS) {
    palette[token] = "#112233";
  }
  return { ...palette, ...overrides };
}

function validGradientSet(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  for (const token of THEME_GRADIENT_TOKENS) {
    set[token] = {
      kind: "linear-gradient",
      angle: 135,
      stops: [
        { color: { kind: "token", value: "primary" }, position: 0 },
        { color: { kind: "custom", value: " #ffffff " }, position: 100 },
      ],
    };
  }
  return { ...set, ...overrides };
}

function validThemeInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    defaultMode: "system",
    palettes: {
      light: validPalette({ primary: " #2563eb ", inverse: "#ffffff" }),
      dark: validPalette({ background: "rgb(15, 23, 42)" }),
    },
    gradients: {
      light: validGradientSet(),
      dark: validGradientSet({
        "gradient-hero": {
          kind: "radial-gradient",
          shape: "circle",
          stops: [
            { color: { kind: "token", value: "transparent" }, position: 0 },
            { color: { kind: "custom", value: "rgba(0, 0, 0, 0.5)" }, position: 50 },
            { color: { kind: "token", value: "surface" }, position: 100 },
          ],
        },
      }),
    },
    ...overrides,
  };
}

describe("theme/validation", () => {
  it("parses a valid theme with canonical + legacy tokens and trims custom colors", () => {
    const result = parseSiteTheme(validThemeInput());
    expect(result.success).toBe(true);
    if (!result.success) return;
    const theme: SiteTheme = result.value;
    expect(theme.version).toBe(1);
    expect(theme.defaultMode).toBe("system");
    expect(theme.palettes.light.primary).toBe("#2563eb");
    expect(theme.palettes.light.inverse).toBe("#ffffff");
    expect(theme.gradients.light["gradient-primary"].stops[1]!.color).toEqual({
      kind: "custom",
      value: "#ffffff",
    });
    expect(theme.gradients.dark["gradient-hero"]).toMatchObject({
      kind: "radial-gradient",
      shape: "circle",
    });
  });

  it("rejects non-plain-object inputs", () => {
    for (const input of [null, undefined, "theme", 123, [], new Date()]) {
      const result = parseSiteTheme(input, "$.theme");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toEqual([
          { path: "$.theme", code: "theme.object_required", message: "Theme must be an object" },
        ]);
      }
    }
  });

  it("rejects invalid version, unsupported mode, and unknown top-level keys", () => {
    const result = parseSiteTheme(validThemeInput({ version: 2, defaultMode: "auto", extra: true }));
    expect(result.success).toBe(false);
    if (result.success) return;
    const codes = result.issues.map((i) => `${i.path}:${i.code}`);
    expect(codes).toContain("$.version:theme.version_invalid");
    expect(codes).toContain("$.defaultMode:theme.mode_invalid");
    expect(codes).toContain("$.extra:theme.key_unknown");
  });

  it("validates missing palettes, missing canonical tokens, invalid colors, and unknown palette keys", () => {
    const missingPalettes = parseSiteTheme(validThemeInput({ palettes: null }));
    expect(missingPalettes.success).toBe(false);
    if (!missingPalettes.success) {
      expect(missingPalettes.issues.some((i) => i.code === "theme.palettes_required")).toBe(true);
    }

    const light = validPalette({ unknownToken: "#000000", primary: "javascript:alert(1)" });
    delete light.background;
    const result = parseSiteTheme(validThemeInput({
      palettes: { light, dark: "not-an-object" },
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    const codes = result.issues.map((i) => `${i.path}:${i.code}`);
    expect(codes).toContain("$.palettes.light.unknownToken:theme.key_unknown");
    expect(codes).toContain("$.palettes.light.background:theme.token_required");
    expect(codes).toContain("$.palettes.light.primary:theme.color_invalid");
    expect(codes).toContain("$.palettes.dark:theme.palette_required");
  });

  it("validates gradient structure, angles, shapes, stop ordering, and stop colors", () => {
    const result = parseSiteTheme(validThemeInput({
      gradients: {
        light: {
          "gradient-primary": {
            kind: "linear-gradient",
            angle: 400,
            shape: "circle",
            stops: [
              { color: { kind: "token", value: "primary" }, position: 60 },
              { color: { kind: "token", value: "nonexistent" }, position: 40 },
            ],
          },
          "gradient-hero": {
            kind: "radial-gradient",
            shape: "square",
            stops: [{ color: { kind: "custom", value: "#000" }, position: 0 }],
          },
          "gradient-surface": {
            kind: "conic-gradient",
            stops: [
              "bad-stop",
              { color: { kind: "custom", value: "not-a-color" }, position: 105 },
            ],
          },
        },
        dark: validGradientSet(),
      },
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    const pathsAndCodes = result.issues.map((i) => `${i.path}:${i.code}`);
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-primary.shape:theme.key_unknown");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-primary.angle:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-primary.stops[1].position:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-primary.stops[1].color:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-hero.shape:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-hero.stops:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-surface.kind:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-surface.stops[0]:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-surface.stops[1].position:theme.gradient_invalid");
    expect(pathsAndCodes).toContain("$.gradients.light.gradient-surface.stops[1].color:theme.gradient_invalid");
  });

  it("reports missing gradient sets and missing gradient tokens", () => {
    const partialLight = validGradientSet();
    delete partialLight["gradient-surface"];
    const result = parseSiteTheme(validThemeInput({
      gradients: { light: partialLight },
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.path === "$.gradients.light.gradient-surface" && i.code === "theme.gradient_required")).toBe(true);
    expect(result.issues.some((i) => i.path === "$.gradients.dark" && i.code === "theme.gradients_required")).toBe(true);
  });
});
