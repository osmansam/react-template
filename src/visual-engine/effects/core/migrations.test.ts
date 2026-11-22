import { describe, expect, it } from "vitest";
import type { ComponentDocument } from "../../model/document";
import type { EffectAttachment } from "../../model/effects";
import type { EffectRegistry, RegisteredEffect } from "./types";
import { migrateEffectAttachment, proposeEffectDocumentMigration } from "./migrations";

const DummyComponent: RegisteredEffect["component"] = () => null;

function makeRegistration(overrides: Partial<RegisteredEffect> = {}): RegisteredEffect {
  return {
    id: "glow",
    provider: "test",
    name: "Glow",
    category: "background",
    layer: "background",
    stacking: "single",
    compatibleNodes: ["section", "card"],
    schemaVersion: 3,
    inputs: [],
    component: DummyComponent,
    runtime: {
      kind: "css",
      clientRequired: false,
      usesWebGL: false,
      performanceCost: "low",
      supportsReducedMotion: true,
      pointerInteraction: "none",
    },
    migrations: {
      1: (att) => ({ ...att, version: 2, props: { ...att.props, intensity: (att.props.strength as number) * 2 } }),
      2: (att) => ({ ...att, version: 3, props: { ...att.props, soft: true } }),
    },
    ...overrides,
  };
}

function makeAttachment(overrides: Partial<EffectAttachment> = {}): EffectAttachment {
  return {
    attachmentId: "att-1",
    effectId: "glow",
    version: 1,
    enabled: true,
    props: { strength: 5 },
    metadata: { source: "preset" },
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

describe("effects/core/migrations", () => {
  describe("migrateEffectAttachment", () => {
    it("returns unchanged clone when attachment version matches schemaVersion", () => {
      const att = makeAttachment({ version: 3 });
      const result = migrateEffectAttachment(att, makeRegistration());
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.changed).toBe(false);
      expect(result.attachment).toEqual(att);
      expect(result.attachment).not.toBe(att);
    });

    it("runs sequential multi-step migrations without mutating the input attachment", () => {
      const att = makeAttachment({ version: 1, props: { strength: 4 } });
      const snapshot = structuredClone(att);
      const result = migrateEffectAttachment(att, makeRegistration());
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.changed).toBe(true);
      expect(result.attachment.version).toBe(3);
      expect(result.attachment.props).toEqual({ strength: 4, intensity: 8, soft: true });
      expect(att).toEqual(snapshot);
    });

    it("fails when attachment version is newer than schemaVersion", () => {
      const result = migrateEffectAttachment(makeAttachment({ version: 4 }), makeRegistration({ schemaVersion: 3 }));
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.diagnostic.code).toBe("effect.migration_version_newer");
      expect(result.diagnostic.status).toBe("unsupported-version");
    });

    it("fails when a migration step is missing", () => {
      const reg = makeRegistration({ migrations: { 1: (att) => ({ ...att, version: 2 }) } });
      const result = migrateEffectAttachment(makeAttachment({ version: 1 }), reg);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.diagnostic.code).toBe("effect.migration_path_missing");
    });

    it("fails when a migration changes identity, envelope, or skips versions", () => {
      const identityChanged = migrateEffectAttachment(
        makeAttachment({ version: 2 }),
        makeRegistration({ migrations: { 2: (att) => ({ ...att, attachmentId: "other", version: 3 }) } }),
      );
      expect(identityChanged.success).toBe(false);
      if (!identityChanged.success) expect(identityChanged.diagnostic.code).toBe("effect.migration_identity_invalid");

      const envelopeChanged = migrateEffectAttachment(
        makeAttachment({ version: 2 }),
        makeRegistration({ migrations: { 2: (att) => ({ ...att, enabled: false, version: 3 }) } }),
      );
      expect(envelopeChanged.success).toBe(false);
      if (!envelopeChanged.success) expect(envelopeChanged.diagnostic.code).toBe("effect.migration_envelope_invalid");

      const versionSkipped = migrateEffectAttachment(
        makeAttachment({ version: 1 }),
        makeRegistration({ migrations: { 1: (att) => ({ ...att, version: 3 }) } }),
      );
      expect(versionSkipped.success).toBe(false);
      if (!versionSkipped.success) expect(versionSkipped.diagnostic.code).toBe("effect.migration_version_invalid");
    });

    it("catches thrown errors including attempts to mutate the frozen input", () => {
      const throwingReg = makeRegistration({
        migrations: {
          2: (att) => {
            (att.props as Record<string, unknown>).mutated = true;
            return { ...att, version: 3 };
          },
        },
      });
      const result = migrateEffectAttachment(makeAttachment({ version: 2 }), throwingReg);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.diagnostic.code).toBe("effect.migration_failed");
    });
  });

  describe("proposeEffectDocumentMigration", () => {
    it("migrates nested attachments across the tree, records diagnostics, and leaves original untouched", () => {
      const doc: ComponentDocument = {
        version: 2,
        id: "doc-1",
        name: "Effects Doc",
        root: {
          id: "root",
          type: "section",
          effects: [
            makeAttachment({ attachmentId: "att-ok", version: 1 }),
            makeAttachment({ attachmentId: "att-unregistered", effectId: "missing", version: 1 }),
          ],
          children: [
            {
              id: "card-1",
              type: "card",
              element: "article",
              effects: [
                makeAttachment({ attachmentId: "att-current", version: 3 }),
                makeAttachment({ attachmentId: "att-too-new", version: 5 }),
              ],
              children: [],
            },
          ],
        },
      };
      const before = structuredClone(doc);
      const proposal = proposeEffectDocumentMigration(doc, makeRegistry([makeRegistration()]));

      expect(proposal.original).toBe(doc);
      expect(doc).toEqual(before);
      expect(proposal.changedAttachmentIds).toEqual(["att-ok"]);
      expect(proposal.diagnostics).toHaveLength(1);
      expect(proposal.diagnostics[0]).toMatchObject({
        attachmentId: "att-too-new",
        code: "effect.migration_version_newer",
      });
      expect(proposal.migrated.root.effects?.[0]?.version).toBe(3);
      expect(proposal.migrated.root.effects?.[1]?.effectId).toBe("missing");
    });
  });
});
