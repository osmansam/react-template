# Runtime ownership and verification

## Request ownership

`projectScope.ts` anchors `/t/:tenant/p/:project`, decodes segments once, rejects malformed/ambiguous segments and builds encoded routes. Unscoped legacy routes remain supported.

Project query families use `[family, tenant, project, ...identity]`. Selection, visual-collection and named page-request families retain their documented scoped shapes. The application creates a new QueryClient/subtree for project, actor or signed-in state changes. Mutations, rollback, invalidation, refresh and export must use their originating scope, not the current browser URL after an await.

`useTenantProject().requestConfig` snapshots `runtimeScope` and `runtimeSession`. Pass it into Axios when constructing asynchronous work. Explicit null scope pins legacy requests. Axios checks the session owner before dispatch, refresh/replay and accepting a response. `sessionRevision` is browser coordination metadata, never a credential or HTTP header. Same-tab and cross-tab changes retire stale work; request configs subscribe to revisions even if the actor ID stays the same. Legacy writers are recognized through storage event history when their notifications arrive.

Frontend ownership checks cannot undo a request already received by a server or a Set-Cookie response applied by a browser. The backend remains responsible for authorization and server-side session binding.

## UI lifetimes

Each WebSocket effect owns one connection and retry timer, disconnects on project change/unmount, and ignores stale events. Visibility recovery keeps an OPEN or CONNECTING socket. Invalid API settings do not start a reconnect loop.

`TableStateScope` owns search, sort, row expansion, selection, columns and page size for each table/page pair. Nested table primitives share their page's scope; sibling pages/tables are independent. General context retains application preferences. Action form policy and selection loading live in `tableActionForm.ts` and `useActionFormSelectionData.ts`; conditional form options live in `formOptionPolicy.ts`.

The page wrappers are composition roots rather than monoliths. Paginated-specific policy lives in `paginatedPage/` (query state, filters, row/bulk actions, row keys, cell formatting, action modals), unpaginated policy in `unpaginatedPage/`, shared table presentation in `genericTable/`, and add/edit form policy in `addEditPanel/`.

`RuntimeErrorBoundary` isolates rendering failures, retries only rendering and resets on page/component identity changes. Its optional reporting callback receives sanitized event metadata, not record contents. Session network failures offer retry; confirmed unauthenticated sessions redirect to login. HTTP requests default to a finite 15-second timeout; explicit overrides, AbortSignal and the existing refresh policy are preserved. Export has a 120-second timeout.

Shared text controls supply unique/caller IDs, labels, error/help associations, form names, autofill metadata and keyboard-operable controls. Login/register pending state prevents repeated submissions. Dialog titles use the existing focus-managed dialog component. Dialog roots occupy the viewport so their `role="dialog"` element has a real box even though the overlay and panel are fixed-position children.

## Bundle boundaries

Color and date controls load when rendered. Charts, visual effects and spreadsheet code remain optional feature dependencies. Do not import optional feature implementations through application-shell barrels or eager registries. Register component/effect loaders and keep type-only imports explicit. Preserve the renderer's saved document validation, migrations and host action contracts when extending components.

`vite build` emits `.vite/manifest.json`. `yarn check:bundle` traverses each configured entry's static dependencies once and checks raw and per-file gzip totals. Deferred imports count when their feature entry is explicitly selected. Budgets have approximately 12% headroom over the measured build. Review the dependency graph and browser requests when changing them; splitting a chunk into smaller files alone is not a reduction.

See `bundle-measurements.json` for reproducible before/after route totals. These are byte measurements, not measured load-time improvements. Significant WebGL and visual feature chunks remain intentionally deferred.

## Tests

`yarn test` runs runtime cases and source typechecking. `yarn test:coverage` adds V8 coverage and enforces the ratcheting thresholds in `vitest.config.ts`, including a dedicated visual-engine floor; CI runs this form. Vitest's combined summary counts typecheck entries as well as executed runtime tests; avoid interpreting it as twice as many independently executed tests. Use the repository's Yarn scripts so child processes resolve the project TypeScript version.

`yarn test:bundle` verifies transitive counting, shared dependencies/cycles, deferred exclusion, missing entries and regression failure. `yarn test:e2e` builds production-mode entries into `.e2e-dist` and starts its own local preview on port 3018. The fixture entry is included only in `--mode e2e`, and is absent from the ordinary production build. API and WebSocket routes are local browser fixtures; no production accounts or credentials are needed.

The Chromium suite runs desktop and 390px mobile projects. It exercises project switching, pending login, session outage/expiry, reconnect/unmount, sibling tables, lazy visual/chart/date features, downloads and section recovery. Failures preserve traces/screenshots under `test-results`. Live OAuth, backend authorization and real cookie ordering require validation against the actual backend.
