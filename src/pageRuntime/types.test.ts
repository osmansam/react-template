import { describe, expect, it } from "vitest";

import type { ComponentBlock, ParameterBinding } from "../types/page";

describe("page runtime contracts", () => {
  it("references a declared component output", () => {
    const binding: ParameterBinding = {
      source: "componentOutput",
      componentId: "cmp_products",
      outputId: "out_created_at",
    };
    const component: ComponentBlock = {
      id: "cmp_products",
      stateKey: "productTable",
      type: "table",
      outputs: [
        {
          id: "out_created_at",
          key: "createdAtFilter",
          type: "string",
          source: {
            kind: "tableFilter",
            filterId: "tfl_created_at",
          },
        },
      ],
    };

    expect(binding.outputId).toBe(component.outputs?.[0].id);
  });
});
