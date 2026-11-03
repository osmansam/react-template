import type { AutoTableCollectionSource } from "../model";

export type ResolvedCollectionRecord = Record<string, unknown>;
export type ResolvedCollectionMap = Record<string, readonly ResolvedCollectionRecord[]>;

export function collectionSourceKey(source: AutoTableCollectionSource): string {
  return JSON.stringify({
    schemaName: source.schemaName,
    filters: source.filters ?? [],
    sort: source.sort ?? [],
    limit: source.limit,
  });
}

export function boundedCollection(records: readonly ResolvedCollectionRecord[] | undefined, limit: number): readonly ResolvedCollectionRecord[] {
  return (records ?? []).slice(0, Math.min(Math.max(limit, 0), 100));
}
