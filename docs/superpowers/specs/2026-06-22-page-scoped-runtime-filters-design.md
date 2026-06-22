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

Existing table filters remain component-scoped. Page Designer provides **Promote to page filter**, which copies the configuration into `page.filters`, assigns or requests a unique ID, replaces the table-local input with a reference to the page filter, and preserves the initial value.

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
interface RuntimeDateRange {
  preset?: DateRangePreset;
  start: string; // ISO-8601 instant
  end: string;   // ISO-8601 instant, exclusive
  timezone: string;
}
```

The existing `QuickDateRangeFilter` becomes a controlled presentation component for this state. Generic page-filter rendering may use the same input renderer used by table filters.

### Data bindings map runtime values into request parameters

`DataBinding` keeps static `params` and gains `paramBindings`:

```ts
type RuntimeParamBinding =
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
  params?: Record<string, unknown>;
  paramBindings?: Record<string, RuntimeParamBinding>;
}
```

Static parameters are resolved first. Runtime bindings then overwrite parameters with the same name, making the precedence explicit and allowing a static fallback to be replaced by a page value.

Missing required filters, invalid date ranges, unknown fields, and type mismatches prevent the request and produce a component-level configuration error. They must not silently send empty values.

## Date Semantics

The project timezone is authoritative. It is stored as an IANA timezone such as `America/Chicago`. A missing or invalid project timezone is a configuration error; browser timezone is used only during the migration period and generates a warning.

- All start boundaries are inclusive.
- All end boundaries are exclusive.
- `today` spans local start-of-day to the next local start-of-day.
- `thisMonth` spans local start-of-month to the next local start-of-month.
- `previousCalendarPeriod` uses the selected preset's calendar unit. For `thisMonth`, it returns the complete previous month.
- A custom range has no calendar preset and defaults to `previousEqualDuration`.
- Converting local boundaries into UTC instants occurs after calendar arithmetic, so daylight-saving transitions remain correct.

Frontend system bindings are evaluated when the request is prepared, using the loaded project timezone. Backend parameter defaults are evaluated by autotable-Go at execution time and are authoritative for unattended requests. They support requests such as “today” without rendering a filter or waiting for user input.

## Request Parameter Definitions

Pipelines and workflows share parameter metadata instead of defining separate type systems:

```ts
interface RequestParameterDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "stringArray" | "numberArray" | "object";
  required?: boolean;
  defaultExpression?: {
    source: "system";
    value: "today" | "thisWeek" | "thisMonth" | "thisYear" | "now";
    field?: "start" | "end";
  };
}
```

Only server-resolvable system expressions are allowed as backend defaults. Page-filter and derived bindings belong to the page component because the backend does not own browser page state.

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

autotable-Go parses the JSON first and recursively replaces an object whose only property is `$param` with the validated BSON value. It never inserts request text into JSON. Date parameters become BSON dates, numbers remain numbers, arrays remain arrays, and objects are recursively validated.

Pipeline requests from tables, charts, and blocks all use the same frontend resolver. Existing GET endpoints may continue accepting scalar query parameters during migration; the backend parameter definition performs conversion. A later POST execution endpoint may be introduced for large arrays or objects without changing `DataBinding`.

Project-context markers such as tenant ID, project ID, and project collection remain backend-controlled and cannot be overridden by client parameters.

## Workflow Integration

Workflow definitions also gain `parameters: RequestParameterDefinition[]`. Workflow source components use the same `paramBindings`. The frontend resolves them and sends the resulting object as the existing workflow `record`:

```json
{
  "record": {
    "currentStart": "2026-06-01T05:00:00.000Z",
    "currentEnd": "2026-07-01T05:00:00.000Z",
    "lastStart": "2026-05-01T05:00:00.000Z",
    "lastEnd": "2026-06-01T05:00:00.000Z"
  }
}
```

Before execution, autotable-Go applies workflow parameter definitions to the incoming record: it supplies server defaults, validates required values, and coerces declared dates and other supported types. Existing workflow templates can then consume typed values through `{{record.currentStart}}`, `{{record.currentEnd}}`, and equivalent paths. Workflow execution therefore does not need a second page-filter expression language.

Page Designer validates workflow bindings against the declared definitions. A compatibility mode permits undeclared record fields for existing workflows, while new or edited workflows use strict parameter validation.

Read-only workflows used as table sources receive the resolved record before execution, just like information and distribution blocks. The React query key includes resolved parameters so any page-filter change refetches the affected workflow.

## Page Designer Changes

Page Designer gains:

1. A page-filter section using the existing filter input editor.
2. **Promote to page filter** on table filter inputs.
3. Stable, unique filter ID validation.
4. A parameter-binding editor for every component with pipeline or workflow source type.
5. Pipeline parameter selection from declared pipeline metadata.
6. Workflow parameter selection from declared workflow metadata, with compatibility support for existing undeclared record fields.
7. Source selectors for static value, page filter, derived period, and system date.
8. An inline preview showing resolved values in the project timezone.

Deleting a page filter is blocked while bindings reference it, unless the user explicitly removes those bindings in the same operation.

## Runtime Request Flow

1. Load the page and project timezone.
2. Initialize page filter state from URL values or configured defaults.
3. Resolve only the parameters referenced by a component.
4. Validate required values and types.
5. For a pipeline source, serialize values and let autotable-Go convert them using request parameter definitions.
6. For a workflow source, place resolved values into the workflow `record`; autotable-Go applies the same parameter validation, defaults, and coercion before workflow execution.
7. Include resolved parameters in the React query key.
8. Refetch only components whose resolved parameters changed.

Updates should be debounced for text inputs. Select, boolean, and date-preset changes can refetch immediately. A custom date range refetches only after both boundaries are valid.

## Compatibility and Migration

- Existing pages without `page.filters` behave unchanged.
- Existing table-local filters remain supported.
- Existing static `DataBinding.params` remain supported.
- Existing pipeline `{{name}}` placeholders remain temporarily supported, with a deprecation warning in Page Designer and backend logs.
- New or edited pipelines use parameter definitions and `$param` markers.
- Existing workflows accept undeclared record fields in compatibility mode; new or edited workflows declare request parameters.
- Migration of a table filter is explicit through **Promote to page filter**; no automatic data rewrite occurs.
- Pipeline caching continues to include the normalized resolved parameter set. Parameter order must not create distinct cache entries.

## Error Handling

- Designer save rejects duplicate filter IDs, missing references, invalid transforms, and incompatible parameter types.
- Runtime configuration failures render an actionable component error and skip the request.
- Backend rejects unknown parameters when strict pipeline parameter mode is enabled.
- Missing required pipeline or workflow parameters return HTTP 400 with field-level details.
- Invalid project timezone and invalid relative-date expressions return HTTP 400.
- Pipeline logs redact parameter values and record names/types instead, preventing sensitive filter data from entering logs.

## Testing

Frontend unit tests cover:

- runtime initialization and reset;
- promotion of a table filter;
- shared updates across multiple components;
- static/runtime parameter precedence;
- dependency-aware query keys and refetching;
- missing and incompatible bindings;
- preset and custom comparison ranges.

Date tests cover month/year boundaries, leap years, daylight-saving transitions, and exclusive end boundaries in at least two IANA timezones.

Backend unit tests cover:

- recursive `$param` replacement;
- all supported BSON conversions;
- required, unknown, and malformed parameters;
- server-generated date defaults using project timezone;
- workflow record coercion using the shared request parameter definitions;
- cache-key normalization;
- legacy placeholder compatibility.

Integration tests cover the same page filter driving a schema table, pipeline chart, pipeline table, and workflow information block, including a filter change that refreshes all bound consumers.

## Delivery Sequence

1. Add shared models and the page runtime provider in react-template.
2. Add page filter rendering and bind schema tables without changing existing local filters.
3. Add parameter binding resolution for pipeline and workflow consumers.
4. Add Page Designer page-filter and binding editors in tenantPanel.
5. Add typed pipeline parameter definitions and `$param` resolution in autotable-Go.
6. Add promotion, compatibility warnings, and integration tests.

This order keeps existing pages operational while each new capability becomes independently testable.
