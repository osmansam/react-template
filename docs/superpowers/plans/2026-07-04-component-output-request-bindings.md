# Component Output Request Bindings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let tenantPanel expose table interaction values as typed component outputs and bind them into other component requests, with autotable-Go persistence/validation and react-template runtime resolution.

**Architecture:** autotable-Go owns the persisted contract and validates the complete page graph. tenantPanel edits ID-based definitions while displaying readable aliases. react-template compiles bindings at page load, stores interaction values in a selector-based page runtime, resolves them to plain request parameters, and keeps existing HTTP execution endpoints unchanged for this delivery.

**Tech Stack:** Go 1.x, MongoDB/BSON models, React 18, TypeScript, TanStack Query 5, Vite 5, Vitest 2, Yarn 4.

---

## Scope Boundary

This plan implements component/page state sharing through the current scalar
table-source, pipeline, and workflow request paths. It does not implement typed
pipeline `$param` replacement, workflow `params`, project-timezone administration,
POST pipeline execution, page-filter rendering, editable page variables, system
date sources, derived date transforms, or a new timezone-aware date-range input.
Existing table date filters publish their current scalar date string, so that
value can still bind directly to a request parameter such as `after`.
Runtime/editor support in this delivery is intentionally limited to `static`
and `componentOutput` bindings over existing scalar/array filter types. Other
source values and table-published `dateRange` values remain reserved in the
persisted union and are rejected as unsupported until the follow-up plan under
`2026-06-22-page-scoped-runtime-filters-design.md`.

All three repositories currently contain unrelated user changes. Before every
commit, stage only files named by the active task. Do not reset, restore, clean,
or reformat unrelated files.

## File Map

### autotable-Go

- `models/pageModel.go`: persisted page/output/filter/binding contracts.
- `models/page_runtime_validation.go`: page graph traversal and validation.
- `models/page_runtime_validation_test.go`: focused contract validation tests.
- `models/models_test.go`: JSON/BSON round-trip coverage.
- `controllers/pageController.go`: invoke the new validator on create/update.

### react-template

- `src/types/page.ts`: shared TypeScript page contract.
- `src/pageRuntime/types.ts`: runtime-only types.
- `src/pageRuntime/pageBindingCompiler.ts`: pure definition validation and dependency compilation.
- `src/pageRuntime/pageParameterResolver.ts`: pure snapshot-to-parameter resolution.
- `src/pageRuntime/pageRuntimeStore.ts`: selector-capable external store and ownership checks.
- `src/pageRuntime/PageRuntimeProvider.tsx`: page-scoped provider and hooks.
- `src/pageRuntime/ComponentRequestBoundary.tsx`: waiting/error/request-ready boundary.
- `src/pageRuntime/*.test.ts`: Vitest unit tests.
- `src/components/DynamicPageRenderer.tsx`: provider root.
- `src/components/DynamicPageSections.tsx`: per-component request boundary and identity propagation.
- `src/components/panelComponents/FormElements/GenericPaginatedPage.tsx`: publish declared outputs.
- `src/utils/dynamicQueryKeys.ts`: resolved-parameter/source-revision query keys.
- `src/utils/dynamic.ts`: accept resolved parameters and request-enabled state.
- `src/components/charts/DynamicChart.tsx`: consume resolved parameters.
- `src/components/panelComponents/FormElements/InfoBlocks.tsx`: consume resolved parameters.
- `src/components/panelComponents/FormElements/DistributionBlocks.tsx`: consume resolved parameters.
- `package.json`, `yarn.lock`, `vitest.config.ts`: test runner.

### tenantPanel

- `src/utils/api/page.ts`: shared persisted TypeScript contract.
- `src/utils/pageBindings.ts`: ID generation, graph lookup, validation, display labels, and editor transformations.
- `src/utils/pageBindings.test.ts`: pure editor/validation tests.
- `src/components/PageDesigner/ComponentOutputsEditor.tsx`: output declarations.
- `src/components/PageDesigner/ParameterBindingsEditor.tsx`: typed source picker.
- `src/components/PageDesigner/PageDesigner.tsx`: integrate editors and save validated definitions.
- `package.json`, `yarn.lock`, `vitest.config.ts`: test runner.

### Documentation

- `docs/superpowers/specs/2026-07-04-component-output-request-bindings-design.md`: approved design.
- `docs/superpowers/plans/2026-07-04-component-output-request-bindings.md`: this plan.

## Task 1: Add autotable-Go Persisted Contracts

**Files:**
- Modify: `../autotable-Go/models/pageModel.go`
- Modify: `../autotable-Go/models/models_test.go`

- [ ] **Step 1: Write failing JSON/BSON round-trip tests**

Add a `TestPageRuntimeBindingRoundTrip` table test that builds a page containing:

```go
filterID := "tfl_created_at"
page := PageModel{
	Name: "Sales",
	Variables: []PageVariableDefinition{{
		ID: "var_branch", Key: "selectedBranch",
		Type: RuntimeValueTypeString, InitialValue: "all",
	}},
	Sections: []Section{{
		Type: SectionTypeComponent,
		Component: &ComponentBlock{
			ID: "cmp_products", StateKey: "productTable", Type: ComponentTypeTable,
			Table: &TableComponentConfig{FilterPanel: &TableFilterPanelConfig{
				Inputs: &[]ActionFormFieldConfig{{
					ID: filterID, FormKey: "createdAt", Type: "date",
				}},
			}},
			Outputs: []ComponentOutputDefinition{{
				ID: "out_created_at", Key: "createdAtFilter",
				Type: RuntimeValueTypeString,
				Source: ComponentOutputSource{
					Kind: ComponentOutputSourceTableFilter, FilterID: filterID,
				},
			}},
		},
	}, {
		Type: SectionTypeComponent,
		Component: &ComponentBlock{
			ID: "cmp_summary", StateKey: "salesSummary",
			Type: ComponentTypeInfoBlocks,
			DataBinding: &DataBinding{
				Kind: BindingKindPipeline, SchemaName: "sales",
				PipelineName: "sales_summary",
				Parameters: map[string]ParameterBinding{
					"after": {
						Source: ParameterBindingSourceComponentOutput,
						ComponentID: "cmp_products",
						OutputID: "out_created_at",
					},
				},
			},
		},
	}},
}
```

Marshal/unmarshal through both `encoding/json` and `bson`, then assert the IDs,
source kind, `after` binding, and `InitialValue` remain unchanged.

- [ ] **Step 2: Run the test and verify compilation fails**

Run:

```bash
cd ../autotable-Go
go test ./models -run TestPageRuntimeBindingRoundTrip -count=1
```

Expected: FAIL with undefined runtime contract types and fields.

- [ ] **Step 3: Add the persisted Go types**

In `models/pageModel.go`, add:

```go
type RuntimeValueType string

const (
	RuntimeValueTypeString      RuntimeValueType = "string"
	RuntimeValueTypeNumber      RuntimeValueType = "number"
	RuntimeValueTypeBoolean     RuntimeValueType = "boolean"
	RuntimeValueTypeDateRange   RuntimeValueType = "dateRange"
	RuntimeValueTypeStringArray RuntimeValueType = "stringArray"
	RuntimeValueTypeNumberArray RuntimeValueType = "numberArray"
)

type PageVariableDefinition struct {
	ID           string           `bson:"id" json:"id"`
	Key          string           `bson:"key" json:"key"`
	Type         RuntimeValueType `bson:"type" json:"type"`
	InitialValue interface{}      `bson:"initialValue,omitempty" json:"initialValue,omitempty"`
}

type ComponentOutputSource struct {
	Kind     string `bson:"kind" json:"kind"`
	FilterID string `bson:"filterId,omitempty" json:"filterId,omitempty"`
}

const (
	ComponentOutputSourceTableFilter      = "tableFilter"
	ComponentOutputSourceTableSelectedIDs = "tableSelectedIds"
	ComponentOutputSourceTableSearch      = "tableSearch"
)

type ComponentOutputDefinition struct {
	ID     string                `bson:"id" json:"id"`
	Key    string                `bson:"key" json:"key"`
	Type   RuntimeValueType      `bson:"type" json:"type"`
	Source ComponentOutputSource `bson:"source" json:"source"`
}

type ParameterBinding struct {
	Source      string                 `bson:"source" json:"source"`
	Value       interface{}            `bson:"value,omitempty" json:"value,omitempty"`
	FilterID    string                 `bson:"filterId,omitempty" json:"filterId,omitempty"`
	VariableID  string                 `bson:"variableId,omitempty" json:"variableId,omitempty"`
	ComponentID string                 `bson:"componentId,omitempty" json:"componentId,omitempty"`
	OutputID    string                 `bson:"outputId,omitempty" json:"outputId,omitempty"`
	Field       string                 `bson:"field,omitempty" json:"field,omitempty"`
	Transform   string                 `bson:"transform,omitempty" json:"transform,omitempty"`
	Input       *ParameterBinding      `bson:"input,omitempty" json:"input,omitempty"`
}
```

Define source constants for `static`, `pageFilter`, `pageVariable`,
`componentOutput`, `system`, and `derived`. Add `Parameters` to `DataBinding`,
`StateKey` and `Outputs` to `ComponentBlock`, `Variables` to `PageModel`, and
`ID string` to `ActionFormFieldConfig` in `models/containerModel.go`.

- [ ] **Step 4: Format and run the round-trip test**

Run:

```bash
cd ../autotable-Go
gofmt -w models/pageModel.go models/containerModel.go models/models_test.go
go test ./models -run TestPageRuntimeBindingRoundTrip -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit only the model contract**

```bash
cd ../autotable-Go
git add models/pageModel.go models/containerModel.go models/models_test.go
git commit -m "feat: add page runtime binding models"
```

## Task 2: Validate the autotable-Go Page Graph

**Files:**
- Create: `../autotable-Go/models/page_runtime_validation.go`
- Create: `../autotable-Go/models/page_runtime_validation_test.go`
- Modify: `../autotable-Go/controllers/pageController.go`

- [ ] **Step 1: Write failing validator tests**

Create tests for one valid graph and each invalid case:

```go
func TestValidatePageRuntimeConfigRejectsDuplicateOutputID(t *testing.T) {
	page := validRuntimePage()
	page.Sections[0].Component.Outputs = append(
		page.Sections[0].Component.Outputs,
		page.Sections[0].Component.Outputs[0],
	)
	err := ValidatePageRuntimeConfig(&page)
	if err == nil || !strings.Contains(err.Error(), "duplicate output id") {
		t.Fatalf("ValidatePageRuntimeConfig() error = %v", err)
	}
}
```

Repeat the pattern for duplicate component ID/state key, duplicate filter ID,
duplicate output key, missing component/output/filter, invalid date-range field,
scalar field accessor, unsupported binding/output source, mismatched output
type, and deletion of a referenced definition.

- [ ] **Step 2: Run tests and verify failure**

```bash
cd ../autotable-Go
go test ./models -run ValidatePageRuntimeConfig -count=1
```

Expected: FAIL because `ValidatePageRuntimeConfig` does not exist.

- [ ] **Step 3: Implement recursive component collection and validation**

Create a validator with these focused helpers:

```go
func ValidatePageRuntimeConfig(page *PageModel) error
func collectPageComponents(page *PageModel) []*ComponentBlock
func validatePageVariables(vars []PageVariableDefinition) error
func validateComponentOutputs(component *ComponentBlock, filters map[string]ActionFormFieldConfig) error
func validateParameterBinding(binding ParameterBinding, graph pageRuntimeGraph) error
func validateRuntimeValue(value interface{}, valueType RuntimeValueType) error
```

`collectPageComponents` must traverse section components, nested/flat grids,
page tabs, and component-owned tabs exactly as `ValidatePageTableConfig` does.
Build maps by immutable ID and check aliases separately. Resolve
`componentOutput` using `ComponentID + OutputID`; validate `field` using the
resolved output type. Treat interaction-state mutual dependencies as valid.
Accept `static` and `componentOutput`; return an explicit unsupported-source
validation error for `pageFilter`, `pageVariable`, `system`, and `derived` until
their runtime producers are delivered.

- [ ] **Step 4: Run focused and full model tests**

```bash
cd ../autotable-Go
gofmt -w models/page_runtime_validation.go models/page_runtime_validation_test.go
go test ./models -run 'ValidatePageRuntimeConfig|PageRuntimeBindingRoundTrip' -count=1
go test ./models -count=1
```

Expected: all PASS.

- [ ] **Step 5: Call the validator from page create/update**

Immediately after `ValidatePageTableConfig`, add to both controller paths:

```go
if validationErr := models.ValidatePageRuntimeConfig(&page); validationErr != nil {
	return utils.SendErrorResponse(c, validationErr, "Validation error. Page runtime bindings are invalid.")
}
```

Use `&updatedPage` in `UpdatePage`.

- [ ] **Step 6: Verify controller compilation and commit**

```bash
cd ../autotable-Go
gofmt -w controllers/pageController.go
go test ./controllers ./models -count=1
git add models/page_runtime_validation.go models/page_runtime_validation_test.go controllers/pageController.go
git commit -m "feat: validate page runtime binding graphs"
```

Expected: tests PASS and only listed files are committed.

## Task 3: Add react-template Contracts and Vitest

**Files:**
- Modify: `package.json`
- Modify: `yarn.lock`
- Create: `vitest.config.ts`
- Modify: `src/types/page.ts`
- Create: `src/pageRuntime/types.test.ts`

- [ ] **Step 1: Install and configure Vitest**

Run:

```bash
yarn add -D vitest@^2.1.9
```

Add `"test": "vitest run"` to scripts and create:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write a failing contract fixture test**

Create `src/pageRuntime/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ComponentBlock, ParameterBinding } from "../types/page";

describe("page runtime contracts", () => {
  it("accepts ID-based component output bindings", () => {
    const binding: ParameterBinding = {
      source: "componentOutput",
      componentId: "cmp_products",
      outputId: "out_created_at",
    };
    const component: ComponentBlock = {
      id: "cmp_products",
      stateKey: "productTable",
      type: "table",
      outputs: [{
        id: "out_created_at",
        key: "createdAtFilter",
        type: "string",
        source: { kind: "tableFilter", filterId: "tfl_created_at" },
      }],
    };
    expect(binding.outputId).toBe(component.outputs?.[0].id);
  });
});
```

- [ ] **Step 3: Run and verify TypeScript failure**

```bash
yarn test src/pageRuntime/types.test.ts
```

Expected: FAIL because the imported contract fields/types do not exist.

- [ ] **Step 4: Add the TypeScript persisted types**

Mirror the approved union in `src/types/page.ts`: `RuntimeValueType`,
`PageVariableDefinition`, `ComponentOutputSource`,
`ComponentOutputDefinition`, and `ParameterBinding`. Add:

```ts
export interface DataBinding {
  // existing source fields
  params?: Record<string, unknown>;
  parameters?: Record<string, ParameterBinding>;
}

export interface ComponentBlock {
  id: string;
  stateKey?: string;
  outputs?: ComponentOutputDefinition[];
  // existing fields
}

export interface PageModel {
  variables?: PageVariableDefinition[];
  // existing fields
}
```

Add `id?: string` to `TableActionFormFieldConfig` so legacy filters remain
loadable.

- [ ] **Step 5: Run tests/build and commit**

```bash
yarn test src/pageRuntime/types.test.ts
yarn build
git add package.json yarn.lock vitest.config.ts src/types/page.ts src/pageRuntime/types.test.ts
git commit -m "feat: add page runtime TypeScript contracts"
```

Expected: PASS.

## Task 4: Compile and Resolve react-template Bindings

**Files:**
- Create: `src/pageRuntime/types.ts`
- Create: `src/pageRuntime/pageBindingCompiler.ts`
- Create: `src/pageRuntime/pageBindingCompiler.test.ts`
- Create: `src/pageRuntime/pageParameterResolver.ts`
- Create: `src/pageRuntime/pageParameterResolver.test.ts`

- [ ] **Step 1: Write failing compiler tests**

Cover immutable ID lookup, output-key rename independence, invalid references,
date-range field validation, scalar field rejection, and legacy precedence:

```ts
it("compiles an output binding by immutable IDs", () => {
  const result = compileComponentParameters(page, "cmp_summary");
  expect(result.errors).toEqual([]);
  expect(result.dependencies).toEqual([
    { kind: "componentOutput", componentId: "cmp_products", outputId: "out_date" },
  ]);
  expect(result.resolvers.after).toMatchObject({ field: "start" });
});
```

- [ ] **Step 2: Run compiler tests and verify failure**

```bash
yarn test src/pageRuntime/pageBindingCompiler.test.ts
```

Expected: FAIL because the compiler is missing.

- [ ] **Step 3: Implement pure compilation**

Define:

```ts
export type RuntimeValue<T = unknown> =
  | { status: "unavailable" }
  | { status: "available"; value: T };

export interface RuntimeSnapshot {
  pageFilters: Record<string, RuntimeValue>;
  pageVariables: Record<string, RuntimeValue>;
  components: Record<string, { outputs: Record<string, RuntimeValue> }>;
}

export function compileComponentParameters(
  page: PageModel,
  componentId: string,
): CompiledComponentParameters;
```

Normalize each legacy `params` entry to `{source: "static", value}` first, then
overlay `parameters`. Resolve all component/output IDs during compilation and
store the referenced type and allowed field set in each resolver. Return
structured errors instead of throwing. Return `unsupported_source` for
`pageFilter`, `pageVariable`, `system`, or `derived` rather than partially
evaluating them.

- [ ] **Step 4: Run compiler tests**

```bash
yarn test src/pageRuntime/pageBindingCompiler.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing resolver tests**

Test ready, waiting, available `null`, mismatch, date-range extraction, static
values, and canonicalization:

```ts
it("waits for an unavailable required output", () => {
  const result = resolveComponentParameters(compiled, snapshotWithUnavailableOutput);
  expect(result.status).toBe("waiting");
  expect(result.values).toEqual({});
});
```

- [ ] **Step 6: Implement resolution and canonicalization**

Export:

```ts
export function resolveComponentParameters(
  compiled: CompiledComponentParameters,
  snapshot: RuntimeSnapshot,
): ParameterResolutionResult;

export function canonicalizeRuntimeValue(value: unknown): string;
```

Use `unavailable` as waiting, preserve available `null`, extract only validated
fields, and recursively sort object keys while preserving array order.

- [ ] **Step 7: Run runtime unit tests and commit**

```bash
yarn test src/pageRuntime
git add src/pageRuntime/types.ts src/pageRuntime/pageBindingCompiler.ts \
  src/pageRuntime/pageBindingCompiler.test.ts \
  src/pageRuntime/pageParameterResolver.ts \
  src/pageRuntime/pageParameterResolver.test.ts
git commit -m "feat: compile and resolve page request bindings"
```

Expected: PASS.

## Task 5: Build the Page Runtime Store and Provider

**Files:**
- Create: `src/pageRuntime/pageRuntimeStore.ts`
- Create: `src/pageRuntime/pageRuntimeStore.test.ts`
- Create: `src/pageRuntime/PageRuntimeProvider.tsx`
- Modify: `src/components/DynamicPageRenderer.tsx`

- [ ] **Step 1: Write failing store tests**

Test initialization, selector isolation, publication ownership, undeclared
outputs, value-type checking, and unavailable reset:

```ts
it("rejects publication by a non-owner component", () => {
  const store = createPageRuntimeStore(page);
  expect(() =>
    store.publishOutput("cmp_other", "cmp_products", "out_date", dateRange),
  ).toThrow("cannot publish output owned by cmp_products");
});
```

- [ ] **Step 2: Implement the external store**

Expose:

```ts
export interface PageRuntimeStore {
  getSnapshot(): RuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  publishOutput(
    publisherComponentId: string,
    ownerComponentId: string,
    outputId: string,
    value: unknown,
  ): void;
  markOutputUnavailable(
    publisherComponentId: string,
    ownerComponentId: string,
    outputId: string,
  ): void;
}
```

Clone only the affected component/output branch on publication. Validate owner,
definition, source/component compatibility, and runtime value type before
notifying subscribers.

- [ ] **Step 3: Run store tests**

```bash
yarn test src/pageRuntime/pageRuntimeStore.test.ts
```

Expected: PASS.

- [ ] **Step 4: Add provider and selector hooks**

Create a context holding the stable store instance and export:

```ts
export function usePageRuntimeStore(): PageRuntimeStore;
export function usePageRuntimeSelector<T>(
  selector: (snapshot: RuntimeSnapshot) => T,
): T;
export function useResolvedComponentParameters(
  componentId: string,
): ParameterResolutionResult;
```

Implement selectors with `useSyncExternalStore`. Compile each component once
from the loaded page model.

- [ ] **Step 5: Wrap DynamicPageRenderer**

Change its props from only `sections` to accept optional `page?: PageModel`.
For compatibility, construct `{name: "", sections}` when only sections are
provided. Wrap the rendered sections in:

```tsx
<PageRuntimeProvider page={runtimePage}>
  <Header />
  <div className={`dynamic-page-renderer ${className}`}>{content}</div>
</PageRuntimeProvider>
```

- [ ] **Step 6: Build and commit**

```bash
yarn test src/pageRuntime
yarn build
git add src/pageRuntime/pageRuntimeStore.ts src/pageRuntime/pageRuntimeStore.test.ts \
  src/pageRuntime/PageRuntimeProvider.tsx src/components/DynamicPageRenderer.tsx
git commit -m "feat: add selector-based page runtime store"
```

Expected: PASS.

## Task 6: Publish Explicit Table Outputs

**Files:**
- Modify: `src/components/DynamicPageSections.tsx`
- Modify: `src/components/panelComponents/FormElements/GenericPaginatedPage.tsx`
- Create: `src/pageRuntime/tableOutputAdapter.ts`
- Create: `src/pageRuntime/tableOutputAdapter.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Test `tableFilter`, `tableSearch`, and `tableSelectedIds`, including a missing
filter value:

```ts
expect(
  resolveTableOutput(outputDefinition, {
    filters: { createdAt: "2026-07-01" },
    search: "  widget ",
    selectedIds: ["a", "b"],
  }),
).toEqual({
  status: "available",
  value: "2026-07-01",
});
```

- [ ] **Step 2: Implement the pure adapter**

Resolve filters by immutable `filterId`, not `formKey`. Return unavailable for a
missing filter value or selection not yet initialized. Return trimmed search
text. Map existing `date` inputs to a `string` output; do not synthesize a
`dateRange` without the timezone-aware date-range producer.

- [ ] **Step 3: Pass identity/output definitions into tables**

From `RenderComponent`, pass:

```tsx
componentId={component.id}
outputs={component.outputs}
```

Add both optional props to `GenericPaginatedPage` for legacy callers.

- [ ] **Step 4: Publish filter/search/selection values**

Use the runtime store inside `GenericPaginatedPage`. Derive selected IDs from
`selectedRows`, use the debounced search value already used for requests, and
publish each declared output in an effect. Mark removed values unavailable. Do
not publish undeclared filters.

- [ ] **Step 5: Verify and commit**

```bash
yarn test src/pageRuntime/tableOutputAdapter.test.ts
yarn build
git add src/pageRuntime/tableOutputAdapter.ts src/pageRuntime/tableOutputAdapter.test.ts \
  src/components/DynamicPageSections.tsx \
  src/components/panelComponents/FormElements/GenericPaginatedPage.tsx
git commit -m "feat: publish declared table interaction outputs"
```

Expected: PASS.

## Task 7: Resolve Parameters Across Component Requests

**Files:**
- Create: `src/pageRuntime/ComponentRequestBoundary.tsx`
- Modify: `src/components/DynamicPageSections.tsx`
- Modify: `src/utils/dynamicQueryKeys.ts`
- Create: `src/utils/dynamicQueryKeys.test.ts`
- Modify: `src/utils/dynamic.ts`
- Modify: `src/components/charts/DynamicChart.tsx`
- Modify: `src/components/panelComponents/FormElements/InfoBlocks.tsx`
- Modify: `src/components/panelComponents/FormElements/DistributionBlocks.tsx`

- [ ] **Step 1: Write failing query-key tests**

Assert resolved values and source revision change keys, while binding aliases do
not:

```ts
expect(
  getTableSourceQueryKey(1, 20, binding, {}, { after: "2026-07-01" }, "rev-2"),
).not.toEqual(
  getTableSourceQueryKey(1, 20, binding, {}, { after: "2026-07-01" }, "rev-1"),
);
```

- [ ] **Step 2: Update query-key helpers**

Add `sourceRevision = ""` as the final optional argument and include it before
the canonical request object. Use `canonicalizeRuntimeValue(resolvedParams)` so
object insertion order cannot create separate entries.

- [ ] **Step 3: Add the request boundary**

`ComponentRequestBoundary` calls `useResolvedComponentParameters(component.id)`.
For `waiting`, render the existing neutral `LoadingPanel`; for `error`, render
`NoticePanel tone="error"` with parameter names but no values; for `ready`, call
its child render function:

```tsx
<ComponentRequestBoundary component={component}>
  {({ values, sourceRevision }) => renderReadyComponent(values, sourceRevision)}
</ComponentRequestBoundary>
```

Compute `sourceRevision` from the loaded container's `updatedAt`; fall back to a
canonical hash of the data-binding source definition.

- [ ] **Step 4: Thread resolved values through every request consumer**

Pass `resolvedParams` and `sourceRevision` to tables, charts, `InfoBlocks`, and
`DistributionBlocks`. Merge values as:

```ts
const requestParams = {
  ...(dataBinding?.params ?? {}),
  ...(resolvedParams ?? {}),
};
```

New structured values win. Add an `enabled` argument to request hooks so waiting
or error states never issue HTTP calls. Keep chart presentation options separate
from pipeline request parameters.

- [ ] **Step 5: Verify WebSocket invalidation behavior**

Keep invalidation keyed by schema/source, but do not reconstruct parameters in
`useWebSocket`; invalidation must refetch the observer's current query function,
which already closes over the latest resolved values.

- [ ] **Step 6: Run tests/build and commit**

```bash
yarn test src/pageRuntime src/utils/dynamicQueryKeys.test.ts
yarn build
git add src/pageRuntime/ComponentRequestBoundary.tsx \
  src/components/DynamicPageSections.tsx src/utils/dynamicQueryKeys.ts \
  src/utils/dynamicQueryKeys.test.ts src/utils/dynamic.ts \
  src/components/charts/DynamicChart.tsx \
  src/components/panelComponents/FormElements/InfoBlocks.tsx \
  src/components/panelComponents/FormElements/DistributionBlocks.tsx
git commit -m "feat: resolve page state into component requests"
```

Expected: PASS.

## Task 8: Add tenantPanel Contracts, IDs, and Pure Validation

**Files:**
- Modify: `../tenantPanel/package.json`
- Modify: `../tenantPanel/yarn.lock`
- Create: `../tenantPanel/vitest.config.ts`
- Modify: `../tenantPanel/src/utils/api/page.ts`
- Create: `../tenantPanel/src/utils/pageBindings.ts`
- Create: `../tenantPanel/src/utils/pageBindings.test.ts`

- [ ] **Step 1: Install/configure Vitest in tenantPanel**

```bash
cd ../tenantPanel
yarn add -D vitest@^2.1.9
```

Add `"test": "vitest run"` and the same node-only Vitest configuration used in
react-template.

- [ ] **Step 2: Mirror persisted contract types**

Add the exact `RuntimeValueType`, variable, output, source, and parameter-binding
types from react-template to `src/utils/api/page.ts`. Add `stateKey`, `outputs`,
`variables`, and optional filter `id` fields.

- [ ] **Step 3: Write failing helper tests**

Cover:

```ts
it("renames an output key without rewriting outputId bindings", () => {
  const updated = renameOutput(page, "cmp_products", "out_date", "salesPeriod");
  expect(findBinding(updated, "cmp_summary", "after")).toMatchObject({
    componentId: "cmp_products",
    outputId: "out_date",
  });
  expect(formatBindingLabel(updated, findBinding(updated, "cmp_summary", "after")))
    .toBe("productTable.salesPeriod.start");
});
```

Also test unique ID prefixes (`cmp_`, `tfl_`, `out_`, `var_`), exposing a filter,
duplicate aliases/keys, invalid field/type choices, deletion blocking, and
same-save removal of dependents.

- [ ] **Step 4: Implement pure editor helpers**

Export:

```ts
export function createRuntimeId(prefix: "cmp" | "tfl" | "out" | "var"): string;
export function ensurePageRuntimeIds(page: PageModel): PageModel;
export function exposeTableFilter(
  page: PageModel,
  componentId: string,
  filterId: string,
  key: string,
): PageModel;
export function validatePageBindings(page: PageModel): PageBindingIssue[];
export function formatBindingLabel(page: PageModel, binding: ParameterBinding): string;
export function dependentBindings(page: PageModel, target: BindingTarget): BindingLocation[];
```

Use `crypto.randomUUID()` with hyphens removed and the requested prefix. Clone
only changed page branches; never mutate React state objects.

- [ ] **Step 5: Run tests/build and commit**

```bash
cd ../tenantPanel
yarn test src/utils/pageBindings.test.ts
yarn build
git add package.json yarn.lock vitest.config.ts src/utils/api/page.ts \
  src/utils/pageBindings.ts src/utils/pageBindings.test.ts
git commit -m "feat: add page binding editor contracts"
```

Expected: PASS.

## Task 9: Add tenantPanel Output and Binding Editors

**Files:**
- Create: `../tenantPanel/src/components/PageDesigner/ComponentOutputsEditor.tsx`
- Create: `../tenantPanel/src/components/PageDesigner/ParameterBindingsEditor.tsx`
- Modify: `../tenantPanel/src/components/PageDesigner/PageDesigner.tsx`

- [ ] **Step 1: Build the component output editor**

Accept `page`, `component`, and `onChange`. For tables, list immutable-ID filters
and render **Expose as component output**. Persist:

```ts
{
  id: createRuntimeId("out"),
  key: uniqueOutputKey(component, `${filter.formKey}Filter`),
  type: outputTypeForFilter(filter),
  source: { kind: "tableFilter", filterId: filter.id! },
}
```

Also offer `tableSearch` and `tableSelectedIds`. Display output IDs read-only,
allow key rename, and block deletion when `dependentBindings` is non-empty.

- [ ] **Step 2: Build the parameter binding editor**

Replace the key/value-only editor for new bindings with rows containing:

- request parameter name;
- source selector: Static or Component output;
- source definition selector;
- type-valid field selector;
- readable preview.

Persist IDs, never display aliases in saved data. Keep the existing raw legacy
`params` JSON editor in an explicitly labeled compatibility section.
Do not show reserved page-filter, page-variable, system, or derived sources until
their runtime producers are implemented.

- [ ] **Step 3: Integrate with PageDesigner state**

When loading/editing a page, call `ensurePageRuntimeIds` once. When opening a
component, generate a unique default `stateKey` from title/type without changing
an existing key. Replace direct `paramsMap` saves for structured rows with
`dataBinding.parameters`.

Before create/update:

```ts
const issues = validatePageBindings(pageToSave);
if (issues.length > 0) {
  setValidationErrors(issues);
  return;
}
```

Render issues beside the affected component/parameter. Do not modify the
unrelated page-icon work currently present in the worktree.

- [ ] **Step 4: Build and manually verify designer behavior**

```bash
cd ../tenantPanel
yarn test src/utils/pageBindings.test.ts
yarn build
```

Manual check:

1. Add a scalar table `createdAt` date filter.
2. Expose it as `createdAtFilter`.
3. Bind another component's `after` directly to that string output.
4. Rename the table state key and output key.
5. Confirm the preview changes while persisted IDs do not.
6. Confirm referenced output/filter deletion is blocked.

- [ ] **Step 5: Commit only binding UI files**

```bash
cd ../tenantPanel
git add src/components/PageDesigner/ComponentOutputsEditor.tsx \
  src/components/PageDesigner/ParameterBindingsEditor.tsx \
  src/components/PageDesigner/PageDesigner.tsx
git commit -m "feat: edit component output request bindings"
```

## Task 10: Cross-Project Compatibility and End-to-End Verification

**Files:**
- Modify only files required by failures discovered in this task.

- [ ] **Step 1: Verify autotable-Go**

```bash
cd ../autotable-Go
go test ./models ./controllers ./services ./utils -count=1
go test ./... -count=1
```

Expected: PASS. If unrelated pre-existing failures remain, record the exact test
and confirm the focused new suites pass before changing unrelated code.

- [ ] **Step 2: Verify react-template**

```bash
cd ../react-template
yarn test
yarn lint
yarn build
```

Expected: PASS.

- [ ] **Step 3: Verify tenantPanel**

```bash
cd ../tenantPanel
yarn test
yarn lint
yarn build
```

Expected: PASS.

- [ ] **Step 4: Run the browser acceptance scenario**

Start the existing services, create a page with:

- `productTable` exposing `createdAtFilter`;
- another table consuming the scalar value as `after`;
- an information block consuming the same values.

Verify no dependent requests fire before the filter has a value, one filter
change refetches all three consumers exactly once, aliases can be renamed, and
a page reload preserves behavior.

- [ ] **Step 5: Inspect staged scope and commit integration fixes**

In each repository:

```bash
git status --short
git diff --check
```

Stage only integration fixes from this task and commit separately:

```bash
git commit -m "test: verify component output request bindings"
```

Do not commit unrelated pre-existing modifications.

## Follow-Up Plan

After this vertical slice is merged, write a separate implementation plan for:

- page-filter definitions, rendering, promotion, and URL initialization;
- editable typed page variables;
- system and derived date bindings;
- timezone-aware date-range input publication and start/end field bindings;
- typed `RequestParameterDefinition` shared by pipelines/workflows;
- POST pipeline/table-source execution;
- recursive BSON `$param` replacement;
- workflow `params` and `{{params.*}}`;
- project IANA timezone and system/derived date evaluation;
- canonical backend cache keys.

That follow-up can consume the same resolved frontend parameters without
changing the component-output contract delivered here.
