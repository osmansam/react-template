# Visual builder port into react-template

Date: 2026-11-03
Status: Approved and implemented on 2026-11-03. See the verification record for results and limitations.

## Intent and agreed direction

The user has four applications: AutoTable Go is the backend, Tenant Panel manages
project configuration, react-template renders project application pages, and
ozmishow-nextjs generates websites using AutoTable. They want the existing
ozmishow visual builder available in react-template. After this foundation, they
intend to add API-driven content, such as designing a card and repeating it for
each response item.

The user selected **port into react-template first**, then approved this design
with “looks good”. The integration choices below are the approved first-version
scope.

## Approaches considered

1. **Direct port, selected by the user.** Bring the existing engine and editor
   into react-template, keep its document format, and adapt the host-specific
   integrations. This delivers the existing editor without restructuring the
   source application. Subsequent source changes require deliberate syncing.
2. **Shared package now.** Extract an engine consumed by both repositories.
   This would centralize maintenance, but also requires changing the source app
   and establishing a package distribution/development workflow. Deferred.

This is a project-sized integration, because the source engine contains its own
model, validation, operations, renderer, effects, theme, templates and editor.

## First-version scope

- Retain the source editor's layout and capabilities: component library, layers,
  drag/drop, properties/styles, inline content edits, responsive breakpoints,
  undo/redo, preview, document import/export, templates, style tools, motion and
  local version snapshots.
- Render saved visual blocks inside ordinary project pages, including alongside
  existing tables, forms, charts and tabs.
- Select an existing non-group project page, add a visual section, or edit an
  existing visual block. Page creation and general page metadata remain in
  Tenant Panel for this first version.
- Save and reload the visual document through AutoTable's existing page
  management API, using its management session and permission checks.
- Preserve the document model for repeaters and field bindings. Live collection
  fetching, arbitrary API-source configuration, loading/error/empty designs,
  pagination and request-to-card binding workflows are the next phase.
- Document the editor URL, session prerequisite, page setup, storage behavior,
  port provenance and verification steps.

The first version must not turn into an unrelated replacement editor, store
saved page content only in localStorage, overwrite a page's unrelated content,
or allow an end-user application login to stand in for management authorization.

## Host architecture

### Portable engine

Port the source engine into `src/visual-engine`, preserving schema versions,
validation/migration rules and editor behavior. Preserve upstream licenses and
record the source repository revision and locally adapted files in a port note.
Do not add a runtime dependency on the sibling checkout or on an ozmishow server.

Adapt Next-specific image delivery to native browser images while retaining URL
validation, sizing, loading and accessibility behavior. Exclude Next server/public
rendering entry points. Adapt the theme context to a local implementation with
relative imports; visual themes must be scoped rather than changing the existing
application's document-wide theme.

Retain the source effect registry. Resolve dependency versions against the
target's existing React 18 environment; do not upgrade the application to React
19 as an incidental migration. Preserve deferred loading for heavy effects and
editor tools. Transfer the required renderer CSS, Tailwind token classes, fonts
and bundled starter assets, without importing the source app's global shell CSS.
Any source templates containing site-specific destinations remain examples and
must not be mistaken for configured project navigation.

The source's “create project page from slide” action calls the Next-only
`/api/admin/project-pages` endpoint and assumes website publication. This
website-specific action is omitted from the port UI; it must not remain visible
with a broken endpoint. General application page creation remains in Tenant
Panel. Existing slide content and links remain editable.

### Editor entry and page selection

Proposed reserved route:

`/t/:tenant/p/:project/_builder`

Optional page/block query parameters make an editing target bookmarkable. This
route is lazy-loaded and independent of the runtime application's user-login
guard and dynamic-page bootstrap. It uses a management gate based on actual
responses from the project management API, not cached user roles.

On entry, list pages from `/{tenant}/{project}/admin/page/`. The operator chooses
an existing page and an existing visual block, or adds a visual section. The
editor then uses the same full workspace as the source builder, with a small
host control for choosing the target and returning to the rendered page.

Group-only pages are not eligible editing targets. Page/block switching and
leaving the route must warn when edits are unsaved. Empty projects show a useful
message explaining that a page must first be created in Tenant Panel. Do not
reserve this path silently if an existing project page already uses it: detect
the collision and document the reserved route.

### Management authentication and API isolation

The backend distinguishes project application sessions from project management
sessions. `routes/pageRoutes.go` protects management reads and writes with the
strict management contracts in `routes/management_contracts.go`.

The operator signs in to Tenant Panel and opens the same project there to obtain
the existing project management cookie session. The builder uses that session
with credentials enabled. If it is absent, show instructions to sign in/open the
project in Tenant Panel and a Retry action; if a panel origin is configured,
offer a link to it. Introducing another credential/login form is outside this
port. This assumes both clients reach the same backend cookie host and the
builder origin is allowed by backend CORS/cookie configuration; document this
deployment prerequisite.

Use a separate management API adapter, with explicit tenant/project scope
captured for each request. On expired management access, refresh only that
project's `tenant-auth/refresh` session and retry once. Deduplicate concurrent
refresh requests within that scope. Management 401/403 failures must not clear or
redirect the end-user application session. Clear messages distinguish missing
management authentication, insufficient permission, unavailable resources and
network/server errors. The backend remains authoritative for write permission;
do not infer permission from a successful configuration read.

### Persisted block contract

Use the backend's existing `ComponentBlock` custom slot and free-form props:

```json
{
  "id": "stable-component-id",
  "type": "custom",
  "title": "Visual section",
  "props": {
    "visualBuilder": {
      "document": { "version": 2, "id": "stable-document-id", "name": "Visual section", "root": {} },
      "theme": {}
    }
  }
}
```

The document and optional theme above are schematic; actual values must pass the
ported validators. Only custom blocks with `props.visualBuilder` use the visual
renderer; unrelated custom blocks retain their existing fallback behavior. A
new block receives unique stable IDs and a valid empty/starter document.

Store section theme settings in the same envelope. This enables visual theme
editing without changing application-wide theme or branding configuration.
Existing older builder documents migrate through the source's migration logic.
Invalid documents produce a bounded error/fallback, never a whole-page crash or
an automatic destructive replacement.

The runtime's Axios response normalizer currently recursively camel-cases keys.
Preserve the entire authored `props.visualBuilder` value without recursively
renaming any of its keys. Make this exception narrowly and cover both runtime
reads and management reads. Imported/exported documents must retain casing,
effect configuration and field-binding paths exactly.

### Save and reload behavior

Use external storage mode and `onSaveDocument`; a successful Save means the
backend accepted the change. Theme saves use the same block update path. Errors
retain the dirty document and allow retry. Do not show saved status before the
request succeeds.

Fetch the full management page, including content an application user might not
be allowed to see. Before saving, read its latest version and merge only the
target visual block into that full page. Preserve its other sections, filters,
variables, navigation, authentication settings, roles and unknown supported
props. Locate blocks by stable IDs throughout grids, nested page tabs and
component tab panels. Adding a block appends a top-level component section.

The existing PATCH handler validates a PageModel and prepares a broad update,
so submit the full merged page payload, excluding database identity fields,
rather than assuming a sections-only patch is safe. Handle raw arrays and the
existing `data.data` response envelopes explicitly. Re-read the saved page to
confirm the canonical result and refresh relevant runtime page queries.

If the target block has changed since it was loaded, or was deleted, stop and
offer reload rather than silently replacing the change. The backend has no
atomic page revision condition today, so simultaneous writes after the final
read remain subject to its existing last-write behavior; this port does not
claim stronger concurrency guarantees.

Local templates, custom style kits and version snapshots may remain browser
features, as in the source. Namespace content-bearing browser keys by tenant
and project (and document/block where relevant). Shared display preferences can
remain browser-wide. Label local versions/templates accurately; they are not
server publication history or shared project libraries.

### Runtime rendering and future data work

Extend the active `DynamicPageSections` rendering path with a lazy visual custom
block renderer. Use the same document validation, scoped theme and component
renderer as the editor preview. Ordinary pages and login must not download the
editor workspace. Do not change the inactive placeholder layout engine merely
because it also has a custom-component switch.

Keep repeater nodes, field bindings and the renderer's `resolvedCollections`
input intact. The first version does not issue new API calls for repeaters. The
editor retains its source authoring preview; the runtime shows an explicit
unconnected-data state for a repeater that has no connected collection. This
avoids presenting sample records as real project data. A later integration can
resolve API responses into that renderer input and design one child card once.

## Repository boundaries and existing work

Product changes are targeted to react-template. AutoTable Go and Tenant Panel
are read for contracts and remain unchanged in this phase. No live data is
modified as part of implementation verification. No deployment or publishing
is requested. ozmishow-nextjs is the reference source and remains unchanged.

The repositories already contain uncommitted user work. Preserve it. Any
workspace isolation must include the relevant current working-tree source, not
silently port an older committed version or discard existing changes.

## Verification and acceptance

1. A management-authorized operator opens the editor, chooses an existing page,
   adds a visual block, edits layout/text/styles, previews mobile/tablet/desktop,
   saves, reloads, and sees the saved block on the application page.
2. Existing page content, metadata and authorization settings survive save.
   Nested visual blocks can be selected and updated by ID.
3. A normal application session alone cannot save a page. Missing/expired
   management authentication, insufficient permission and failed saves produce
   clear recoverable states without losing edits or logging out the application.
4. Document import/export, migration, undo/redo, drag/drop, local versions and
   templates work. Unsafe or invalid imported content is rejected by existing
   validators. Authored JSON survives response normalization and persistence.
5. Tenant/project switches isolate API requests, caches and content-bearing
   local storage. Concurrent project refreshes do not cross sessions.
6. Runtime visual blocks render independently of the editor chunk. Missing or
   invalid data does not crash the host page. Repeaters make no unintended live
   request and do not show example records as real data.
7. Run meaningful adapter/state/runtime tests and browser checks against a
   controlled API fixture, plus the repository's lint, tests and production
   build. Include desktop and narrow-screen editing/rendering checks, keyboard
   access, image/effect rendering and CSS isolation checks. Report existing
   unrelated failures separately rather than changing unrelated work.

## Choices left to implementation

Exact filenames, hook boundaries, lightweight target-picker styling, dependency
versions compatible with React 18, individual test fixtures, local key encoding,
and whether optional heavy modules can be copied only when reachable are the
builder's choices. Preserve the agreed user-visible behavior and document any
compatibility limitation found during verification before calling the port
complete.
