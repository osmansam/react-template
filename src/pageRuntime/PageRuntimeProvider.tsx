/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { PageModel } from "../types/page";
import { compileComponentParameters } from "./pageBindingCompiler";
import { resolveComponentParameters } from "./pageParameterResolver";
import {
  createPageRuntimeStore,
  type PageRuntimeStore,
} from "./pageRuntimeStore";
import type {
  CompiledComponentParameters,
  ParameterResolutionResult,
  RuntimeSnapshot,
} from "./types";

interface PageRuntimeContextValue {
  page: PageModel;
  store: PageRuntimeStore;
  compiledByComponent: Map<string, CompiledComponentParameters>;
}

const PageRuntimeContext = createContext<PageRuntimeContextValue | null>(null);

export const PageRuntimeProvider: React.FC<
  React.PropsWithChildren<{ page: PageModel }>
> = ({ page, children }) => {
  const value = useMemo(
    () => ({
      page,
      store: createPageRuntimeStore(page),
      compiledByComponent: new Map<string, CompiledComponentParameters>(),
    }),
    [page],
  );
  return (
    <PageRuntimeContext.Provider value={value}>
      {children}
    </PageRuntimeContext.Provider>
  );
};

const useRuntimeContext = (): PageRuntimeContextValue => {
  const value = useContext(PageRuntimeContext);
  if (!value) {
    throw new Error("Page runtime hooks must be used within PageRuntimeProvider.");
  }
  return value;
};

export const usePageRuntimeStore = (): PageRuntimeStore =>
  useRuntimeContext().store;

export function usePageRuntimeSelector<T>(
  selector: (snapshot: RuntimeSnapshot) => T,
): T {
  const store = usePageRuntimeStore();
  const committed = useRef<{
    hasValue: boolean;
    value: T | undefined;
  }>({ hasValue: false, value: undefined });
  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: RuntimeSnapshot;
    let memoizedSelection: T;

    const memoizedSelector = (nextSnapshot: RuntimeSnapshot): T => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);
        if (
          committed.current.hasValue &&
          Object.is(committed.current.value, nextSelection)
        ) {
          memoizedSelection = committed.current.value as T;
          return memoizedSelection;
        }
        memoizedSelection = nextSelection;
        return nextSelection;
      }

      if (Object.is(memoizedSnapshot, nextSnapshot)) {
        return memoizedSelection;
      }
      const nextSelection = selector(nextSnapshot);
      if (Object.is(memoizedSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return memoizedSelection;
      }
      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };

    return [
      () => memoizedSelector(store.getSnapshot()),
      () => memoizedSelector(store.getSnapshot()),
    ] as const;
  }, [store, selector]);
  const selected = useSyncExternalStore(
    store.subscribe,
    getSelection,
    getServerSelection,
  );
  useEffect(() => {
    committed.current.hasValue = true;
    committed.current.value = selected;
  }, [selected]);
  return selected;
}

export function useResolvedComponentParameters(
  componentId: string,
): ParameterResolutionResult {
  const context = useRuntimeContext();
  const { page } = context;
  const compiled = useMemo(
    () => {
      const cached = context.compiledByComponent.get(componentId);
      if (cached) return cached;
      const result = compileComponentParameters(page, componentId);
      context.compiledByComponent.set(componentId, result);
      return result;
    },
    [context, page, componentId],
  );
  const selectDependencySnapshot = useMemo(() => {
    let previous: RuntimeSnapshot | undefined;
    return (current: RuntimeSnapshot): RuntimeSnapshot => {
      if (
        previous &&
        compiled.dependencies.every((dependency) => {
          if (dependency.kind === "pageFilter") {
            return (
              previous?.pageFilters[dependency.filterId] ===
              current.pageFilters[dependency.filterId]
            );
          }
          const before = previous?.components[dependency.componentId]?.outputs[
            dependency.outputId
          ];
          const after = current.components[dependency.componentId]?.outputs[
            dependency.outputId
          ];
          return before === after;
        })
      ) {
        return previous;
      }
      previous = current;
      return current;
    };
  }, [compiled]);
  const snapshot = usePageRuntimeSelector(selectDependencySnapshot);
  return useMemo(
    () => resolveComponentParameters(compiled, snapshot),
    [compiled, snapshot],
  );
}
