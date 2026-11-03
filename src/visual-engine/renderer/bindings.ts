import type { ComponentNode, FieldBinding } from "../model";
import { normalizeImageUrl, normalizeLinkUrl } from "../model/urls";

const unsafeSegments = new Set(["__proto__", "prototype", "constructor"]);

export function resolveFieldBinding(record: unknown, path: readonly string[]): unknown {
  let current: unknown = record;
  for (const segment of path) {
    if (unsafeSegments.has(segment) || typeof current !== "object" || current === null || !Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function resolveBoundNodeValue(fallback: string, binding: FieldBinding | undefined, record: unknown, kind: "text" | "url"): string {
  if (!binding) return fallback;
  const value = resolveFieldBinding(record, binding.path);
  if (kind === "text" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) return String(value);
  if (kind === "url" && typeof value === "string") return value;
  return fallback;
}

export function bindNode(node: ComponentNode, record: unknown): ComponentNode {
  if (!node.bindings) return node;
  switch (node.type) {
    case "heading":
    case "text":
      return { ...node, text: resolveBoundNodeValue(node.text, node.bindings.text, record, "text") };
    case "image":
      return {
        ...node,
        src: resolveSafeBoundUrl(node.src, node.bindings.src, record, "image"),
        alt: resolveBoundNodeValue(node.alt, node.bindings.alt, record, "text"),
      };
    case "button":
      return {
        ...node,
        label: resolveBoundNodeValue(node.label, node.bindings.label, record, "text"),
        ...(node.href === undefined ? {} : { href: resolveSafeBoundUrl(node.href, node.bindings.href, record, "link") }),
        ...(node.accessibleLabel === undefined ? {} : { accessibleLabel: resolveBoundNodeValue(node.accessibleLabel, node.bindings.accessibleLabel, record, "text") }),
      };
    case "badge":
      return { ...node, text: resolveBoundNodeValue(node.text, node.bindings.text, record, "text") };
    case "link":
      return {
        ...node,
        label: resolveBoundNodeValue(node.label, node.bindings.label, record, "text"),
        href: resolveSafeBoundUrl(node.href, node.bindings.href, record, "link"),
        ...(node.accessibleLabel === undefined ? {} : { accessibleLabel: resolveBoundNodeValue(node.accessibleLabel, node.bindings.accessibleLabel, record, "text") }),
      };
    case "avatar":
      return {
        ...node,
        src: resolveSafeBoundUrl(node.src, node.bindings.src, record, "image"),
        alt: resolveBoundNodeValue(node.alt, node.bindings.alt, record, "text"),
        fallback: resolveBoundNodeValue(node.fallback, node.bindings.fallback, record, "text"),
      };
    case "icon":
      return node.decorative || node.accessibleLabel === undefined ? node : {
        ...node,
        accessibleLabel: resolveBoundNodeValue(node.accessibleLabel, node.bindings.accessibleLabel, record, "text"),
      };
    case "stat":
      return {
        ...node,
        value: resolveBoundNodeValue(node.value, node.bindings.value, record, "text"),
        label: resolveBoundNodeValue(node.label, node.bindings.label, record, "text"),
        ...(node.prefix === undefined ? {} : { prefix: resolveBoundNodeValue(node.prefix, node.bindings.prefix, record, "text") }),
        ...(node.suffix === undefined ? {} : { suffix: resolveBoundNodeValue(node.suffix, node.bindings.suffix, record, "text") }),
      };
    case "quote":
      return {
        ...node,
        quote: resolveBoundNodeValue(node.quote, node.bindings.quote, record, "text"),
        author: resolveBoundNodeValue(node.author, node.bindings.author, record, "text"),
        ...(node.role === undefined ? {} : { role: resolveBoundNodeValue(node.role, node.bindings.role, record, "text") }),
        ...(node.avatarSrc === undefined ? {} : { avatarSrc: resolveSafeBoundUrl(node.avatarSrc, node.bindings.avatarSrc, record, "image") }),
        ...(node.avatarAlt === undefined ? {} : { avatarAlt: resolveBoundNodeValue(node.avatarAlt, node.bindings.avatarAlt, record, "text") }),
      };
    default:
      return node;
  }
}

function resolveSafeBoundUrl(fallback: string, binding: FieldBinding | undefined, record: unknown, kind: "link" | "image"): string {
  const candidate = resolveBoundNodeValue(fallback, binding, record, "url");
  const normalized = kind === "link" ? normalizeLinkUrl(candidate) : normalizeImageUrl(candidate);
  return normalized.success ? normalized.value : fallback;
}
