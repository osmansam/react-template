# React template reliability and maintainability

## Intent

Implement all seven improvements accepted from the repository review: tenant isolation, WebSocket lifecycle, shared table/page structure, accessibility, failure recovery, bundle cost, and onboarding/dependency hygiene. The application remains a schema-driven runtime for its existing backend and visual documents.

## Approach and constraints

The user's request to address all reviewed recommendations selects incremental hardening of the existing implementation. Each stage must leave the application working and independently verifiable. Keep React 18, Vite, React Query, existing routes, backend endpoints, and saved page/visual schemas. Preserve existing public component props unless adding optional accessibility props. Maintain existing paging, filtering, selection, nested-row, array-source, form, and action behavior.

A full framework migration or table-system replacement would enlarge the compatibility surface without addressing the reproduced defects more directly. Dependency cleanup will follow actual usage and build evidence; it will not replace all UI libraries or upgrade every package. No deployment, backend changes, account operations, or production data mutations are included. Changes remain available for local review; publishing is outside this work.

The precise helper names, extraction boundaries, chunk grouping, and compatible test-tool versions are implementation decisions. Success is observable behavior and measured output, not a target line count.

## 1. Tenant, project, and session isolation

Affected areas: `src/hooks/useTenantProject.ts`, `src/context/User.context.tsx`, `src/utils/projectSessionStorage.ts`, API hooks under `src/utils/api/`, legacy reads/mutations in `src/utils/dynamic.ts`, query-key/invalidation helpers, and relevant page/selection consumers.

- Use a shared route-scope parser rather than independent permissive pathname parsing. Preserve supported legacy routes and encode paths safely.
- Every project-dependent query must distinguish tenant and project; authenticated record data must also distinguish the session/user identity or be owned by a cache whose lifetime is tied to that identity.
- Pin transport scope when constructing queries and mutations. A queued request or refresh must retain its original project after navigation.
- Preserve compatible invalidation prefixes where useful, but update all reads, optimistic writes, rollback, mutation invalidation, and WebSocket predicates together. Scope invalidation to the relevant project.
- User context must not display a previous project's actor during navigation. Corrupt or unavailable browser storage must not crash startup. Login, logout, session expiry, and cross-tab events must produce consistent state.
- Handle in-flight work from an old project or identity without inserting its result into the new scope.

Acceptance: same-tab Alpha-to-Beta navigation requests Beta's login configuration and pages, never renders Alpha's cached configuration as Beta's, and does not reuse Alpha's records. Same-named schemas across projects remain independent. Existing refresh single-flight/request-scope tests continue to pass. Legacy routes remain usable.

## 2. WebSocket ownership and reconnect

Affected areas: `src/hooks/useWebSocket.ts`, its tests, and `src/App.tsx` as needed for connection inputs.

- Each effect setup owns its socket, disposal flag, reconnect timer, and retry delay. Cleanup cancels timers, disconnects the socket, and prevents stale event handlers from reconnecting or invalidating data.
- Tenant/project changes replace the connection. Keep existing event protocol and URL contract.
- Preserve visibility recovery with one active connection/retry sequence; Strict Mode setup/cleanup/setup must work correctly.
- Preserve bounded retry behavior and avoid connecting/reconnecting for an invalid runtime configuration. Connection eligibility on public routes must follow the existing backend's supported behavior, rather than assuming that all public sockets are invalid.

Acceptance: a disconnect reconnects after Strict Mode remount; pending retries cannot create a socket after unmount; switching project closes the old connection; repeated visibility and close events do not produce duplicate sockets. Events invalidate only the intended scope.

## 3. Table/page decomposition and state ownership

Affected areas: `GenericPaginatedPage.tsx`, `GenericUnpaginatedPage.tsx`, `GenericTable.tsx`, `GenericAddEditPanel.tsx`, and their shared helpers/hooks.

- Extract shared column/cell construction, action form preparation, row action presentation, and selection/filter state where both page modes use the same behavior.
- Keep paginated and unpaginated components as compatible entry points. Consolidate shared policy without forcing their distinct transport and pagination behavior into a single oversized component.
- Move search, sort, expanded rows, and selection to table-instance ownership where currently shared through `General.context`. Retain application-wide sidebar/orientation preferences at application scope.
- Keep existing page-runtime output publishing, dependency bindings, configured actions, bulk operations, drag ordering, nested/array records, and computed/lookup cells intact.
- Extract cohesive form/presentation units from the large add/edit component when those units are touched; avoid cosmetic file splitting that leaves the same coupling.

Acceptance: two tables on one page can search, sort, select, and expand independently. Both pagination modes preserve configured behavior. Meaningful mounted regression cases cover shared extraction and unusual data/action configurations.

## 4. Accessible shared controls

Affected areas: `TextInput.tsx`, `GenericButton.tsx`, table `IconButton.tsx`, login, shared confirmation dialogs, and call sites requiring names.

- Give fields unique stable IDs with optional caller-supplied IDs. Associate semantic labels, required state, help/error descriptions, and invalid state with the input.
- Add appropriate name/autocomplete attributes for login and registration. Expose mutation pending state so repeated submit clicks are disabled and progress is announced.
- Give password visibility, clear, increment/decrement, and table icon controls meaningful accessible names. Use keyboard-operable native controls and correct toggle/checkbox semantics.
- Give dialogs accessible titles and maintain focus containment, Escape dismissal, and return focus through the existing dialog library.
- Preserve existing layout and control sizing unless a change is required for usability.

Acceptance: login inputs are discoverable by label; IDs are unique across repeated forms; errors are announced; password visibility and numeric controls work with a keyboard; dialog focus behavior works. Desktop and 390px mobile layouts remain usable.

## 5. Recoverable failure handling

Affected areas: `src/index.tsx`, `src/App.tsx`, dynamic page/section rendering, storage helpers, `src/utils/api/axiosClient.ts`, and API wrappers.

- Add an outer render-error boundary around providers/application setup and useful page/section boundaries where an isolated failure should not remove the application shell. Keep existing visual/effect boundaries.
- Present understandable recovery actions. Reset page-level failure state when its page/scope changes; retries must not blindly replay mutations.
- Parse stored data defensively, validate expected shapes, and tolerate storage access failures with an in-memory fallback where persistence is optional.
- Standardize read cancellation and finite timeout behavior in legacy wrappers using the existing newer request layer as the model. Preserve endpoint-specific timeout overrides, cancellation classification, credential behavior, refresh rules, and record-key preservation.
- Distinguish authentication failures from temporary session/network failures so a temporary outage offers recovery instead of always pretending the session is invalid.
- Provide a small error-reporting integration point without selecting a paid service or emitting sensitive records/credentials. Disable development-only logging in production where appropriate.

Acceptance: malformed storage does not blank the application; a throwing section displays recovery UI; other sections and navigation remain usable; page/scope navigation resets the relevant boundary; failed reads terminate predictably; existing authentication and error-normalization regressions pass.

## 6. Bundle measurement and reduction

Affected areas: `vite.config.ts`, heavy component imports/registries, shared utility barrels, export/color-picker/visual feature loading, and build scripts.

- Capture a reproducible production build and module-composition report before changing chunk boundaries. The review observed roughly 484 KB entry JS, a 629 KB visual chunk, and a 1.13 MB shared chunk before gzip; remeasure the implementation baseline.
- Keep optional visual effects, export tooling, and specialized editors off routes that do not need them. Inspect eager registries, broad icon imports, and shared UI-library dependencies before choosing splits.
- Reduce unnecessary downloaded code; simply renaming/slicing an oversized chunk does not count as improvement. Manual chunk configuration is acceptable only with evidence that route loading improves and modules initialize correctly.
- Add automated budgets for initial-route JavaScript and significant optional features. Record raw and gzip sizes, and set explicit thresholds from the optimized measurements with documented headroom.

Acceptance: documented before/after initial-route dependency size and affected feature sizes; login does not eagerly fetch chart/3D/export features; visual, chart, and export smoke tests still work; CI fails when declared bundle budgets regress. No unmeasured load-time claims.

## 7. Documentation, dependencies, and browser CI

Affected areas: new `README.md`/focused architecture documentation, `package.json`, `yarn.lock`, `.gitignore`, browser test configuration/fixtures, and `.github/workflows/ci.yml`.

- Document the pinned Yarn version, Node requirements consistent with CI, install/start/build/test/lint commands, environment setup, backend requirements, tenant URLs, production SPA rewrites, and troubleshooting.
- Document schema/runtime boundaries, query scope and invalidation conventions, and how to add a component or effect without eager-loading every feature.
- Remove provably unused dependencies and obsolete Router v5 type declarations; retain actively used UI/animation/date packages until their consumers are deliberately migrated. Keep the lockfile reproducible with the declared package manager.
- Separate compiler-generated scratch files and build artifacts from source ownership. Preserve existing intentional repository artifacts; any tracked generated-file cleanup must be explicit in the change summary.
- Add repeatable browser tests with local API/socket fixtures for tenant switching, session expiry/recovery, reconnect/unmount behavior, accessibility-critical login controls, and representative table/visual rendering.
- Run these tests in CI using a pinned compatible browser runner and installed browser. Keep the tests independent of production credentials and unavailable external services.

Acceptance: a new developer can follow the README with only the stated prerequisites. Immutable dependency installation, lint, tests/typecheck, production build, bundle budgets, and browser smoke checks pass. Unit test output is interpreted correctly, distinguishing runtime execution from typecheck entries.

## Delivery sequence and verification

Implement in this order: scope/session isolation; socket lifecycle; defensive storage/read failures and boundaries; accessibility; shared table/form decomposition; measured bundle reduction/dependency cleanup; documentation and CI integration. Add targeted regression tests before behavior changes, and run the relevant checks after each coherent stage.

Final verification includes the full test/typecheck suite, lint, a production build, bundle budgets, and desktop/mobile browser tests. Existing lint warnings should be fixed where touched; remaining unrelated warnings must be counted and reported accurately. Live backend behavior that fixtures cannot establish must be listed as unverified, not silently called complete.

The work does not require a visual redesign, backend migration, new production services, or publication. The implementation plan will choose exact file boundaries and test cases after this design is approved.
