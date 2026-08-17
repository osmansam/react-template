import { useEffect } from "react";
import type { ComponentOutputDefinition } from "../types/page";
import { usePageRuntimeStore } from "./PageRuntimeProvider";
import { resolveTableOutput, type TableOutputState } from "./tableOutputAdapter";

export default function TableOutputPublisher({ componentId, outputs, state }: {
  componentId: string;
  outputs: ComponentOutputDefinition[];
  state: TableOutputState;
}) {
  const store = usePageRuntimeStore();
  useEffect(() => {
    outputs.forEach((output) => {
      const value = resolveTableOutput(output, state);
      if (value.status === "available") {
        store.publishOutput(componentId, componentId, output.id, value.value);
      } else {
        store.markOutputUnavailable(componentId, componentId, output.id);
      }
    });
  }, [componentId, outputs, state, store]);
  useEffect(() => () => outputs.forEach((output) => {
    store.markOutputUnavailable(componentId, componentId, output.id);
  }), [componentId, outputs, store]);
  return null;
}
