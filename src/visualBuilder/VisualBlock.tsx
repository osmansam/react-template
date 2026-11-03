import { Component, useId, type ReactNode } from "react";
import type { ComponentBlock } from "../types/page";
import type { ComponentNode } from "../visual-engine/model";
import { VisualRenderer } from "../visual-engine/renderer";
import { ozmishowEffectRegistry } from "../visual-engine/effects/registry";
import { ThemeScope } from "../visual-engine/theme";
import { ThemeProvider, useThemeMode } from "../visual-engine/host/ThemeProvider";
import { readVisualBlock } from "./pageAdapter";
import type { VisualBlockValue } from "./types";
import "../visual-engine/host/utilities.css";

class VisualBoundary extends Component<{ source: unknown; children: ReactNode }, { source: unknown; failed: boolean }> {
  state = { source: this.props.source, failed: false };
  static getDerivedStateFromProps(props: { source: unknown }, state: { source: unknown }) {
    return props.source === state.source ? null : { source: props.source, failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert">This visual section could not be rendered. Open it in the visual builder to review its content.</p> : this.props.children; }
}
function hasRepeater(node: ComponentNode): boolean {
  return node.type === "repeater" || ("children" in node && node.children.some(hasRepeater));
}
function RenderVisual({ value }: { value: VisualBlockValue }) {
  const { resolved } = useThemeMode(); const id = useId();
  return <ThemeScope theme={value.theme} palette={resolved} scopeId={`project-visual-${id}`}>
    {hasRepeater(value.document.root) ? <p role="status" className="p-3 text-sm">Collection data is not connected. Live API collections will be available in the next phase.</p> : null}
    <VisualRenderer document={value.document} mode="preview" effectRegistry={ozmishowEffectRegistry} />
  </ThemeScope>;
}
export default function VisualBlock({ component }: { component: ComponentBlock }) {
  let value: VisualBlockValue;
  try { value = readVisualBlock(component); }
  catch (error) { return <p role="alert">{error instanceof Error ? error.message : "Invalid visual document."}</p>; }
  return <div className="ve-utilities" data-visual-block={component.id}>
    <VisualBoundary source={component.props?.visualBuilder}>
      <ThemeProvider projectKey={component.id} defaultMode={value.theme?.defaultMode ?? "light"} persist={false}><RenderVisual value={value} /></ThemeProvider>
    </VisualBoundary>
  </div>;
}
