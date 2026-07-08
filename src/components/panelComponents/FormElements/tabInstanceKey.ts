export interface TabInstanceKeyConfig {
  schemaName: string;
  label?: string;
  constantFilter?: Readonly<Record<string, unknown>>;
  instanceKey?: string;
}

const canonicalize = (value: unknown, active: WeakSet<object>): string => {
  if (value === null) return "null";
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "number:NaN";
    if (Object.is(value, -0)) return "number:-0";
    return `number:${String(value)}`;
  }
  if (typeof value === "boolean") return `boolean:${String(value)}`;
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "bigint") return `bigint:${String(value)}`;
  if (typeof value !== "object") return `${typeof value}:${String(value)}`;

  if (active.has(value)) return "circular";
  active.add(value);
  const result = Array.isArray(value)
    ? `array:[${value.map((item) => canonicalize(item, active)).join(",")}]`
    : `object:{${Object.keys(value)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${canonicalize(
              (value as Record<string, unknown>)[key],
              active,
            )}`,
        )
        .join(",")}}`;
  active.delete(value);
  return result;
};

export const canonicalizeTabKeyValue = (value: unknown): string =>
  canonicalize(value, new WeakSet<object>());

export const buildTabInstanceKey = (
  tab: TabInstanceKeyConfig,
  index: number,
): string => {
  if (typeof tab.instanceKey === "string" && tab.instanceKey.length > 0) {
    return tab.instanceKey;
  }
  return `legacy:${canonicalizeTabKeyValue({
    schemaName: tab.schemaName,
    label: tab.label,
    constantFilter: tab.constantFilter,
  })}:index:${index}`;
};
