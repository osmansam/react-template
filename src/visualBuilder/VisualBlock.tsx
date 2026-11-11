import { Component, lazy, Suspense, useId, useMemo, type ReactNode } from "react";
import type { ComponentBlock } from "../types/page";
import type { ComponentDocument, ComponentNode } from "../visual-engine/model";
import { VisualRenderer } from "../visual-engine/renderer";
import { instantiateDocument } from "../visual-engine/renderer/instances";
import { ozmishowEffectRegistry } from "../visual-engine/effects/registry";
import { ThemeScope } from "../visual-engine/theme";
import { ThemeProvider } from "../visual-engine/host/ThemeProvider";
import { readVisualBlock } from "./document";
import type { VisualBlockValue } from "./types";
import { useVisualCollections } from "./data/useVisualCollections";
import { useResolvedComponentParameters } from "../pageRuntime/PageRuntimeProvider";
import { isRuntimeRecord } from "../pageRuntime/recordValue";
import type { VisualActionHost } from "./VisualRecordActions";
import { mainCellContainerId, readVisualCellSizing, withCellSizing } from "./cellSizing";
import "./cellSizing.css";
import "../visual-engine/host/utilities.css";
const VisualRecordActions = lazy(() => import("./VisualRecordActions"));

class VisualBoundary extends Component<{ source: unknown; children: ReactNode }, { source: unknown; failed: boolean }> {
  state = { source: this.props.source, failed: false };
  static getDerivedStateFromProps(props: { source: unknown }, state: { source: unknown }) {
    return props.source === state.source ? null : { source: props.source, failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert">This section is currently unavailable.</p> : this.props.children; }
}
function hasRepeater(node: ComponentNode): boolean {
  return node.type === "repeater" || ("children" in node && node.children.some(hasRepeater));
}
function hasActions(node: ComponentNode): boolean {
  return (node.type === "button" && !!node.action) || ("children" in node && node.children.some(hasActions));
}
function VisualScope({ theme, children }: { theme: VisualBlockValue["theme"]; children: ReactNode }) {
  const id = useId();
  return <ThemeScope theme={theme} palette="light" defaultMode="light" scopeId={`project-visual-${id}`}>{children}</ThemeScope>;
}
/** Only mounted for documents with repeaters, so static visuals never need the data layer. */
function ConnectedRenderer({ document, host, item }: { document: ComponentDocument; host?: VisualActionHost; item?: Record<string, unknown> }) {
  const { resolvedCollections, collectionStates } = useVisualCollections(document.root);
  return <VisualRenderer document={document} fillContainerId={mainCellContainerId(document)} publicContext={item ? { rootId: document.root.id, item } : undefined} mode="preview" themeMode="light" effectRegistry={ozmishowEffectRegistry} resolvedCollections={resolvedCollections} collectionStates={collectionStates} {...host} />;
}
function RenderVisual({ value, placementKey, item }: { value: VisualBlockValue; placementKey: string; item?: Record<string, unknown> }) {
  // A per-placement copy gives every DOM id a placement namespace; the saved document is never mutated.
  const document = useMemo(() => instantiateDocument(value.document, placementKey), [value.document, placementKey]);
  const connected = useMemo(() => hasRepeater(document.root), [document]);
  const render = (host?: VisualActionHost) => <VisualScope theme={value.theme}>
    {connected
      ? <ConnectedRenderer document={document} host={host} item={item} />
      : <VisualRenderer document={document} fillContainerId={mainCellContainerId(document)} publicContext={item ? { rootId: document.root.id, item } : undefined} mode="preview" themeMode="light" effectRegistry={ozmishowEffectRegistry} {...host} />}
  </VisualScope>;
  return hasActions(document.root) ? <Suspense fallback={<p role="status">Loading actions…</p>}><VisualRecordActions>{render}</VisualRecordActions></Suspense> : render();
}
/** The existing page runtime owns this dependency; ordinary static visuals need no provider. */
function SelectedRecordVisual({ component, value }: { component: ComponentBlock; value: VisualBlockValue }) {
 const resolution = useResolvedComponentParameters(component.id);
 if (resolution.status === "waiting") return <p role="status">No visible record is available in the connected table.</p>;
 if (resolution.status === "error" || !isRuntimeRecord(resolution.values.item)) return <p role="alert">This panel's record connection is invalid. Check the selected-record output in the page designer.</p>;
 return <RenderVisual value={value} placementKey={component.id} item={resolution.values.item} />;
}
export default function VisualBlock({ component }: { component: ComponentBlock }) {
  const envelope = component.props?.visualBuilder;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the saved envelope and block type are the only inputs.
  const parsed = useMemo(() => { try { return { value: readVisualBlock(component) }; } catch { return undefined; } }, [envelope, component.type]);
  const sizing = readVisualCellSizing(component);
  const value = useMemo(() => parsed ? { ...parsed.value, document: withCellSizing(parsed.value.document, sizing) } : undefined, [parsed, sizing]);
  if (!parsed || !value) return <p role="alert">This section is currently unavailable.</p>;
  return <div className="ve-utilities" data-visual-block={component.id} data-visual-cell-sizing={sizing}>
    <VisualBoundary source={envelope}>
      <ThemeProvider projectKey={component.id} defaultMode="light" fixedMode="light" persist={false}>{component.dataBinding?.parameters && Object.hasOwn(component.dataBinding.parameters, "item") ? <SelectedRecordVisual component={component} value={value} /> : <RenderVisual value={value} placementKey={component.id} />}</ThemeProvider>
    </VisualBoundary>
  </div>;
}
