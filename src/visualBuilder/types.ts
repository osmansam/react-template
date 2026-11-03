import type { ComponentBlock } from "../types/page";
import type { ComponentDocument } from "../visual-engine/model";
import type { SiteTheme } from "../visual-engine/theme";
export interface ProjectScope { tenant: string; project: string }
export interface VisualBlockValue { document: ComponentDocument; theme?: SiteTheme }
export interface VisualTarget { componentId: string; baseline?: ComponentBlock; isNew: boolean }
