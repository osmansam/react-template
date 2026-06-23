# Page-Scoped Runtime Filters and Request Bindings

## Objective

Allow one page-level filter to drive any number of tables, charts, information blocks, distribution blocks, pipeline requests, and workflow requests. Support project-timezone-aware relative dates, derived comparison periods, and server-generated dates without requiring user input.

## Current State

- Table filter state is owned by each `GenericPaginatedPage`, so another component cannot consume it.
- `DataBinding.params` contains only static JSON.
- Pipeline parameters are query strings substituted into pipeline JSON with a regular expression. This loses most types and makes JSON substitution fragile.
- Workflow sources already receive `DataBinding.params` in the workflow `record`, but there is no runtime binding step.
- The existing table filter input configuration and generic input renderer are suitable for page filters and should be reused.

## Design Decisions

### Page filters are the single source of truth

`PageModel` gains a `filters` collection. A page filter uses the same input properties as an existing table filter, plus a stable ID, scope, order, and optional date-range configuration.

```ts
type FilterScope = "page" | "component";

interface PageFilterDefinition extends TableFilterPanelInputConfig {
  id: string;
  scope: "page";
  order?: number;
  defaultPreset?: DateRangePreset;
}
```

Existing table filters remain component-scoped. Page Designer provides **Promote to page filter**, which copies the configuration into `page.filters`, generates an immutable ID, replaces the table-local input with a reference to the page filter, and preserves the initial value.

A promoted filter is rendered once in the page filter bar. Components never create independent copies of its state.

### Page runtime owns filter state

Rendered pages are wrapped in `PageRuntimeProvider`. The provider receives:

- page filter definitions;
- the project IANA timezone;
- optional initial values from the URL;
- the current clock through an injectable clock abstraction for testing.

It exposes definitions, current values, validation state, and update/reset operations. Component hooks select only the filter values their request bindings use.

Date-range state is structured rather than represented as two unrelated strings:

```ts
interface PageFilterDateRangeValue {
  preset?: DateRangePreset;
  startEpochMs: number;
  endEpochMs: number; // exclusive
  timezone: string;
}
```

The existing `QuickDateRangeFilter` becomes a controlled presentation component for this state and converts calendar selections at its boundary. Generic page-filter rendering may use the same input renderer used by table filters.

### Data bindings map runtime values into request parameters

New bindings use one parameter-source map so each target parameter has exactly one source:

```ts
type ParameterValueSource =
  | {
      source: "static";
      value: unknown;
    }
  | {
      source: "pageFilter";
      filterId: string;
      field?: "value" | "start" | "end" | "preset";
    }
  | {
      source: "derived";
      filterId: string;
      transform: "previousCalendarPeriod" | "previousEqualDuration";
      field: "start" | "end";
    }
  | {
      source: "system";
      value: "today" | "thisWeek" | "thisMonth" | "thisYear" | "now";
      field?: "start" | "end";
    };

interface DataBinding {
  // existing properties
  parameters?: Record<string, ParameterValueSource>;
  // legacy input normalized at page-load time
  params?: Record<string, unknown>;
  paramBindings?: Record<string, Exclude<ParameterValueSource, { source: "static" }>>;
}
```

At page-load time, a normalizer converts each legacy `params` entry into a static source and each legacy `paramBindings` entry into its runtime source. If both legacy maps contain the same parameter, `paramBindings` wins for compatibility. Runtime code and new Page Designer saves use only the normalized `parameters` model. This preserves existing pages without carrying precedence rules into the resolver.

Missing required filters, invalid date ranges, unknown fields, and type mismatches prevent the request and produce a component-level configuration error. They must not silently send empty values.

Filter IDs are generated immutable identifiers such as `flt_01JZ...`; labels and form keys remain editable display/configuration properties. Deleted IDs are not manually reusable through Page Designer.

## Date Semantics

The project timezone is authoritative. The backend `Project` model and frontend `Project` type gain a required `timezone` IANA name such as `America/Chicago`. Existing projects are migrated to `UTC`, and new projects default to `UTC` until an administrator selects another timezone. Runtime date evaluation never silently falls back to the browser timezone.

- All start boundaries are inclusive.
- All end boundaries are exclusive.
- `today` spans local start-of-day to the next local start-of-day.
- `thisMonth` spans local start-of-month to the next local start-of-month.
- `previousCalendarPeriod` uses the selected preset's calendar unit. For `thisMonth`, it returns the complete previous month.
- A custom range has no calendar preset and defaults to `previousEqualDuration`.
- Converting local boundaries into UTC instants occurs after calendar arithmetic, so daylight-saving transitions remain correct.

Resolved ranges retain the same numeric-instant representation:

```ts
interface ResolvedDateRange {
  preset?: DateRangePreset;
  startEpochMs: number;
  endEpochMs: number;
  timezone: string;
}
```

The runtime uses timezone-aware calendar operations and converts instants to ISO-8601 only at the HTTP boundary. `date-fns-tz` is added alongside the existing `date-fns` dependency; raw date strings are not compared or used for calendar arithmetic.

Frontend system bindings are evaluated when the request is prepared, using the loaded project timezone. Backend parameter defaults are evaluated by autotable-Go at execution time and are authoritative for unattended requests. Both use injectable clocks. They support requests such as “today” without rendering a filter or waiting for user input.

## Request Parameter Definitions

Pipelines and workflows share parameter metadata instead of defining separate type systems:

```ts
interface RequestParameterDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "instant" | "localDate" | "stringArray" | "numberArray" | "object";
  required?: boolean;
  defaultExpression?: {
    source: "system";
    value: "today" | "thisWeek" | "thisMonth" | "thisYear" | "now";
    field?: "start" | "end";
  };
}
```

Only server-resolvable system expressions are allowed as backend defaults. Page-filter and derived bindings belong to the page component because the backend does not own browser page state.

`instant` means an absolute point in time and becomes a BSON datetime. `localDate` means an ISO calendar date (`YYYY-MM-DD`) without a time or offset and remains a validated date string unless a consuming operation explicitly converts it using the project timezone.

Object parameters are JSON-safe objects only. Validation recursively rejects keys beginning with `$`, non-finite numbers, unsupported runtime values, depth over 8, more than 1,000 aggregate keys/items, or canonical JSON over 32 KiB. They may replace only an exact `$param` marker; they cannot contribute MongoDB operators or dynamic field paths. Object shape schemas are outside this delivery; adding them later does not change the parameter-source contract.

## Shared Parameter Resolution Domain

Parameter handling is a dedicated domain rather than logic embedded separately in components, pipelines, and workflows.

Frontend resolution returns resolved values, referenced filter dependencies, and structured errors. Bindings are compiled once when the page model loads:

```ts
interface CompiledComponentBinding {
  parameterResolvers: Record<string, CompiledParameterResolver>;
  dependencyFilterIds: string[];
}
```

Requests evaluate the compiled binding against a runtime snapshot. They do not repeatedly inspect page configuration.

autotable-Go exposes one internal resolver used by pipeline and workflow execution. It receives definitions, untrusted input, project timezone, an injectable clock, and strict/compatibility mode, then returns typed parameters or field errors. Tenant, project, and user execution context is a separate typed structure and is never merged into client request parameters.

## Pipeline Integration

Pipeline definitions gain `parameters: RequestParameterDefinition[]`.

Pipeline JSON uses a reserved typed marker:

```json
[
  {
    "$match": {
      "createdAt": {
        "$gte": { "$param": "currentStart" },
        "$lt": { "$param": "currentEnd" }
      }
    }
  }
]
```

autotable-Go parses the JSON first and recursively replaces an object whose only property is `$param` with the validated BSON value. It never inserts request text into JSON. Instant parameters become BSON dates, numbers remain numbers, arrays remain arrays, and objects remain restricted JSON-safe values.

Pipeline requests from tables, charts, and blocks all use the same frontend resolver. New typed requests use `POST /pipeline/:pipelineName/execute` with `{ "params": { ... } }`, allowing arrays and restricted objects without query-string encoding. Existing GET pipeline and table-source endpoints remain available for legacy scalar parameters. Pipeline-backed table-source fetching gains an equivalent POST query route while the existing GET route remains compatible.

Project-context markers such as tenant ID, project ID, and project collection remain backend-controlled and cannot be overridden by client parameters.

## Workflow Integration

Workflow definitions also gain `parameters: RequestParameterDefinition[]`. Workflow source components use the same parameter-source model. The frontend resolves them and sends a separate `params` object:

```json
{
  "record": {},
  "params": {
    "currentStart": "2026-06-01T05:00:00.000Z",
    "currentEnd": "2026-07-01T05:00:00.000Z",
    "lastStart": "2026-05-01T05:00:00.000Z",
    "lastEnd": "2026-06-01T05:00:00.000Z"
  }
}
```

Before execution, autotable-Go applies workflow parameter definitions to `params`: it supplies server defaults, validates required values, and coerces declared instants and other supported types. Workflow templates consume them through `{{params.currentStart}}`, `{{params.currentEnd}}`, and equivalent paths. The workflow execution payload gains a `Params` map distinct from the business `Record`, and template/path resolution gains the `params.` namespace.

Page Designer validates workflow bindings against the declared definitions. Existing callers that placed request parameters in `record` remain supported in compatibility mode, but new page bindings and edited workflows use `params`. New pipeline and workflow definitions are strict by default; legacy definitions remain permissive until migrated. Server execution context is not included when checking unknown client parameters.

Read-only workflows used as table sources receive resolved params before execution, just like information and distribution blocks. The React query key includes resolved parameters so any page-filter change refetches the affected workflow.

## Page Designer Changes

Page Designer gains:

1. A page-filter section using the existing filter input editor.
2. **Promote to page filter** on table filter inputs.
3. Generated immutable filter IDs and uniqueness-integrity validation.
4. A parameter-binding editor for every component with pipeline or workflow source type.
5. Pipeline parameter selection from declared pipeline metadata.
6. Workflow parameter selection from declared workflow metadata, with compatibility support for legacy values passed through `record`.
7. Source selectors for static value, page filter, derived period, and system date.
8. An inline preview showing resolved values in the project timezone.

Deleting a page filter is blocked while bindings reference it, unless the user explicitly removes those bindings in the same operation.

## Runtime Request Flow

1. Load the page and project timezone.
2. Initialize page filter state from URL values or configured defaults.
3. Resolve only the parameters referenced by a component.
4. Validate required values and types.
5. For a pipeline source, serialize values and let autotable-Go convert them using request parameter definitions.
6. For a workflow source, place resolved values into workflow `params`; autotable-Go applies the same parameter validation, defaults, and coercion before workflow execution.
7. Include resolved parameters in the React query key.
8. Refetch only components whose resolved parameters changed.

Updates should be debounced for text inputs. Select, boolean, and date-preset changes can refetch immediately. A custom date range refetches only after both boundaries are valid.

`PageRuntimeProvider` exposes stable actions separately from state subscriptions. Filter values live in a small external store consumed through `useSyncExternalStore` and selector hooks, so changing one filter does not rerender every component that reads page runtime state. Compiled dependency lists determine which component query keys change.

## Compatibility and Migration

- Existing pages without `page.filters` behave unchanged.
- Existing table-local filters remain supported.
- Existing `DataBinding.params` and `paramBindings` are normalized into the unified parameter-source model.
- Existing pipeline `{{name}}` placeholders remain temporarily supported, with a deprecation warning in Page Designer and backend logs.
- New or edited pipelines use parameter definitions and `$param` markers.
- Existing workflows accept undeclared record fields in compatibility mode; new or edited workflows declare request parameters and receive them in `params`.
- Migration of a table filter is explicit through **Promote to page filter**; no automatic data rewrite occurs.
- Cache inputs use canonical JSON: object keys are recursively sorted, array order is preserved, instants are UTC ISO strings, non-finite numbers are rejected, `undefined` is omitted, and `null` is retained. Pipeline keys include a SHA-256 hash of canonical parameters and a definition hash derived from pipeline JSON plus parameter definitions, preventing stale hits after a pipeline edit.

## Error Handling

- Designer save rejects duplicate filter IDs, missing references, invalid transforms, and incompatible parameter types.
- Runtime configuration failures render an actionable component error and skip the request.
- Backend rejects unknown client parameters for new strict pipelines and workflows; legacy definitions use compatibility mode.
- Missing required pipeline or workflow parameters return HTTP 400 with field-level details.
- Invalid project timezone and invalid relative-date expressions return HTTP 400.
- Pipeline and workflow logs redact parameter values and record only names/types instead, preventing sensitive filter data from entering logs.

## Testing

Frontend unit tests cover:

- runtime initialization and reset;
- promotion of a table filter;
- shared updates across multiple components;
- legacy static/runtime normalization precedence;
- dependency-aware query keys and refetching;
- missing and incompatible bindings;
- preset and custom comparison ranges.

Date tests cover month/year boundaries, leap years, daylight-saving transitions, and exclusive end boundaries in at least two IANA timezones.

Backend unit tests cover:

- recursive `$param` replacement;
- all supported BSON conversions, including distinct instant and local-date behavior;
- required, unknown, and malformed parameters;
- server-generated date defaults using project timezone;
- workflow params coercion using the shared request parameter definitions;
- cache-key normalization;
- object-parameter operator, depth, and size restrictions;
- legacy placeholder compatibility.

Integration tests cover the same page filter driving a schema table, pipeline chart, pipeline table, and workflow information block, including a filter change that refreshes all bound consumers.

## Delivery Sequence

1. Define the normalized parameter contracts, instant/local-date semantics, canonical serialization, immutable IDs, and injectable clocks.
2. Add `Project.timezone` to autotable-Go and tenantPanel, migrate existing projects to `UTC`, and add administrator editing.
3. Build the selector-based page runtime, binding compiler, and frontend resolver with tests.
4. Add page filter rendering and bind schema-table consumers without changing existing local filters.
5. Build the shared autotable-Go parameter resolver, strict/compatibility behavior, and canonical cache keys.
6. Add typed pipeline parameters and recursive `$param` resolution.
7. Add workflow `params`, `{{params.*}}` templates, and shared parameter validation while preserving legacy record behavior.
8. Add Page Designer page-filter, parameter-definition, and binding editors.
9. Add promotion, migration warnings, and end-to-end integration tests.

This order keeps existing pages operational while each new capability becomes independently testable.
