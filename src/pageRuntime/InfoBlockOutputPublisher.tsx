import { useEffect } from "react";
import type {
  ComponentOutputDefinition,
  InfoBlockItemConfig,
} from "../types/page";
import { usePageRuntimeStore } from "./PageRuntimeProvider";
import { resolveInfoBlockOutput } from "./infoBlockOutputAdapter";

export default function InfoBlockOutputPublisher({
  componentId,
  outputs,
  selectedItem,
}: {
  componentId: string;
  outputs: ComponentOutputDefinition[];
  selectedItem?: InfoBlockItemConfig;
}) {
  const store = usePageRuntimeStore();

  useEffect(() => {
    outputs.forEach((output) => {
      const value = resolveInfoBlockOutput(output, selectedItem, Boolean(selectedItem));
      if (value.status === "available") {
        store.publishOutput(componentId, componentId, output.id, value.value);
      } else {
        store.markOutputUnavailable(componentId, componentId, output.id);
      }
    });
  }, [componentId, outputs, selectedItem, store]);

  useEffect(
    () => () =>
      outputs.forEach((output) => {
        store.markOutputUnavailable(componentId, componentId, output.id);
      }),
    [componentId, outputs, store],
  );

  return null;
}
