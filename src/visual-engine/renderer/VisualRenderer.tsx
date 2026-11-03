"use client";

import { useMemo, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { resolveComponentRenderer } from "../components/renderers/registry";
import { heightScale } from "../model/proportionalSizing";
import { nodeClassNames, nodeWrapperClassName, structuralChildPresentation, combineNodeStyles, withoutBackground } from "./nodePresentation";
export { nodeClassNames } from "./nodePresentation";
import type { AnimationSpec, Breakpoint, ComponentDocument, ComponentNode, StructuralNode, SlotNode, RepeaterNode, StyleSpec } from "../model";
import { isActiveAnimation } from "../model/animation";
import type { RenderNodeOptions } from "../components/renderers/types";
import { VisualImage } from "./images/VisualImage";
import { leadingImageId } from "./images/imagePriority";
import { AnimatedNode } from "./AnimatedNode";
import { BackgroundLayers } from "./BackgroundLayers";
import { pageTextPaintStyle } from "./paintStyles";
import { EffectHost, type EffectDiagnostic, type EffectRegistry } from "../effects/core";
import { DisclosureRuntime, type DisclosurePreviewState } from "./DisclosureRuntime";
import { TabsRuntime } from "./TabsRuntime";
import { SidebarRuntime } from "./SidebarRuntime";
import { isStructuralNode, type NodePatch } from "../operations";
import { bindNode } from "./bindings";
import { boundedCollection, collectionSourceKey, type ResolvedCollectionMap, type ResolvedCollectionRecord } from "./repeaters";
import { inlineTextValue, type InlineEditTarget } from "./InlineTextEditor";
import { buildResponsiveSpacingCss, hasResponsiveChildGap, responsiveChildGapClassName, responsiveSpacingClassName } from "./responsiveSpacing";
import "./visual-renderer.css";
import {
  gridPlacementClassNames,
  HEADING_BASE_CLASSES,

  TEXT_BASE_CLASSES,

} from "./styleTokens";
import type { VisualSiteContext } from "./siteContext";
import type { ThemeMode } from "../theme";

export interface SpanOverride { nodeId: string; span: number }

/** Canvas-only live preview of a custom pixel width/height before it is committed. */
export interface SizeOverride { nodeId: string; width?: number; height?: number }

/** Canvas-only hooks that make existing components draggable for reorder/reparent drops. */
export interface CanvasNodeDragProps {
  onDragStart(nodeId: string, event: DragEvent<HTMLDivElement>): void;
}

/** Canvas-only inline text editing hooks for text-bearing nodes (headings, text, buttons, repeated entries). */
export interface InlineTextEditProps {
  editingNodeId: string | null;
  /** Field target currently being edited (null for the node's default single text field). */
  editingTarget?: InlineEditTarget | null;
  onStartEdit(nodeId: string, target?: InlineEditTarget): void;
  onCommit(nodeId: string, value: string, target?: InlineEditTarget): void;
  onCancel(nodeId: string): void;
}

interface VisualRendererBaseProps {
  document: ComponentDocument;
  publicContext?: { rootId: string; priorityImageId?: string; item?: ResolvedCollectionRecord; inherited?: InheritedAnimation };
  selectedNodeId?: string;
  onSelect?: (nodeId: string) => void;
  spanOverride?: SpanOverride;
  sizeOverride?: SizeOverride;
  replayTokens?: Record<string, number>;
  /** Editor-only entry animation clock in milliseconds; omitted for runtime playback. */
  motionTime?: number;
  effectRegistry?: EffectRegistry;
  onEffectDiagnostic?: (diagnostic: EffectDiagnostic) => void;
  disclosurePreview?: DisclosurePreviewState;
  interactiveDisclosures?: boolean;
  resolvedCollections?: ResolvedCollectionMap;
  site?: VisualSiteContext;
  themeMode?: ThemeMode;
  inlineTextEdit?: InlineTextEditProps;
  nodeDrag?: CanvasNodeDragProps;
  /** Canvas-only structural edits triggered from controls rendered inside a node. */
  onNodePatch?: (nodeId: string, patch: NodePatch) => void;
}

export type VisualRendererProps = VisualRendererBaseProps & (
  | { mode: "canvas"; breakpoint: Breakpoint }
  | { mode?: "preview"; breakpoint?: never }
);

interface RendererContext {
  priorityImageId?: string;
  interactiveExpansions?: boolean;
  mode: "preview" | "canvas";
  breakpoint?: Breakpoint;
  selectedNodeId?: string;
  onSelect?: (nodeId: string) => void;
  spanOverride?: SpanOverride;
  sizeOverride?: SizeOverride;
  replayTokens?: Record<string, number>;
  motionTime?: number;
  effectRegistry?: EffectRegistry;
  onEffectDiagnostic?: (diagnostic: EffectDiagnostic) => void;
  disclosurePreview?: DisclosurePreviewState;
  interactiveDisclosures?: boolean;
  resolvedCollections?: ResolvedCollectionMap;
  item?: ResolvedCollectionRecord;
  reducedMotion: boolean;
  site?: VisualSiteContext;
  themeMode?: ThemeMode;
  openMenuPanels: ReadonlySet<string>;
  toggleMenuPanel(nodeId: string): void;
  inlineTextEdit?: InlineTextEditProps;
  nodeDrag?: CanvasNodeDragProps;
  onNodePatch?: (nodeId: string, patch: NodePatch) => void;
  rootId: string;
  documentId: string;
}

interface InheritedAnimation { spec: AnimationSpec; delay: number; sourceId: string }

export interface VisualNodePreviewProps {
  node: ComponentNode;
  breakpoint: Breakpoint;
  site?: VisualSiteContext;
  themeMode?: ThemeMode;
  effectRegistry?: EffectRegistry;
}

function ResponsiveSpacingStyle({ css }: { css: string }) {
  return css.length > 0 ? <style data-ve-responsive-spacing="" dangerouslySetInnerHTML={{ __html: css }} /> : null;
}

/** Renders a single node on its own, for live drag previews. */
export function VisualNodePreview({ node, breakpoint, site, themeMode, effectRegistry }: VisualNodePreviewProps) {
  const responsiveSpacingCss = buildResponsiveSpacingCss(node, node.id, breakpoint);
  return <><ResponsiveSpacingStyle css={responsiveSpacingCss} />{renderNode(node, {
    mode: "canvas",
    breakpoint,
    reducedMotion: true,
    openMenuPanels: new Set(),
    toggleMenuPanel: () => undefined,
    site,
    themeMode,
    effectRegistry,
    rootId: node.id,
    documentId: node.id,
  })}</>;
}

export function VisualRenderer({ document, publicContext, mode = "preview", breakpoint, selectedNodeId, onSelect, spanOverride, sizeOverride, replayTokens, motionTime, effectRegistry, onEffectDiagnostic, disclosurePreview, interactiveDisclosures, resolvedCollections, site, themeMode, inlineTextEdit, nodeDrag, onNodePatch }: VisualRendererProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [openMenuPanels, setOpenMenuPanels] = useState<ReadonlySet<string>>(() => new Set());
  const toggleMenuPanel = (nodeId: string) => setOpenMenuPanels((current) => {
    const next = new Set(current);
    if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
    return next;
  });
  const responsiveSpacingCss = useMemo(
    () => buildResponsiveSpacingCss(document.root, document.id, mode === "canvas" ? breakpoint : undefined),
    [mode, breakpoint, document.id, document.root],
  );
  return <><ResponsiveSpacingStyle css={responsiveSpacingCss} />{renderNode(document.root, { priorityImageId: publicContext ? publicContext.priorityImageId : mode === "preview" ? leadingImageId(document.root, undefined, resolvedCollections) : undefined, item: publicContext?.item, mode, breakpoint, selectedNodeId, onSelect, spanOverride, sizeOverride, replayTokens, motionTime, effectRegistry, onEffectDiagnostic, disclosurePreview, interactiveDisclosures, resolvedCollections, reducedMotion, site, themeMode, openMenuPanels, toggleMenuPanel, inlineTextEdit, nodeDrag, onNodePatch, rootId: publicContext?.rootId ?? document.root.id, documentId: document.id }, publicContext?.inherited)}</>;
}

function renderNode(node: ComponentNode, context: RendererContext, inherited?: InheritedAnimation): ReactNode {
  const scale = heightScale(node.style?.sizing?.scaleFromHeight, node.style?.sizing?.height);
  const sizedNode = scale !== null ? { ...node, style: { ...node.style, sizing: { ...node.style?.sizing, height: node.style?.sizing?.scaleFromHeight } } } : node;
  const renderedNode = context.item ? bindNode(sizedNode, context.item) : sizedNode;
  const inlineEditValue = context.mode === "canvas" && context.inlineTextEdit !== undefined ? inlineTextValue(renderedNode) : null;
  const editingInline = inlineEditValue !== null
    && context.inlineTextEdit !== undefined
    && context.inlineTextEdit.editingNodeId === node.id;
  const handleStartEdit = inlineEditValue === null || context.inlineTextEdit === undefined || context.mode !== "canvas"
    ? undefined
    : (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        context.onSelect?.(node.id);
        context.inlineTextEdit?.onStartEdit(node.id);
      };
  const rootBackgroundSuppressed = context.mode === "preview" && context.site?.pageHasBackground === true && node.id === context.rootId;
  const attachments = rootBackgroundSuppressed
    ? node.effects?.filter((attachment) => context.effectRegistry?.get(attachment.effectId)?.layer !== "background")
    : node.effects;
  const hasEffectHost = !!attachments?.length && !!context.effectRegistry && !editingInline;
  const rotation = renderedNode.style?.transform?.rotate;
  const hostRotation = hasEffectHost && typeof rotation === "number" && Number.isFinite(rotation) && Math.abs(rotation) <= 180 ? rotation : undefined;
  const semanticNode = hostRotation === undefined ? renderedNode : { ...renderedNode, style: { ...renderedNode.style, transform: undefined } } as ComponentNode;
  const semantic = renderSemanticNode(semanticNode, context);
  const effected = attachments?.length && context.effectRegistry && !editingInline ? (
    <EffectHost nodeId={node.id} nodeType={node.type} attachments={attachments} registry={context.effectRegistry} reducedMotion={context.reducedMotion} onDiagnostic={context.onEffectDiagnostic} style={hostRotation === undefined ? undefined : { rotate: `${hostRotation}deg` }}>{semantic}</EffectHost>
  ) : semantic;
  const content = animateContent(node, effected, context, editingInline ? undefined : inherited);
  const isCanvas = context.mode === "canvas";
  const selected = isCanvas && context.selectedNodeId === node.id;
  const canDrag = isCanvas && context.nodeDrag !== undefined && node.id !== context.rootId && node.type !== "slot" && !editingInline;
  const handleNodeDragStart = canDrag && context.nodeDrag !== undefined
    ? (event: DragEvent<HTMLDivElement>) => {
        event.stopPropagation();
        context.nodeDrag?.onDragStart(node.id, event);
      }
    : undefined;
  const handleSelect = (event: MouseEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); context.onSelect?.(node.id); };
  const handleSelectKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (context.interactiveDisclosures && event.target instanceof Element && event.target.closest(".ve-disclosure__trigger")) return;
    if (event.target instanceof Element && event.target.closest(".ve-tabs__tab, .ve-sidebar__item")) return;
    if (isEditableDomTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault(); event.stopPropagation(); context.onSelect?.(node.id);
  };
  return (
    <div
      className={`${nodeWrapperClassName(node)}${handleStartEdit !== undefined ? " ve-canvas-editable-text" : ""}${editingInline ? " ve-canvas-editing-text" : ""}`}
      style={scale !== null ? { zoom: scale } : undefined}
      data-node-id={isCanvas ? node.id : undefined}
      data-selected={selected ? "true" : undefined}
      aria-label={isCanvas ? `Select ${node.type} ${node.id}` : undefined}
      tabIndex={isCanvas ? 0 : undefined}
      draggable={canDrag || undefined}
      onClick={isCanvas ? handleSelect : undefined}
      onDoubleClick={handleStartEdit}
      onDragStart={handleNodeDragStart}
      onKeyDown={isCanvas ? handleSelectKey : undefined}
    >{content}</div>
  );
}

function isEditableDomTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}


function renderStructuralChildren(node: StructuralNode, context: RendererContext): ReactNode {
  const stagger = staggeredAnimation(node);
  return node.children.flatMap((child, index) => {
    if (child.type === "repeater" && context.mode === "preview") return renderRepeaterInstances(node, child, context);
    const override = context.spanOverride?.nodeId === child.id ? context.spanOverride.span : undefined;
    const inherited = stagger === undefined ? undefined : { spec: stagger, delay: stagger.delay + index * (stagger.stagger ?? 0), sourceId: node.id };
    return (
      <div
        key={child.id}
        {...structuralChildPresentation(node, child, context.breakpoint, override)}
        data-node-wrapper-id={child.id}
      >{renderNode(child, context, inherited)}</div>
    );
  });
}

function renderRepeaterInstances(parent: StructuralNode, repeater: RepeaterNode, context: RendererContext): ReactNode[] {
  const item = repeater.children.find((child): child is SlotNode => child.type === "slot" && child.name === "item");
  if (!item) return [];
  const records = boundedCollection(context.resolvedCollections?.[collectionSourceKey(repeater.source)] ?? context.resolvedCollections?.[repeater.source.schemaName], repeater.source.limit);
  return records.map((record, index) => {
    const identity = typeof record._id === "string" || typeof record._id === "number" ? String(record._id) : String(index);
    const override = context.spanOverride?.nodeId === repeater.id ? context.spanOverride.span : undefined;
    return (
      <div key={`${repeater.id}:${identity}`} className={[parent.type === "grid" ? "min-w-0" : "", repeater.style?.sizing?.height === "full" ? "h-full" : "", parent.type === "grid" ? gridPlacementClassNames(repeater, context.breakpoint, override) : ""].filter(Boolean).join(" ") || undefined} data-repeater-instance={`${repeater.id}:${identity}`} data-repeater-index={index}>
        {renderStructuralChildren(item, { ...context, item: record, priorityImageId: index === 0 ? context.priorityImageId : undefined })}
      </div>
    );
  });
}

function staggeredAnimation(node: StructuralNode): AnimationSpec | undefined {
  return isActiveAnimation(node.animation) && node.animation.stagger !== undefined ? node.animation : undefined;
}

function animateContent(node: ComponentNode, content: ReactNode, context: RendererContext, inherited?: InheritedAnimation): ReactNode {
  if (inherited !== undefined) return <AnimatedNode key={animationKey(inherited.sourceId, inherited.spec, context)} animation={inherited.spec} delay={inherited.delay} motionTime={context.motionTime}>{content}</AnimatedNode>;
  if (!isActiveAnimation(node.animation) || node.animation.stagger !== undefined) return content;
  return <AnimatedNode key={animationKey(node.id, node.animation, context)} animation={node.animation} motionTime={context.motionTime}>{content}</AnimatedNode>;
}

function animationKey(nodeId: string, spec: AnimationSpec, context: RendererContext): string {
  return `${nodeId}:${spec.preset}:${spec.trigger}:${spec.duration}:${spec.delay}:${spec.easing}:${spec.once}:${spec.stagger ?? ""}:${context.replayTokens?.[nodeId] ?? 0}`;
}

function renderSemanticNode(node: ComponentNode, context: RendererContext): ReactNode {
  const renderer = resolveComponentRenderer(node.type);
  if (!renderer) {
    const unknown = node as { id?: string; type?: string };
    return process.env.NODE_ENV === "production" ? null : <div className="border border-red-500 bg-red-50 p-2 text-sm text-red-700" role="alert">Unsupported visual node: {unknown.type ?? "unknown"} ({unknown.id ?? "unknown"})</div>;
  }
  const sizeDraft = context.sizeOverride?.nodeId === node.id ? context.sizeOverride : undefined;
  const semanticNode = context.mode === "preview" && context.site?.pageHasBackground === true && node.id === context.rootId
    ? withoutBackground(node)
    : node;
  const responsiveClass = semanticNode.responsive?.spacing === undefined
    ? ""
    : ` ${responsiveSpacingClassName(context.documentId, semanticNode.id)}`;
  const responsiveGapClass = hasResponsiveChildGap(semanticNode)
    ? responsiveChildGapClassName(context.documentId, semanticNode.id)
    : undefined;
  return renderer(semanticNode as never, {
    mode: context.mode,
    imagePriority: context.priorityImageId === node.id,
    reducedMotion: context.reducedMotion,
    breakpoint: context.breakpoint,
    className: `${nodeClassNames(semanticNode, context.breakpoint)}${responsiveClass}${responsiveGapClass ? ` ${responsiveGapClass}` : ""}`,
    responsiveChildGapClassName: responsiveGapClass,
    backgrounds: <BackgroundLayers layers={semanticNode.style?.background} />,
    disclosurePreview: context.disclosurePreview,
    interactiveDisclosures: context.interactiveDisclosures,
    interactiveExpansions: context.interactiveExpansions,
    canvasSelected: context.selectedNodeId === node.id,
    selectedNodeId: context.selectedNodeId,
    inlineEditingNodeId: context.inlineTextEdit?.editingNodeId ?? null,
    inlineEditingTarget: context.inlineTextEdit?.editingTarget ?? null,
    onInlineTextCommit: context.inlineTextEdit?.onCommit,
    onInlineTextCancel: context.inlineTextEdit?.onCancel,
    onInlineTextEditStart: context.inlineTextEdit?.onStartEdit,
    onNodePatch: context.onNodePatch,
    onSelect: context.onSelect,
    site: context.site,
    themeMode: context.themeMode,
    currentNode: semanticNode,
    isMenuPanelOpen: (nodeId) => context.openMenuPanels.has(nodeId),
    toggleMenuPanel: context.toggleMenuPanel,
    combineNodeStyles: (target, extra) => combineNodeStyles(target, target.id === node.id && sizeDraft !== undefined ? { ...sizeOverrideStyles(sizeDraft), ...extra } : extra),
    renderNode: (child, instanceKey, options) => renderNodeInstance(child, context, instanceKey, options),
    renderPreviewNode: (child, instanceKey, options) => renderNodeInstance(child, { ...context, mode: "preview", interactiveExpansions: false, selectedNodeId: undefined, onSelect: undefined, inlineTextEdit: undefined, nodeDrag: undefined, onNodePatch: undefined }, instanceKey, options),
    renderStructuralChildren: (parent) => renderStructuralChildren(parent, context),
    renderDisclosure: (disclosure, open, onOpenChange, forcedState) => renderDisclosure(disclosure, context, open, onOpenChange, forcedState),
    renderTabs: (tabs) => renderTabs(tabs, context),
  });
}

function renderNodeInstance(child: ComponentNode, context: RendererContext, instanceKey?: string, options?: RenderNodeOptions): ReactNode {
  if (instanceKey !== undefined || options?.imagePriority === false) context = { ...context, priorityImageId: undefined };
  const instance = instanceKey === undefined ? child : sliderInstance(child, instanceKey);
  const content = instance.type === "repeater" && context.mode === "preview"
    ? renderStructuralChildren({ id: `${instance.id}-slide`, type: "section", children: [instance] }, context)
    : renderNode(instance, context);
  return instanceKey === undefined ? content : <><ResponsiveSpacingStyle css={buildResponsiveSpacingCss(instance, context.documentId, context.breakpoint)} />{content}</>;
}

/** Runtime copies keep document identities intact while giving DOM controls unique IDs. */
function sliderInstance(node: ComponentNode, instanceKey: string): ComponentNode {
  const ids = new Map<string, string>();
  const collect = (child: ComponentNode) => {
    ids.set(child.id, `${child.id}--${instanceKey}`);
    if (isStructuralNode(child)) child.children.forEach(collect);
  };
  collect(node);
  const copy = (child: ComponentNode): ComponentNode => {
    const result = { ...child, id: ids.get(child.id)! };
    if (isStructuralNode(result)) result.children = result.children.map(copy);
    if (result.type === "menu-toggle") result.targetId = ids.get(result.targetId) ?? result.targetId;
    if ((result.type === "link" || result.type === "button") && result.href?.startsWith("#")) {
      const target = ids.get(result.href.slice(1));
      if (target) result.href = `#${target}`;
    }
    return result;
  };
  return copy(node);
}



function sizeOverrideStyles(override: SizeOverride): CSSProperties {
  return {
    ...(override.width !== undefined ? { width: `${override.width}px` } : {}),
    ...(override.height !== undefined ? { height: `${override.height}px` } : {}),
  };
}

function renderDisclosure(node: Extract<ComponentNode, { type: "disclosure" }>, context: RendererContext, open?: boolean, onOpenChange?: (open: boolean) => void, forcedState = context.disclosurePreview?.[node.id] ?? "default"): ReactNode {
  const trigger = node.children.find((child): child is SlotNode => child.type === "slot" && child.name === "trigger");
  const content = node.children.find((child): child is SlotNode => child.type === "slot" && child.name === "content");
  return <DisclosureRuntime node={node} forcedState={context.mode === "canvas" ? forcedState : "default"} interactive={context.mode === "preview" || context.interactiveDisclosures === true} open={open} onOpenChange={onOpenChange} trigger={trigger ? renderTriggerChildren(trigger, context) : null} content={content ? renderStructuralChildren(content, { ...context, priorityImageId: undefined }) : null} />;
}

function renderTabs(node: Extract<ComponentNode, { type: "tabs" | "sidebar" }>, context: RendererContext): ReactNode {
  const trigger = (item: Extract<ComponentNode, { type: "disclosure" }>) => item.children.find((child): child is SlotNode => child.type === "slot" && child.name === "trigger");
  const content = (item: Extract<ComponentNode, { type: "disclosure" }>) => item.children.find((child): child is SlotNode => child.type === "slot" && child.name === "content");
  if (node.type === "sidebar") return <SidebarRuntime node={node}
    inheritTextColor={node.style?.color?.text !== undefined}
    selectedNodeId={context.mode === "canvas" ? context.selectedNodeId : undefined}
    onSelectPanel={context.mode === "canvas" ? context.onSelect : undefined}
    renderLabel={item => { const slot = trigger(item); return slot ? renderTriggerChildren(slot, context, false) : null; }}
    renderPanel={item => { const slot = content(item); return slot ? renderStructuralChildren(slot, context) : null; }}
  />;
  return (
    <TabsRuntime
      node={node}
      renderLabel={(item) => {
        const slot = trigger(item);
        return slot ? renderTriggerChildren(slot, context, false) : null;
      }}
      renderPanel={(item) => {
        const slot = content(item);
        return slot ? renderStructuralChildren(slot, context) : null;
      }}
    />
  );
}

function renderTriggerChildren(slot: StructuralNode, context: RendererContext, selectableOnCanvas = true): ReactNode {
  return slot.children.map((child) => {
    const canvasProps = context.mode === "canvas" && selectableOnCanvas ? {
      "data-node-id": child.id,
      "data-selected": context.selectedNodeId === child.id ? "true" : undefined,
      onClick: (event: MouseEvent<HTMLElement>) => { event.preventDefault(); event.stopPropagation(); context.onSelect?.(child.id); },
    } : {};
    if (child.type === "heading" || child.type === "text") {
      const className = withBaseline(nodeClassNames(child, context.breakpoint), child.style?.typography, child.type === "heading" ? HEADING_BASE_CLASSES : TEXT_BASE_CLASSES);
      return <span key={child.id} className={className} style={pageTextPaintStyle(child, context.site)} {...canvasProps}>{child.text}</span>;
    }
    if (child.type === "image") return <span key={child.id} {...canvasProps}><VisualImage className={nodeClassNames(child, context.breakpoint)} src={child.src} alt={child.alt} priority={context.priorityImageId === child.id} /></span>;
    if (child.type === "divider") return <span key={child.id} className="ve-disclosure__divider" aria-hidden={context.mode === "preview" ? "true" : undefined} {...canvasProps} />;
    return <span key={child.id}>{renderNode(child, context)}</span>;
  });
}

function withBaseline(className: string, typography: StyleSpec["typography"] | undefined, baseline: string): string {
  const applied = baseline.split(" ").filter((token) => token.startsWith("tracking-") ? typography?.tracking === undefined : typography?.leading === undefined);
  return [className, ...applied].filter(Boolean).join(" ");
}
