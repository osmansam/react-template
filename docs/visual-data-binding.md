# Visual collection rendering — 2026-11-04

Visual blocks now execute supported saved AutoTable schema-list repeaters through
the existing authenticated `/dynamic/table-source` transport. Their editor lives
in Tenant Panel; this app has no visual authoring tools.

The document format stays version 2 with existing repeater `source` and child
`bindings`. Queries are deduplicated by effective source and isolated by project
and verified application identity. Record keys stay exact. Requests and session
refresh are bounded, cancellable, and authorization failures are not retried by
the collection layer. Loading/empty/error states and retry are local to the data
region; metadata prerequisites also have recovery. Failed refreshes hide cached
rows. Repeated instance IDs/internal targets are isolated across records and
placements. Output remains light-only.

This milestone reads page 1 with limit 1–100, static representable filters and one
sort. A count/first-page caption discloses the limit. Pipeline/workflow/configured
API sources, interactive pagination, nested repeaters, page/selection parameters
are deferred. Visual record actions are described below. Native manual tabs render visual children
through VisualBlock alongside existing table tabs.

Existing saved repeaters begin requesting their configured supported schema when
the published page is opened. Backend access rules still apply. Sample records
are editor-session data only and are never shipped in page/library payloads.

Authoring instructions: tenantPanel/docs/visual-builder.md. Design and execution
record: tenantPanel/docs/superpowers/specs/2026-11-03-visual-data-binding-design.md
and tenantPanel/docs/visual-data-progress.md. Browser verification uses isolated
in-memory fixtures; no live product data is created or modified.

As of 2026-11-04, the existing bound properties also support inline item templates
in their v2 string values: `{{item.name}}`, `Price: {{item.price}}`, nested paths
such as `{{item.category.name}}`, and image sources such as `{{item.imageUrl}}`.
They resolve once per repeater record through the same renderer used in the
Tenant Panel sample preview. The canonical scope is always `item`, independently
of the repeater alias. Explicit selector bindings retain precedence. Missing or
non-scalar values become blank; unsafe URLs use an inert fallback. Tokens remain
authored strings outside a record context and are preserved in saved page copies.

Repeaters may also save optional `itemsLayout` settings: per-device columns and
pixel gaps, plus item alignment. Configured repeaters render one responsive grid
region with one cell per complete record template; the count caption stays below
the grid. Breakpoints are 768px tablet and 1024px desktop. Old repeaters without
this field retain their parent-driven flow. Layout edits do not change query
keys or fetch counts, and authored Card dimensions remain intact.

Schema change events now refresh active visual collections alongside tables.
Collection query metadata records the exact schema; the WebSocket invalidation
predicate matches it together with tenant/project from the connected socket.
Other schemas and projects are excluded, and identical repeater copies still
share one request. Existing table invalidation behavior and query identities are
unchanged. Table-originated successful single-record edits retain the existing WebSocket
refresh path. Visual action completion also refreshes local matching data directly,
as described below.

Regression verification: a mounted real-query/real-socket-handler test first
retained the old record after an invalidate event, then passed with one refetch
and unrelated project/schema caches untouched. An isolated browser confirmed
edit/create/delete events update rendered cards without reloading (all data was
in-memory fixtures). Runtime full suite: 144 files / 896 tests passed; TypeScript,
focused lint and the temporary-output production build passed.

Visual Button nodes may now contain a bounded, optional generic host action:
`{name:"record", config:{schemaName, action:TableActionConfig, valueBindings}}`.
A mapping such as `productId:["_id"]` copies a typed value from the complete
clicked record, even when that field is not displayed. Actual records never enter
saved documents. The generic engine only emits the action and record snapshot;
this app supplies the authenticated record-action host lazily when needed.

The host reuses table CRUD/workflow mutations, conditions, form inputs, selections,
layout and modal components. Edit/update/delete preserve the original ID; Create
copies only explicit mappings and configured values. Form fields are editable
prefills, other mapped values are hidden submission values, and constants take
precedence. Populated select arrays use the same normalization as table edits.
Malformed settings and missing values disable the button locally. Pending forms
block duplicates, keep values on errors and close after awaited success; changing
project/user closes an unsubmitted action. Old asynchronous completions cannot
close a newer action. Existing schema WebSocket events refresh visual collections. Successful visual
actions additionally invalidate the matching local table and visual collection
queries, so delayed or missing events cannot leave the saved page stale. This
refresh cancels older reads and starts after the write completes; unrelated
projects/schemas and late completions from a previous user/project are excluded.

Editor/sample renderers receive no action host and never run mutations. Existing
plain links/native submit buttons retain their behavior. This adds no endpoints,
dependencies or document version change. Form field metadata/values and actions
remain subject to the visitor's backend permissions.


Refresh regression (2026-11-04): visual actions previously relied on socket events
while their table mutation hook only updated table-cache keys. Added mounted tests
for a real visual edit with two matching placements and an active table query,
without a socket event, and for an older in-flight read returning after a save.
Both first reproduced stale values and now pass. Isolated browser verification
with mutation notifications deliberately omitted confirms failure retention,
correct hidden ID, and one collection refresh after successful retry. Full runtime
suite: 152 file entries / 940 test entries (including typecheck copies); standalone
TypeScript, focused lint, production build and focused review passed.

Conditional visual colors are supported through optional v2 node
`conditionalColors` rules. Rules retain safe own-property paths, strict typed
values, validated theme/custom colors and ordered first-match behavior. Numeric
Between is [lower,upper). Missing/non-numeric values never match a numeric rule.
Rules are evaluated transiently from the current item, with no new requests or
record/evaluated-style persistence. Explicit matching text replaces gradients;
backgrounds paint once (including alpha); root page-background suppression remains.
Disclosure/tab/sidebar trigger labels use the same item/color resolution. Normal
styles remain intact without a match. Authoring instructions are in the Tenant
Panel guide. Automated verification and the browser-QA limit are recorded in the
2026-11-04 conditional-colors plan.


## Table selection as a visual details context

A custom visual placement can bind `dataBinding.parameters.item` to a table component output with `type: "record"` and source `tableSelectedRecord`. Configure it from the **Data connection** button in Tenant Panel's placed visual editor header. No connection is required for ordinary visual designs. The runtime resolves this through PageRuntimeProvider and passes it into the existing visual item context, so `{{item.name}}`, nested fields, image bindings, conditional colors and record actions work outside repeaters.

The first currently visible valid, uniquely identified row resolves automatically. A normal row click or Enter/Space on a focused row activates another record without enabling bulk selection. If it disappears through deletion/filtering/pagination, the first visible valid row becomes active; empty results and source unmount clear the output. Values come from current source data before nested-row UI decoration; no extra API request runs on activation. Bulk selected IDs are independent. Interactive row controls keep their original behavior; ordinary row whitespace activates details. Local repeaters override the root item context per record. Static visuals continue to render without a page-runtime provider. Published visual panels remain in light mode.

The store bounds record depth/size, rejects non-JSON values and prototype paths, and deep-clones/freezes the published snapshot. This does not grant additional access: values are limited to data returned by the existing table request. Keep `_id` in the table result when downstream visual actions require record identity.
