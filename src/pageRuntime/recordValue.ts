/** Bounded JSON snapshot of a table row; never execute accessors or retain mutable input. */
export function isRuntimeRecord(value: unknown): value is Record<string, unknown> {
 let count = 0, size = 0;
 const seen = new Set<object>();
 const visit = (item: unknown, depth: number): boolean => {
  if (++count > 5000 || depth > 16) return false;
  if (item === null || typeof item === "boolean") return true;
  if (typeof item === "number") return Number.isFinite(item);
  if (typeof item === "string") { size += item.length; return size <= 262144; }
  if (!item || typeof item !== "object" || seen.has(item)) return false;
  if (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item))) return false;
  seen.add(item);
  const descriptors = Object.getOwnPropertyDescriptors(item);
  for (const [key, descriptor] of Object.entries(descriptors)) {
   if (Array.isArray(item) && key === "length") continue;
   size += key.length;
   if (size > 262144 || ["__proto__", "prototype", "constructor"].includes(key) || !("value" in descriptor) || !visit(descriptor.value, depth + 1)) return false;
  }
  seen.delete(item); return true;
 };
 return !!value && typeof value === "object" && !Array.isArray(value) && visit(value, 0);
}
export function immutableRecord(value: Record<string, unknown>): Readonly<Record<string, unknown>> {
 const freeze = (item: unknown): void => {
  if (!item || typeof item !== "object") return;
  Object.values(item).forEach(freeze); Object.freeze(item);
 };
 const copy = structuredClone(value); freeze(copy); return copy;
}
