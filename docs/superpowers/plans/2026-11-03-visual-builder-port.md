# Visual Builder Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing ozmishow visual builder available in react-template, with visual blocks saved to and rendered from AutoTable project pages.

**Architecture:** Port the engine into `src/visual-engine`, with browser-native host adaptations. A separate management client and page adapter load full page definitions and merge visual-block updates. A lazy editor route and a separate lazy runtime renderer consume the same validated documents.

**Tech Stack:** Existing React 18, TypeScript, Vite, React Router, Axios, TanStack Query, Tailwind 3 and Vitest; retain compatible visual-engine animation/effect dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-visual-builder-port-design.md`

## Global Constraints

- Product changes are targeted to react-template. AutoTable Go and Tenant Panel are read for contracts and remain unchanged in this phase.
- ozmishow-nextjs is the reference source and remains unchanged.
- Do not add a runtime dependency on the sibling checkout or on an ozmishow server.
- Do not upgrade the application to React 19 as an incidental migration.
- No live data is modified as part of implementation verification. No deployment or publishing is requested.
- Live collection fetching, arbitrary API-source configuration, loading/error/empty designs, pagination and request-to-card binding workflows are the next phase.
- Preserve existing uncommitted user work. Record baseline failures before changes and do not stage unrelated hunks or regenerate tracked `dist` artifacts in place.
- Use the current source working tree (source revision `0606941` plus its current local engine changes), rather than assuming committed HEAD contains every relevant update.

## Review Focus

- Case-sensitive document keys survive both management and runtime JSON normalization (Task 2).
- A changed/deleted nested visual block is detected while unrelated page changes survive a save (Task 2).
- An expired management session never logs out an application user, and requests cannot follow navigation into another project (Task 2).
- Cancelled navigation and failed saves keep document/theme drafts, including during async save or target switching (Task 3).
- Visual styles/effects do not change ordinary application pages, and runtime rendering never imports the editor bundle (Tasks 1 and 4).

## File structure

- `src/visual-engine/**`: Ported model, operations, layout, components, effects, renderer, theme, templates, projects, fixtures and editor. Exclude Next-only `renderer/public/**` and website localization adapters not used by the engine.
- `src/visual-engine/host/ThemeProvider.tsx`: Local theme context consumed by the editor and site components; never mutates the host application's root element.
- `src/visual-engine/host/storage.ts`: Namespaced browser storage helper; context/explicit namespace plumbing for versions, templates and style kits.
- `public/visual-builder/**`: Required bundled image/font assets and their licenses.
- `src/visualBuilder/types.ts`: `ProjectScope`, `VisualBlockValue`, and editing target types.
- `src/visualBuilder/pageAdapter.ts`: Identification, traversal, conflict checks, envelope extraction and page payload merging.
- `src/visualBuilder/managementClient.ts`: Explicitly scoped cookie-based management requests and refresh handling.
- `src/visualBuilder/pageRepository.ts`: Load/list/save operations over the client and adapter.
- `src/visualBuilder/VisualBuilderPage.tsx`: Management gate and target-picker shell around the ported editor.
- `src/visualBuilder/useUnsavedChanges.ts`: Document/theme dirty tracking, browser unload and route/target navigation protection.
- `src/visualBuilder/VisualBlock.tsx`: Validated runtime rendering, scoped theme, error boundary and unconnected repeater state.
- `src/visualBuilder/visual-builder-host.css`: Host-only target selector, errors and responsive layout.
- `src/utils/api/normalizeResponse.ts`: Existing key conversion with a narrow authored visual-envelope exception.
- Modify `src/utils/api/axiosClient.ts`, `src/navigation/routes.tsx`, `src/navigation/dynamicPagesLoading.ts`, `src/components/DynamicPageSections.tsx`, package/lock files, Tailwind config and documentation only where required.

---

### Task 1: Portable editor and renderer

**Files:** `src/visual-engine/**`, `public/visual-builder/**`, `package.json`, `yarn.lock`, Tailwind config; `src/visualBuilder/engineCompatibility.test.ts`.

**Interfaces:** Preserve `ComponentDocument`, `migrateComponentDocument`, `VisualRenderer`, `VisualBuilder`, `SiteTheme`, the component/effect registries and `resolvedCollections`. Add optional `storageNamespace: string` and `onDirtyChange(dirty: boolean): void` host inputs to `VisualBuilder`; keep existing defaults for source compatibility. Dirty changes must include unsaved theme edits.

- [x] Record baseline lint/test/build results, dependency availability, current changed paths and source provenance. See `docs/verification/2026-11-03-visual-builder-port.md`; subsequent builds must call Vite directly to keep outputs outside tracked `dist`.
- [ ] Write `engineCompatibility.test.ts`: import the existing source fixture JSON, migrate versions 1/2, validate registered defaults, reject an unsafe URL and verify undo/redo document operations retain stable node IDs. Run it and confirm failure because the target engine is absent.
- [ ] Copy reachable engine modules/assets/licenses from the source working tree. Preserve the source's existing test assertions/fixtures where helpful; do not recreate the editor. Replace Next image delivery, theme aliases and host-only imports with browser adapters. Remove the website publication action and its dialog import/call sites from the port UI.
- [ ] Resolve/install required dependencies compatible with React 18; retain deferred effect imports. Preserve authored renderer classes and scope CSS/theme behavior. Keep Tailwind's host configuration intact, adding only required tokens or scoped generated renderer utilities.
- [ ] Namespace local content storage using explicit host scope; test two scopes with the same document ID cannot read each other's templates/versions/style kits. Browser-wide inspector/preview preferences can remain shared. Make storage errors recoverable.
- [ ] Run the compatibility/storage tests and TypeScript. Resolve portability issues; confirm the target engine has no `next/*`, absolute sibling imports or Next API URLs in reachable code.
- [ ] Review and checkpoint only task-owned changes, without staging pre-existing user hunks.

### Task 2: Lossless page persistence and management client

**Files:** `src/visualBuilder/{types,pageAdapter,managementClient,pageRepository}.ts`, matching `.test.ts` files; `src/utils/api/{normalizeResponse,axiosClient}.ts` and normalization tests.

**Interfaces:**

- `ProjectScope = { tenant: string; project: string }`.
- `VisualBlockValue = { document: ComponentDocument; theme?: SiteTheme }`.
- `listVisualBlocks(page: PageModel): ComponentBlock[]` traverses sections, both grid representations, page tabs and component tab panels.
- `readVisualBlock(component: ComponentBlock): VisualBlockValue` migrates/validates; it never replaces invalid content with a blank document.
- `mergeVisualBlock(latest: PageModel, target: { componentId: string; baseline?: ComponentBlock; isNew: boolean }, value: VisualBlockValue): PageModel` returns a new full page or throws a typed conflict.
- `createManagementClient(scope: ProjectScope, baseURL?: string)` captures a fixed scope and exposes credentialed `get` and `patch` methods without application-session side effects.
- `createPageRepository(scope: ProjectScope)` exposes `list(): Promise<PageModel[]>`, `load(id: string): Promise<PageModel>` and `save({pageId, target, value}): Promise<PageModel>`.

- [ ] Write failing normalization tests: preserve every key beneath `props.visualBuilder`, including `--custom-token`, an effect key with hyphens, and a binding path containing `ProductSKU`; continue normalizing ordinary legacy PascalCase API metadata. Test the existing runtime Axios interceptor with a real in-memory HTTP adapter.
- [ ] Implement the narrow normalization exception in a shared helper used by runtime and management clients; keep all current application auth/refresh behavior intact.
- [ ] Write failing page-adapter tests for nested block traversal, full-page metadata preservation, ID stripping from outgoing payloads, a new appended visual section, raw/data/data.data envelopes, changed/deleted/duplicate target IDs, group-only pages and invalid documents.
- [ ] Implement adapter functions. Compare the target against its loaded baseline before replacing it, preserve untouched latest content, and reject ambiguous IDs. A new section gets a stable unique ID and an order after the last existing section.
- [ ] Write failing management-client tests using real Axios adapters: credentialed scope paths; concurrent 401s share one project refresh; retry happens once; 403 never refreshes; different projects refresh independently; navigation does not change request scope; no application storage/logout effects occur.
- [ ] Implement the management client and repository. Use `/{tenant}/{project}/admin/page/` and `.../:id`; refresh via `/{tenant}/{project}/tenant-auth/refresh`. Read the latest full page before merge/PATCH, omit database IDs, then reload the canonical page. Preserve drafts by propagating failures instead of swallowing them.
- [ ] Run these tests and TypeScript; review/checkpoint only task-owned changes.

### Task 3: Project editor route, target selection and safe drafts

**Files:** `src/visualBuilder/{VisualBuilderPage.tsx,useUnsavedChanges.ts,visual-builder-host.css}`, host state tests; `src/navigation/{routes.tsx,dynamicPagesLoading.ts,dynamicPagesLoading.test.ts}`; ported editor host callbacks.

**Interfaces:** Lazy default `VisualBuilderPage` at `/t/:tenant/p/:project/_builder`, with `?page=<id>&component=<id>` for stable deep links. Mount the engine in external storage mode, using `storageNamespace` derived from captured project and block IDs. Repository operations from Task 2 are the only page persistence path.

- [ ] Write failing route/state tests: editor bypasses application dynamic-page bootstrap and application auth redirects; ordinary routes keep existing behavior; invalid/deleted query targets are reported; a `_builder` page-slug collision is detected; group pages cannot be selected.
- [ ] Add the independent lazy management editor route before the application guard. Do not import the editor module from runtime bootstrap. Read page definitions through the management repository and show pending/error/empty/permission states.
- [ ] Add accessible page/block selectors, Add visual section, Reload, view-page link and optional validated `VITE_TENANT_PANEL_URL` link. Missing management cookies explain signing in and opening this project in Tenant Panel, with Retry. Existing blocks are selected by stable IDs; new blocks remain local until Save succeeds.
- [ ] Connect document/theme saves to the repository and refresh project runtime page queries only on success. Serialize saves for one target; do not let a slow completion update a new target. Preserve unsaved document/theme drafts across save errors. Only clear dirty state after canonical saved data is confirmed.
- [ ] Test draft state transitions: failed save stays dirty, theme-only edits count as dirty, cancel switching retains drafts, save in flight prevents unsafe switching, confirmed discard resets the target. Add beforeunload and in-app route/history protection using APIs supported by the installed router; verify browser behavior in Task 5.
- [ ] Run host/route tests and TypeScript; review/checkpoint only task-owned changes.

### Task 4: Runtime visual blocks alongside existing components

**Files:** `src/visualBuilder/VisualBlock.tsx`, runtime tests, `src/components/DynamicPageSections.tsx`.

**Interfaces:** `VisualBlock({component}: {component: ComponentBlock})` consumes `props.visualBuilder`, shares Task 1's validation/renderer/theme, and never imports `VisualBuilder` or editor modules. Lazy-load it only for custom visual blocks.

- [ ] Write failing runtime tests: valid visual heading/card/image renders; migrated legacy document renders; invalid JSON is contained in a local error; unrelated custom blocks retain the existing fallback; missing repeater collection shows an unconnected-data state and issues no request.
- [ ] Implement the lazy runtime branch in the active `DynamicPageSections` path. Keep tables/forms/charts/tabs and component authorization behavior intact. Add a renderer error boundary so one bad visual block does not crash its surrounding page.
- [ ] Render with scoped theme and local theme switching; add the explicit unconnected repeater indication while retaining `resolvedCollections` as the future input boundary.
- [ ] Verify static rendering/state tests and TypeScript. Inspect a production bundle graph to confirm ordinary/login routes and visual runtime rendering do not pull in the editor chunk. Review/checkpoint only task-owned changes.

### Task 5: Browser acceptance, documentation and final review

**Files:** `scripts/verify-visual-builder.mjs` (or equivalent browser fixture), `docs/visual-builder-port.md`, `README.md`, `.env.example`, `docs/verification/2026-11-03-visual-builder-port.md`.

**Interfaces:** Browser verification intercepts AutoTable requests with a controlled in-memory page fixture. It never modifies live project data. Reuse the installed browser automation tools following their skill.

- [ ] Exercise desktop editing: management list/load, add a section, edit a heading and styles, undo/redo, drag a library component, change breakpoints, save, reload and render the saved page alongside a pre-existing component. Assert the saved payload preserves unrelated content and authored keys.
- [ ] Exercise document JSON import/export, local versions/template recovery, theme saves, a representative lazy effect, native images, a keyboard editing path, unsaved target/route/back navigation and failed-save retry. Capture desktop and narrow-screen evidence; check CSS does not change ordinary host components.
- [ ] Exercise management 401/refresh/403, empty pages, invalid content, reserved route collisions and two tenant/project scopes using intercepted requests. Confirm application authentication hints are untouched.
- [ ] Run `yarn lint`, `yarn test` and a production build with an output directory outside tracked `dist`. Inspect the bundle graph and browser console. Compare failures to Task 1's baseline and fix introduced regressions.
- [ ] Document editor setup/URL, Tenant Panel session prerequisite, CORS/cookie host requirements, local-only libraries/history, supported schema/envelope, example-template caveats, deliberate website-publication omission and the API-card follow-up boundary. Record exact source revision and adapted modules.
- [ ] Request a fresh whole-change review; address material findings and repeat affected checks. Verify the final diff preserves user work. Do not deploy or modify live data.
- [ ] Mark plan steps with actual evidence and report what changed, how to open it, verification results and any remaining limitations.

## Self-review

All approved spec sections map to Tasks 1–5. Management scope/normalization and
safe full-page updates have separate adapter tests; draft behavior and route
bootstrap have host tests; rendering and bundle isolation have runtime/browser
checks. The five Review Focus conditions each have an owning task and an
explicit verification step. The first-version page-selection and future-data
boundaries remain as approved. Native execution is recommended because the port
and host adaptations share imports, types and CSS across the tasks; a single
implementer can resolve those interfaces without concurrent edits to the same
working tree, then obtain an independent final review.
