import { describe, expect, it } from "vitest";
import type { ComponentBlock } from "../types/page";
import {
  createSourceRevisionResolver,
  getComponentRequestSourceRevision,
  getParameterErrorNames,
  resolveReadySourceRevision,
} from "./ComponentRequestBoundary";

const component = (overrides: Partial<ComponentBlock> = {}): ComponentBlock => ({
  id: "summary",
  type: "table",
  dataBinding: {
    kind: "pipeline",
    schemaName: "orders",
    pipelineName: "summary",
    params: { region: "west" },
  },
  ...overrides,
});

describe("getComponentRequestSourceRevision", () => {
  it("changes with request source definitions", () => {
    expect(getComponentRequestSourceRevision(component())).not.toBe(
      getComponentRequestSourceRevision(
        component({
          dataBinding: {
            ...component().dataBinding!,
            pipelineName: "detail",
          },
        }),
      ),
    );
  });

  it("ignores renameable parameter aliases", () => {
    const first = component({
      dataBinding: {
        ...component().dataBinding!,
        parameters: {
          region: {
            source: "componentOutput",
            componentId: "filters",
            outputId: "selectedRegion",
          },
        },
      },
    });
    const second = component({
      dataBinding: {
        ...component().dataBinding!,
        parameters: {
          displayRegion: {
            source: "componentOutput",
            componentId: "filters",
            outputId: "renamedOutput",
          },
        },
      },
    });

    expect(getComponentRequestSourceRevision(first)).toBe(
      getComponentRequestSourceRevision(second),
    );
  });

  it("ignores legacy parameter values and does not expose them", () => {
    const first = getComponentRequestSourceRevision(component());
    const second = getComponentRequestSourceRevision(
      component({
        dataBinding: {
          ...component().dataBinding!,
          params: { region: "secret-value-that-must-not-appear" },
        },
      }),
    );

    expect(first).toBe(second);
    expect(second).not.toContain("secret-value-that-must-not-appear");
  });

  it("uses a collision-resistant deterministic digest", () => {
    const first = getComponentRequestSourceRevision(
      component({
        dataBinding: {
          ...component().dataBinding!,
          pipelineName: "876lsfeh4z2p",
        },
      }),
    );
    const second = getComponentRequestSourceRevision(
      component({
        dataBinding: {
          ...component().dataBinding!,
          pipelineName: "ofupsrqt0b21",
        },
      }),
    );

    expect(first).not.toBe(second);
    expect(first).toMatch(/^binding-[0-9a-f]{64}$/);
    expect(first).toBe(
      "binding-5c0c77302d614d0fcaa9d64d28c995b445c71ac7158636a46f35fa17323afa73",
    );
    expect(first).toBe(
      getComponentRequestSourceRevision(
        component({
          dataBinding: {
            ...component().dataBinding!,
            pipelineName: "876lsfeh4z2p",
          },
        }),
      ),
    );
  });

  it("hashes Unicode source identity as UTF-8 SHA-256", () => {
    expect(
      getComponentRequestSourceRevision(
        component({
          dataBinding: {
            ...component().dataBinding!,
            pipelineName: "你好🌍",
          },
        }),
      ),
    ).toBe(
      "binding-446d8869f6e7d4d0810da070c5b01ab57e1df742fcf66f2836560ddb0e0c1257",
    );
  });
});

describe("resolveReadySourceRevision", () => {
  const fallback = "binding-fallback";

  it("prefers a matching loaded container revision case-insensitively", () => {
    expect(
      resolveReadySourceRevision(
        "Orders",
        [
          { schemaName: "customers", updatedAt: "customer-revision" },
          { schemaName: "orders", updatedAt: "orders-revision" },
        ],
        fallback,
      ),
    ).toBe("orders-revision");
  });

  it("falls back when schema, container, or revision is missing", () => {
    expect(resolveReadySourceRevision("", [], fallback)).toBe(fallback);
    expect(
      resolveReadySourceRevision(
        "orders",
        [{ schemaName: "customers", updatedAt: "other" }],
        fallback,
      ),
    ).toBe(fallback);
    expect(
      resolveReadySourceRevision(
        "orders",
        [{ schemaName: "ORDERS", updatedAt: "   " }],
        fallback,
      ),
    ).toBe(fallback);
  });

  it("resolves different revisions for each request schema", () => {
    const sourceRevisionFor = createSourceRevisionResolver(
      [
        { schemaName: "orders", updatedAt: "orders-revision" },
        { schemaName: "CUSTOMERS", updatedAt: "customers-revision" },
      ],
      fallback,
    );

    expect(sourceRevisionFor("ORDERS")).toBe("orders-revision");
    expect(sourceRevisionFor("customers")).toBe("customers-revision");
    expect(sourceRevisionFor("missing")).toBe(fallback);
    expect(sourceRevisionFor()).toBe(fallback);
  });
});

describe("getParameterErrorNames", () => {
  it("returns only sorted unique parameter names", () => {
    expect(
      getParameterErrorNames([
        { code: "invalid_field", parameter: "secret", message: "value=123" },
        { code: "invalid_field", parameter: "account", message: "token=abc" },
        { code: "invalid_field", parameter: "secret", message: "other" },
        { code: "invalid_field", parameter: null, message: "internal detail" },
      ]),
    ).toEqual(["account", "secret"]);
  });
});
