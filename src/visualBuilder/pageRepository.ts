import type { AxiosInstance } from "axios";
import { createManagementClient } from "./managementClient";
import { extractPage, extractPages, listVisualBlocks, mergeVisualBlock, pageWritePayload, readVisualBlock, sameValue } from "./pageAdapter";
import type { ProjectScope, VisualBlockValue, VisualTarget } from "./types";

export function createPageRepository(scope: ProjectScope, client: AxiosInstance = createManagementClient(scope)) {
  const load = async (id: string) => extractPage((await client.get(`/admin/page/${encodeURIComponent(id)}`)).data);
  return {
    list: async () => extractPages((await client.get("/admin/page/")).data),
    load,
    async save({ pageId, target, value }: { pageId: string; target: VisualTarget; value: VisualBlockValue }) {
      const latest = await load(pageId);
      const merged = mergeVisualBlock(latest, target, value);
      await client.patch(`/admin/page/${encodeURIComponent(pageId)}`, pageWritePayload(merged));
      const saved = await load(pageId);
      const canonical = listVisualBlocks(saved).filter(block => block.id === target.componentId);
      const expected = readVisualBlock(listVisualBlocks(merged).find(block => block.id === target.componentId)!);
      if (canonical.length !== 1 || !sameValue(readVisualBlock(canonical[0]), expected)) throw new Error("The saved layout could not be confirmed. Reload before retrying; the backend may already have accepted the change.");
      return saved;
    },
  };
}
