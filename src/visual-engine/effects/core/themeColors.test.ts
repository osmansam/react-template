import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_THEME, themeColorCss } from "../../theme";
import type { RegisteredEffect } from "./types";
import { isEffectColorValue, resolveEffectColor, resolveEffectColorProps } from "./themeColors";

const resolvedPalette = DEFAULT_SITE_THEME.palettes.light;
const DummyComponent: RegisteredEffect["component"] = () => null;

function makeEffect(overrides: Partial<RegisteredEffect> = {}): RegisteredEffect {
  return {
    id: "test-effect",
    provider: "test",
    name: "Test Effect",
    category: "background",
    layer: "background",
    stacking: "single",
    compatibleNodes: ["section"],
    schemaVersion: 1,
    inputs: [
      { key: "tint", label: "Tint", kind: "color", defaultValue: "#ffffff", required: false, acceptsSemantic: true },
      { key: "rawColor", label: "Raw Color", kind: "color", defaultValue: "#000000", required: false },
      { key: "intensity", label: "Intensity", kind: "number", defaultValue: 1, min: 0, max: 10, step: 1, required: false },
    ],
    component: DummyComponent,
    runtime: {
      kind: "css",
      clientRequired: false,
      usesWebGL: false,
      performanceCost: "low",
      supportsReducedMotion: true,
      pointerInteraction: "none",
    },
    ...overrides,
  };
}

describe("effects/core/themeColors", () => {
  describe("isEffectColorValue", () => {
    it("accepts safe custom CSS color strings and custom/token objects", () => {
      expect(isEffectColorValue("#ff00aa")).toBe(true);
      expect(isEffectColorValue("rgba(10, 20, 30, 0.5)")).toBe(true);
      expect(isEffectColorValue({ kind: "custom", value: "#123456" })).toBe(true);
      expect(isEffectColorValue({ kind: "token", value: "primary" })).toBe(true);
      expect(isEffectColorValue({ kind: "token", value: "transparent" })).toBe(true);
    });

    it("rejects unsafe strings, unknown tokens, extra keys, and non-color values", () => {
      expect(isEffectColorValue("url(javascript:alert(1))")).toBe(false);
      expect(isEffectColorValue({ kind: "custom", value: "not-a-color" })).toBe(false);
      expect(isEffectColorValue({ kind: "token", value: "unknown-token" })).toBe(false);
      expect(isEffectColorValue({ kind: "token", value: "primary", extra: true })).toBe(false);
      expect(isEffectColorValue({ kind: "other", value: "#fff" })).toBe(false);
      expect(isEffectColorValue(null)).toBe(false);
      expect(isEffectColorValue(42)).toBe(false);
      expect(isEffectColorValue(["#fff"])).toBe(false);
    });
  });

  describe("resolveEffectColor", () => {
    it("returns raw strings and trimmed custom color objects as-is", () => {
      expect(resolveEffectColor("#abcdef", resolvedPalette, "css")).toBe("#abcdef");
      expect(resolveEffectColor({ kind: "custom", value: "  #112233  " }, resolvedPalette, "concrete")).toBe("#112233");
    });

    it("resolves transparent token to 'transparent' regardless of delivery", () => {
      expect(resolveEffectColor({ kind: "token", value: "transparent" }, resolvedPalette, "css")).toBe("transparent");
      expect(resolveEffectColor({ kind: "token", value: "transparent" }, resolvedPalette, "concrete")).toBe("transparent");
    });

    it("resolves semantic tokens to CSS vars for css delivery and concrete palette values for concrete delivery", () => {
      const token = { kind: "token" as const, value: "primary" as const };
      expect(resolveEffectColor(token, resolvedPalette, "css")).toBe(themeColorCss(token));
      expect(resolveEffectColor(token, resolvedPalette, "concrete")).toBe(resolvedPalette.primary);
    });
  });

  describe("resolveEffectColorProps", () => {
    it("delivers CSS variables for css/dom runtimes and concrete colors for webgl/canvas runtimes", () => {
      const props = {
        tint: { kind: "token", value: "primary" },
        rawColor: { kind: "token", value: "accent" },
        intensity: 5,
      };
      const cssEffect = makeEffect({ runtime: { kind: "css", clientRequired: false, usesWebGL: false, performanceCost: "low", supportsReducedMotion: true, pointerInteraction: "none" } });
      const cssResolved = resolveEffectColorProps(cssEffect, props, resolvedPalette);
      expect(cssResolved.tint).toBe(themeColorCss({ kind: "token", value: "primary" }));
      // rawColor does not have acceptsSemantic: true, so it is untouched
      expect(cssResolved.rawColor).toEqual({ kind: "token", value: "accent" });
      expect(cssResolved.intensity).toBe(5);
      // Original props object is not mutated
      expect(props.tint).toEqual({ kind: "token", value: "primary" });

      const webglEffect = makeEffect({ runtime: { clientRequired: true, usesWebGL: true, performanceCost: "high", supportsReducedMotion: false, pointerInteraction: "none" } });
      const webglResolved = resolveEffectColorProps(webglEffect, props, resolvedPalette);
      expect(webglResolved.tint).toBe(resolvedPalette.primary);

      const canvasEffect = makeEffect({ runtime: { kind: "canvas2d", clientRequired: true, usesWebGL: false, performanceCost: "medium", supportsReducedMotion: true, pointerInteraction: "none" } });
      expect(resolveEffectColorProps(canvasEffect, props, resolvedPalette).tint).toBe(resolvedPalette.primary);
    });

    it("returns the original props object when no semantic color inputs match", () => {
      const effect = makeEffect();
      const props = { tint: "not-a-color", intensity: 3 };
      expect(resolveEffectColorProps(effect, props, resolvedPalette)).toBe(props);
    });
  });
});
