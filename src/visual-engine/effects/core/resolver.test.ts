import { describe, expect, it } from "vitest";
import type { EffectAttachment } from "../../model/effects";
import type { EffectRegistry, RegisteredEffect } from "./types";
import { resolveNodeEffects } from "./resolver";

const DummyComponent: RegisteredEffect["component"] = () => null;
const FallbackComponent: RegisteredEffect["component"] = () => null;

function makeEffect(id: string, overrides: Partial<RegisteredEffect> = {}): RegisteredEffect {
  return {
    id,
    provider: "test",
    name: id,
    category: "background",
    layer: "background",
    stacking: "single",
    compatibleNodes: ["section", "card"],
    schemaVersion: 1,
    inputs: [
      { key: "speed", label: "Speed", kind: "number", defaultValue: 1, min: 0, max: 10, step: 1, required: false },
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

function makeAttachment(attachmentId: string, effectId: string, overrides: Partial<EffectAttachment> = {}): EffectAttachment {
  return {
    attachmentId,
    effectId,
    version: 1,
    enabled: true,
    props: {},
    ...overrides,
  };
}

function makeRegistry(effects: RegisteredEffect[]): EffectRegistry {
  const map = new Map(effects.map((e) => [e.id, e]));
  return {
    get: (id) => map.get(id),
    list: () => effects,
  };
}

describe("effects/core/resolver", () => {
  it("resolves ready enabled effects into their declared layers and excludes disabled ones from layers", () => {
    const bg = makeEffect("bg-glow", { layer: "background" });
    const ov = makeEffect("shine", { layer: "overlay" });
    const registry = makeRegistry([bg, ov]);

    const result = resolveNodeEffects(
      {
        id: "sec-1",
        type: "section",
        effects: [
          makeAttachment("a1", "bg-glow", { props: { speed: 4 } }),
          makeAttachment("a2", "shine", { enabled: false }),
        ],
      },
      registry,
    );

    expect(result.all).toHaveLength(2);
    expect(result.background).toHaveLength(1);
    expect(result.background[0]!.validatedProps).toEqual({ speed: 4 });
    expect(result.overlay).toHaveLength(0);
    expect(result.content).toHaveLength(0);
    expect(result.interaction).toHaveLength(0);
  });

  it("reports unavailable, unsupported-version, invalid-config, and incompatible-node statuses", () => {
    const effect = makeEffect("card-only", { compatibleNodes: ["card"], schemaVersion: 2, fallback: FallbackComponent });
    const registry = makeRegistry([effect]);

    const result = resolveNodeEffects(
      {
        id: "sec-1",
        type: "section",
        effects: [
          makeAttachment("a1", "unknown"),
          makeAttachment("a2", "card-only", { version: 1 }),
          makeAttachment("a3", "card-only", { version: 2, props: { speed: 999 } }),
          makeAttachment("a4", "card-only", { version: 2, props: { speed: 2 } }),
        ],
      },
      registry,
    );

    expect(result.all.map((e) => [e.status, e.diagnostics[0]?.code])).toEqual([
      ["unavailable", "effect.unavailable"],
      ["unsupported-version", "effect.version_unsupported"],
      ["invalid-config", "effect.config_invalid"],
      ["incompatible", "effect.node_incompatible"],
    ]);
    // Because fallback is defined on card-only, failed enabled attachments still populate their layer with useFallback=true and default props
    expect(result.all[1]!.useFallback).toBe(true);
    expect(result.all[1]!.validatedProps).toEqual({ speed: 1 });
    expect(result.background).toHaveLength(3);
  });

  it("checks runtime capabilities: webgl, clientRequired, pointerInteraction, and reducedMotion", () => {
    const webgl = makeEffect("webgl", { runtime: { clientRequired: false, usesWebGL: true, performanceCost: "high", supportsReducedMotion: true, pointerInteraction: "none" } });
    const client = makeEffect("client", { runtime: { clientRequired: true, usesWebGL: false, performanceCost: "low", supportsReducedMotion: true, pointerInteraction: "none" } });
    const pointer = makeEffect("pointer", { runtime: { clientRequired: false, usesWebGL: false, performanceCost: "low", supportsReducedMotion: true, pointerInteraction: "required" } });
    const motion = makeEffect("motion", { runtime: { clientRequired: false, usesWebGL: false, performanceCost: "low", supportsReducedMotion: false, pointerInteraction: "none" } });
    const registry = makeRegistry([webgl, client, pointer, motion]);

    const result = resolveNodeEffects(
      {
        id: "sec-1",
        type: "section",
        effects: [
          makeAttachment("a1", "webgl"),
          makeAttachment("a2", "client"),
          makeAttachment("a3", "pointer"),
          makeAttachment("a4", "motion"),
        ],
      },
      registry,
      { allowWebGL: false, allowPointerInteraction: false, reducedMotion: true, clientAvailable: false },
    );

    expect(result.all.map((e) => e.diagnostics[0]?.code)).toEqual([
      "effect.webgl_unavailable",
      "effect.client_required",
      "effect.pointer_unavailable",
      "effect.reduced_motion_unsupported",
    ]);
    expect(result.background).toHaveLength(0);
  });

  it("enforces single stacking while allowing multiple stacking", () => {
    const single = makeEffect("single-fx", { stacking: "single" });
    const multi = makeEffect("multi-fx", { stacking: "multiple" });
    const registry = makeRegistry([single, multi]);

    const result = resolveNodeEffects(
      {
        id: "sec-1",
        type: "section",
        effects: [
          makeAttachment("s1", "single-fx"),
          makeAttachment("s2", "single-fx"),
          makeAttachment("m1", "multi-fx"),
          makeAttachment("m2", "multi-fx"),
        ],
      },
      registry,
    );

    expect(result.all[0]!.status).toBe("ready");
    expect(result.all[1]!.status).toBe("incompatible");
    expect(result.all[1]!.diagnostics[0]?.code).toBe("effect.stacking_single");
    expect(result.all[2]!.status).toBe("ready");
    expect(result.all[3]!.status).toBe("ready");
  });

  it("marks both sides incompatible when effects conflict", () => {
    const a = makeEffect("fx-a", { conflictsWith: ["fx-b"] });
    const b = makeEffect("fx-b");
    const registry = makeRegistry([a, b]);

    const result = resolveNodeEffects(
      {
        id: "sec-1",
        type: "section",
        effects: [makeAttachment("a1", "fx-a"), makeAttachment("b1", "fx-b")],
      },
      registry,
    );

    expect(result.all[0]!.diagnostics[0]?.code).toBe("effect.conflict");
    expect(result.all[1]!.diagnostics[0]?.code).toBe("effect.conflict");
    expect(result.background).toHaveLength(0);
  });

  it("propagates missing requirements transitively across dependent effects", () => {
    const base = makeEffect("base", { runtime: { clientRequired: false, usesWebGL: true, performanceCost: "high", supportsReducedMotion: true, pointerInteraction: "none" } });
    const mid = makeEffect("mid", { requires: ["base"] });
    const top = makeEffect("top", { requires: ["mid"] });
    const registry = makeRegistry([base, mid, top]);

    const result = resolveNodeEffects(
      {
        id: "sec-1",
        type: "section",
        effects: [
          makeAttachment("a1", "base"),
          makeAttachment("a2", "mid"),
          makeAttachment("a3", "top"),
        ],
      },
      registry,
      { allowWebGL: false, allowPointerInteraction: true, reducedMotion: false, clientAvailable: true },
    );

    expect(result.all[0]!.diagnostics[0]?.code).toBe("effect.webgl_unavailable");
    expect(result.all[1]!.diagnostics[0]?.code).toBe("effect.requirement_missing");
    expect(result.all[2]!.diagnostics[0]?.code).toBe("effect.requirement_missing");
  });
});
