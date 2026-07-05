# Component Outputs and Page Request Bindings

## Objective

Allow a filter or other interaction value owned by one page component to supply
request parameters to another table, chart, information block, distribution
block, pipeline, or workflow. Preserve component encapsulation, prevent request
cycles, and keep existing static `DataBinding.params` pages operational.

This design extends the page runtime described in
`2026-06-22-page-scoped-runtime-filters-design.md`. Where the earlier design
suggests arbitrary component-state paths, this document supersedes it with
declared, typed component outputs.

## Design Principles

- Page-owned filters remain the preferred source for values that conceptually
  control several components.
- Component-owned interaction state may be shared only through declared public
  outputs.
- Persisted bindings reference immutable IDs. Human-readable keys are display
  aliases only.
- Bindings are structured data, not expressions that must be evaluated.
- Request parameters read runtime state; request results do not write runtime
  state in the first version.
- Runtime values never mutate the persisted page definition.

## Component Identity

Every page component has two identifiers:

```ts
interface PageComponentIdentity {
  id: string;
  stateKey: string;
}
```

- `id` is an immutable generated identifier such as `cmp_01JXYZ`.
- `stateKey` is a unique, readable alias such as `productTable`.
- Persisted bindings store `id`.
- tenantPanel resolves the current `stateKey` when displaying a binding.
- Renaming `stateKey` changes display text without rewriting consumers.

tenantPanel and autotable-Go reject duplicate component IDs or duplicate
`stateKey` values within a page.

## Stable Filter Identity

Table and page filters receive immutable generated IDs. A table filter separates
identity from its target field and label:

```json
{
  "id": "tfl_01JABC",
  "field": "createdAt",
  "label": "Created At"
}
```

Editing `field` or `label` does not change the filter ID. Page Designer does not
reuse deleted IDs.

## Declared Component Outputs

Components expose only explicitly persisted outputs:

```ts
type ComponentOutputType =
  | "string"
  | "number"
  | "boolean"
  | "dateRange"
  | "stringArray"
  | "numberArray";

interface ComponentOutputDefinition {
  key: string;
  type: ComponentOutputType;
  source: ComponentOutputSource;
}

type ComponentOutputSource =
  | {
      kind: "tableFilter";
      filterId: string;
    }
  | {
      kind: "tableSelectedIds";
    }
  | {
      kind: "tableSearch";
    };
```

Output keys are unique within a component. A table filter may be exposed through
a tenantPanel action such as **Expose as component output**. The action creates
an explicit output definition rather than relying on an implicit naming rule:

```json
{
  "key": "createdAtFilter",
  "type": "dateRange",
  "source": {
    "kind": "tableFilter",
    "filterId": "tfl_01JABC"
  }
}
```

The first version excludes API responses, pipeline results, workflow outputs,
computed aggregates, selected record objects, and unrestricted object paths.
Those values require a future schema-aware reactive dependency model. Selected
IDs are supported because their element type is explicit and their values are
interaction-owned.

## Parameter Binding Contract

Data bindings use one parameter-source map:

```ts
type ParameterBinding =
  | {
      source: "static";
      value: unknown;
    }
  | {
      source: "pageFilter";
      filterId: string;
      field?: "value" | "start" | "end" | "preset" | "timezone";
    }
  | {
      source: "pageVariable";
      variableId: string;
    }
  | {
      source: "componentOutput";
      componentId: string;
      output: string;
      field?: "start" | "end" | "preset" | "timezone";
    }
  | {
      source: "system";
      value: "today" | "thisWeek" | "thisMonth" | "thisYear" | "now";
      field?: "start" | "end";
    }
  | {
      source: "derived";
      input: ParameterBinding;
      transform: "previousCalendarPeriod" | "previousEqualDuration";
      field?: "start" | "end";
    };

interface DataBinding {
  parameters?: Record<string, ParameterBinding>;
  params?: Record<string, unknown>;
}
```

For a component output, tenantPanel displays a readable expression:

```text
after <- productTable.createdAtFilter.start
```

The persisted value is structured and ID-based:

```json
{
  "source": "componentOutput",
  "componentId": "cmp_01JXYZ",
  "output": "createdAtFilter",
  "field": "start"
}
```

No persisted binding may contain an arbitrary component-state path.

### Field Validation

The resolver validates `field` against the referenced definition:

- `dateRange` permits `start`, `end`, `preset`, or `timezone`.
- Scalar and array outputs require `field` to be omitted.
- Page-filter fields follow the page filter's declared value type.
- Derived transforms accept only compatible date-range inputs.

Validation uses the referenced model definitions, not TypeScript types alone.

## Page-Owned State Versus Component Outputs

A value belongs to a page filter or page variable when it represents shared page
intent, such as:

- reporting period;
- selected branch;
- selected salesperson;
- selected customer.

A value belongs to a component output when it is naturally produced by
interaction with that component, such as:

- a table-local filter;
- selected table IDs;
- table search text;
- a future selected chart category or active tab.

tenantPanel supports promoting a table filter to a page filter. Promotion
replaces the table-local source with a page-filter binding so that one canonical
value controls every consumer.

## Runtime Store

`DynamicPageRenderer` creates one page runtime store:

```ts
interface PageRuntimeState {
  pageFilters: Record<string, RuntimeValue>;
  pageVariables: Record<string, RuntimeValue>;
  components: Record<
    string,
    {
      outputs: Record<string, RuntimeValue>;
    }
  >;
}

type RuntimeValue =
  | { status: "unavailable" }
  | { status: "available"; value: unknown };
```

Definitions remain on the page model. Current values live only in the runtime
store. Component adapters publish declared values:

```ts
runtime.publishOutput(componentId, outputKey, normalizedValue);
```

Consumers subscribe through selector hooks:

```ts
runtime.selectComponentOutput(componentId, outputKey);
```

The store uses selector-based subscriptions so changing one output does not
rerender all page components.

## Request Resolution

Bindings are compiled when a page loads. Compilation resolves references,
validates types, and records dependencies. At request time, the resolver reads a
runtime snapshot and returns:

```ts
interface ParameterResolutionResult {
  values: Record<string, unknown>;
  dependencies: RuntimeDependency[];
  status: "ready" | "waiting" | "error";
  errors: ParameterResolutionError[];
}
```

Runtime behavior distinguishes:

- `unavailable`: the interaction has not produced a value; skip the request and
  render a waiting state when the target parameter is required;
- available `null`: pass `null` when the parameter definition permits it;
- invalid component, filter, output, or variable reference: configuration error;
- incompatible output/parameter types: configuration error.

Missing required values never become empty strings.

Text and search outputs are debounced. Select, boolean, and completed date-range
changes publish immediately. Incomplete date ranges remain unavailable.

## Query Keys and Refetching

React Query keys contain canonical resolved values, not binding definitions:

```ts
[
  "component-request",
  componentId,
  sourceId,
  canonicalize(resolvedParameters)
]
```

Canonicalization recursively sorts object keys, preserves array order, converts
instants to UTC ISO strings, retains `null`, and omits `undefined`.

Only components whose resolved values change receive a new query key. WebSocket
invalidation reruns affected requests using the latest resolved parameters.

## Dependency and Cycle Rules

The first version uses a deliberately one-way graph:

```text
user interaction
  -> page filter, page variable, or declared component output
  -> resolved request parameters
  -> request
```

Request results cannot publish outputs or update filters automatically.
Therefore, two tables may safely consume one another's interaction-owned filter
outputs; neither request result feeds the source value.

Page compilation and backend page-save validation still construct the declared
dependency graph and reject:

- self-dependencies whose output is request-derived;
- missing sources or consumers;
- future derived-output cycles.

Request-derived component outputs are outside this delivery.

## react-template Responsibilities

- Wrap dynamic pages in `PageRuntimeProvider`.
- Build the selector-based runtime store.
- Compile and resolve parameter bindings.
- Add immutable filter IDs to table filter configuration.
- Add component output adapters to `GenericPaginatedPage`.
- Publish declared filter, selected-ID, and search outputs.
- Resolve parameters for tables, charts, information blocks, distribution
  blocks, pipeline requests, and workflow requests.
- Include resolved values in query keys.
- Render waiting and configuration-error states without issuing invalid
  requests.
- Preserve existing local table filtering behavior.

## tenantPanel Responsibilities

- Generate immutable component and filter IDs.
- Add and validate unique component `stateKey` aliases.
- Add an output editor and **Expose as component output** table-filter action.
- Add a parameter-binding picker for page filters, page variables, component
  outputs, system values, derived values, and static values.
- Display readable aliases while persisting immutable IDs.
- Filter available output fields by output type.
- Validate missing references, duplicate keys, invalid fields, incompatible
  types, and unsupported cycles before saving.
- Continue loading and editing legacy `params`.

## autotable-Go Responsibilities

- Extend page models with component aliases, immutable filter IDs, component
  output definitions, page filters/variables, and structured parameter
  bindings.
- Validate the full page contract on create and update.
- Return field-level page validation errors.
- Keep runtime references out of execution endpoints; the frontend sends only
  resolved parameter values.
- Apply shared typed request-parameter definitions to pipeline and workflow
  execution as specified by the earlier page-filter design.
- Preserve tenant, project, and user execution context in a separate namespace
  from client parameters.

## Compatibility and Migration

- Existing pages without component outputs behave unchanged.
- Existing component IDs remain valid when unique; missing IDs are generated
  only during an explicit migration/save path.
- Existing table filters without IDs remain usable locally. tenantPanel assigns
  immutable IDs when a filter is edited or exposed.
- Existing `DataBinding.params` entries normalize to static parameter bindings.
- If both legacy `params` and new `parameters` define the same request
  parameter, the new `parameters` entry wins.
- Existing route-template parameter values remain supported during migration.
- No existing filter is automatically exposed or promoted.

## Error Handling

tenantPanel and autotable-Go page validation report:

- duplicate component IDs, aliases, or output keys;
- duplicate filter IDs;
- missing component, filter, variable, or output references;
- output sources incompatible with the component type;
- invalid `field` values for the output type;
- parameter/output type mismatches;
- unsupported derived transforms or cycles.

react-template reports invalid persisted configuration at the consuming
component and skips its request. An unavailable required interaction renders a
neutral waiting state. Backend execution errors remain distinct from binding
configuration errors.

## Testing

### react-template

- runtime output publication and selector isolation;
- table filter, search, and selected-ID output adapters;
- component-ID lookup and alias independence;
- binding compilation and type/field validation;
- unavailable, `null`, invalid-reference, and mismatch behavior;
- dependency-aware query keys and refetching;
- debounce and completed date-range behavior;
- legacy `params` normalization and precedence;
- WebSocket invalidation with current resolved values.

### tenantPanel

- immutable ID generation;
- unique alias and output-key validation;
- exposing a table filter as an explicit output;
- readable expression rendering from current aliases;
- rename safety with unchanged persisted component IDs;
- type-filtered field picker;
- deletion protection and missing-reference errors;
- legacy parameter editing.

### autotable-Go

- page-model serialization for all new contracts;
- duplicate and missing-reference validation;
- component/output/source compatibility;
- output-field and parameter-type validation;
- cycle validation;
- compatibility with pages lacking the new fields;
- create/update field-level error responses.

### Integration

An end-to-end page contains:

- a table-local `createdAt` date-range filter exposed as
  `createdAtFilter`;
- a second table, chart, and information block whose `after` and `before`
  parameters consume its start and end outputs;
- a table-local filter change that refetches only those consumers;
- a component alias rename that leaves persisted bindings operational;
- an unavailable required output that waits without sending a request;
- a promoted page filter that replaces the table-owned output for a genuinely
  shared reporting period.

## Delivery Sequence

1. Add the shared model contracts and page validation rules.
2. Add immutable component/filter identity migration behavior.
3. Build the react-template runtime store, binding compiler, and resolver with
   tests.
4. Publish table filter, search, and selected-ID outputs.
5. Integrate resolved parameters and query keys across component request types.
6. Add autotable-Go page contract validation and typed execution boundaries.
7. Add tenantPanel output and parameter-binding editors.
8. Add promotion, migration warnings, and cross-project integration tests.

