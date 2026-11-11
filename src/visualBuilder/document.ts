import type { ComponentBlock } from "../types/page";
import { migrateComponentDocument } from "../visual-engine/model/migrations";
import { parseSiteTheme } from "../visual-engine/theme/validation";
import type { VisualBlockValue } from "./types";
export const isVisualBlock = (component: ComponentBlock) => component.type === "custom" && component.props?.visualBuilder !== undefined;
export function readVisualBlock(component: ComponentBlock): VisualBlockValue {
  const envelope: unknown = component.props?.visualBuilder;
  if (!isVisualBlock(component) || !envelope || typeof envelope !== "object") throw new Error("Invalid visual block configuration.");
  const input = envelope as Record<string, unknown>;
  const document = migrateComponentDocument(input.document);
  if (!document.success) throw new Error(`Invalid visual document: ${document.issues[0]?.message ?? "unsupported data"}`);
  if (input.theme === undefined) return { document: document.value };
  const theme = parseSiteTheme(input.theme);
  if (!theme.success) throw new Error(`Invalid visual theme: ${theme.issues[0]?.message ?? "unsupported data"}`);
  return { document: document.value, theme: theme.value };
}
