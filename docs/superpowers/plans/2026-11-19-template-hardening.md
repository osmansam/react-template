# React Template Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Complete all seven accepted review improvements while preserving existing schema-driven functionality.

**Architecture:** Incrementally repair scope and connection ownership, then extract cohesive shared UI behavior. Keep the existing runtime and transport contracts and prove compatibility using mounted/unit and browser regressions. Measure actual emitted dependencies before optimizing bundles.

**Tech Stack:** React 18, TypeScript, Vite 5, TanStack Query 5, Vitest 2, Yarn 4; compatible Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-11-19-template-hardening-design.md` (approved by user: “ok move on”).

## Global Constraints

- Keep React 18, Vite, React Query, existing routes, backend endpoints, and saved page/visual schemas.
- Preserve existing public component props unless adding optional accessibility props.
- Maintain existing paging, filtering, selection, nested-row, array-source, form, and action behavior.
- No deployment, backend changes, account operations, or production data mutations are included.
- Changes remain available for local review; publishing is outside this work.
- Dependency cleanup will follow actual usage and build evidence; it will not replace all UI libraries or upgrade every package.
- Work in the current non-main feature checkout; do not create branches or commits unless explicitly requested later. This execution ruling avoids changes to read-only git metadata and preserves reviewable working files. Use task-specific diff files in place of commit ranges.

## Review Focus

- Same-tab project or user changes while a query, mutation, refresh, or socket event remains pending: preserve its original scope and never update the new actor's data.
- Strict Mode and duplicate visibility/close events: one current socket/retry; no work after cleanup.
- Malformed/unavailable storage and transient session failures: render recoverable UI without exposing the wrong actor or forcing a false logout.
- Repeated form/table instances: unique accessible IDs, independent search/sort/selection, and intact outputs/actions.
- Lazy feature initialization in the production build: real route byte reduction, correct chart/visual/export behavior, and enforced budgets.

---

### Task 1: Project and actor isolation

**Files:** Create a shared route-scope module/tests in `src/utils/`; modify `src/hooks/useTenantProject.ts`, `src/context/User.context.tsx`, `src/App.tsx` as necessary, `src/utils/projectSessionStorage.ts`, `src/utils/api/{auth,page,factory,index,axiosClient}.ts`, `src/utils/dynamic.ts`, `src/utils/dynamicQueryKeys.ts`, affected cache consumers/invalidation and targeted tests.

**Interfaces:** Consume current route and session metadata. Produce shared `ProjectScope` and `parseProjectScope(pathname: string): ProjectScope | null`, stable scope-aware hook values, project/identity-owned cache behavior, and pinned transport scope. Preserve API wrapper signatures by adding optional config/scope options only. Document exact chosen helpers for later tasks. Keep existing hook exports compatible.

- [x] Write mounted regressions for Alpha-to-Beta login configuration/pages, same-schema records, user replacement, malformed stored actor, and pending old-scope requests; test strict parsing/legacy routes and preservation of Axios retry scope.
- [x] Run targeted tests and capture expected failures before implementation.
- [x] Implement shared parsing, scope ownership, scoped cache read/write/rollback/invalidation, safe actor reset, and pinned requests. Avoid indiscriminate global invalidation; update all consumers of altered keys.
- [x] Run targeted tests, existing API/dynamic/query tests, and TypeScript; require all pass. Provide report with RED/GREEN evidence and remaining interfaces.

### Task 2: Socket lifecycle

**Files:** Modify `src/hooks/useWebSocket.ts`, `src/hooks/useWebSocket.test.ts`, add mounted lifecycle tests; adjust App/affected mounted tests only if required.

**Interfaces:** Consume Task 1 route scope/parser and query invalidation contracts. Preserve `useWebSocket()` and existing event/URL protocol; optional explicit connection inputs are permitted while retaining compatible defaults. Preserve `handleWebSocketVisibilityChange` export.

- [x] Add mounted fake-socket/timer tests for Strict Mode reconnect, pending retry after unmount, scope switch, repeated visibility changes, stale events, and invalid API URLs.
- [x] Watch these regressions fail for the existing lifecycle defects.
- [x] Use effect-local disposal/socket/timer ownership, stable route-scope dependencies, timer cancellation and scoped invalidation. Preserve bounded reconnect and public-socket contract.
- [x] Run lifecycle tests plus visual collection invalidation tests and TypeScript; require pass, no reconnect after cleanup or duplicate sockets.

### Task 3: Recoverable failures

**Files:** Add `src/common/RuntimeErrorBoundary.tsx` and tests; modify `src/index.tsx`, `src/components/DynamicPageRenderer.tsx`, `src/components/DynamicPageSections.tsx`, storage utilities/context, `src/navigation/PrivateRoutes.tsx`, `src/hooks/useAuth.ts`, and API read defaults/wrappers as needed.

**Interfaces:** Boundary accepts children, reset identity and optional reporting callback; reports only sanitized error metadata by default. Storage helpers expose safe read/write/remove while keeping existing callers working. Ordinary reads have a finite default timeout and support AbortSignal without overriding explicit endpoint settings.

- [x] Add behavioral tests that fail for corrupt/throwing storage, a throwing section, boundary reset/retry, cancellation/timeouts, and transient session failure versus an actual 401/unauthenticated response.
- [x] Implement outer/provider and section-level boundaries with scoped reset, safe storage fallback, read defaults/cancellation, and session recovery UI. Never auto-replay mutations.
- [x] Run boundary/storage/auth/transport suites and TypeScript; require correct recoverability and unchanged refresh/key-normalization behavior.

### Task 4: Accessible inputs, actions and dialogs

**Files:** Modify `src/components/panelComponents/FormElements/{TextInput,GenericButton,ConfirmationDialog}.tsx`, `src/common/ConfirmationDialog.tsx`, table `IconButton.tsx`, `src/pages/Login.tsx`, auth mutation result exposure and relevant call sites; add mounted tests.

**Interfaces:** Add optional input `id`, `name`, `autoComplete`, help text and standard ARIA associations while preserving current props. Auth hooks may expose pending state in addition to existing methods. IconButton accepts optional accessible label; update icon-only callers with meaningful names.

- [x] First add failing tests for label lookup/unique IDs, error association, password toggle name/state, native keyboard numeric controls, login autocomplete/pending submit, and dialog accessible title/focus dismissal.
- [x] Implement semantics with native controls/useId and existing Headless UI focus handling; maintain current layout, form value behavior and optional props compatibility.
- [x] Run mounted controls/auth/dialog tests, TypeScript and lint; require pass. Browser desktop/mobile verification belongs to Task 7.

### Task 5: Table/form decomposition and instance ownership

**Files:** Modify `GenericPaginatedPage.tsx`, `GenericUnpaginatedPage.tsx`, `GenericTable.tsx`, `GenericAddEditPanel.tsx`; create cohesive table/action/form hooks/helpers/components alongside current components; relevant General context consumers and mounted tests.

**Interfaces:** Keep existing page entry points/props, bindings, output publishers and data-source contracts. Extract shared action form preparation, column/cell or row-action presentation and isolate search/sort/expanded/selection state per table. Retain application-wide sidebar/orientation preferences.

- [x] Add mounted regressions showing two tables interfere today: search/sort/expand/select one and assert the other unchanged. Add compatibility cases for both pagination modes, action constants/dependent selection, nested/array records and output publishing where missing.
- [x] Extract actual shared policies into focused units used by both wrappers, plus cohesive add/edit presentation units. Preserve distinct paging/transport behavior. Avoid merely moving one giant component to another file.
- [x] Run table/form/runtime/action suites and TypeScript/lint; require pass and document removed duplication/state coupling.

### Task 6: Measured bundles and dependency hygiene

**Files:** Modify `vite.config.ts`, heavy import paths/registries/components as evidence warrants, `package.json`, `yarn.lock`; add `scripts/check-bundle-budget.mjs` and versioned budget/baseline metadata, with meaningful script tests.

**Interfaces:** Build emits manifest/analysis sufficient to resolve initial and named feature transitive dependency bytes. Budget checker exits nonzero for a regression and prints raw/gzip figures. Keep lazy chart/visual/export public imports compatible.

- [x] Capture production baseline composition and initial-route/feature raw and gzip totals before changes; use build output outside tracked dist where feasible.
- [x] Test checker with a known oversized fixture and verify failure; set budgets to measured optimized totals with documented headroom after optimization.
- [x] Optimize demonstrated eager dependencies/broad barrels/registries, preserving initialization. Remove only proven-unused packages and obsolete Router v5 declarations; update lockfile using pinned Yarn. Do not perform broad version upgrades.
- [x] Build/analyze again; compare real route graphs, require initial-route reduction and preserved features. Run checker both passing output and forced regression. Record measurements for documentation.

### Task 7: Browser CI and onboarding

**Files:** Add Playwright config and browser tests/API/socket fixtures under `tests/`; update `package.json`, `yarn.lock`, `.github/workflows/ci.yml`, README and focused runtime/bundle documentation; correct generated scratch tracking/ignores with explicit reporting.

**Interfaces:** `yarn test:e2e` runs deterministic Chromium tests against a local production preview with no external backend; `yarn check:bundle` verifies budgets. README documents all exact commands and runtime conventions.

- [x] Add behavioral browser tests for same-tab tenant switching; session expiry/recovery; reconnect/unmount; input labels/keyboard; two tables and a visual feature at desktop/390px mobile. Include chart/export smoke where functionality can be exercised locally.
- [x] Run against the fixed production build; verify fixture assertions fail when old reproduced defects are reintroduced in an isolated patch/probe, without retaining broken code.
- [x] Add pinned compatible browser runner and CI browser installation, build/budgets/test steps. Keep immutable installation reproducible and tests independent of production credentials.
- [x] Document setup, backend requirements, tenant URLs, SPA rewrites, runtime architecture, component/effect extension, scope/invalidation, performance comparison and troubleshooting. Exclude compiler scratch artifacts from tracked source; preserve intentional assets.
- [x] Run immutable install, full runtime/typecheck suite, lint, build, budgets, desktop/mobile browser tests, and diff checks. Capture all outcomes and disclose live-backend-only limitations.

## Final review

- [x] Review all changed files independently against the approved spec and task evidence; fix important findings and rerun affected checks.
- [x] Summarize actual changes, validation, remaining warnings/limitations, and local review entry points. Do not commit, merge, push or deploy.

## Completion status

Implemented and verified on 2026-11-21 (working tree only; nothing committed, merged, pushed, or deployed).

| Check | Result |
| --- | --- |
| `yarn test` | 270 files, 1,525 tests passed, no type errors, no unhandled errors |
| `yarn test:coverage` | 55.72% statements, 76.17% branches, 61.23% functions, 55.72% lines — thresholds pass, including the visual-engine floor |
| `yarn lint` | 0 errors, 0 warnings |
| `yarn build` | passed; deferred chart/visual/export chunks remain intentional |
| `yarn check:bundle` | entry 518,176 / 173,111 gzip; login 533,103 / 179,279; tables 1,670,962 / 483,989; visual 2,300,159 / 644,511; spreadsheet-export 2,168,823 / 646,377 — all within budget |
| `yarn test:bundle` | checker regression tests pass |
| `yarn test:e2e` | 10/10 passed (desktop 1280px and mobile 390px) |

### Quality follow-through

- The table/form layer is decomposed: `GenericPaginatedPage` 530 lines, `GenericUnpaginatedPage` 536, `GenericTable` 388, `GenericAddEditPanel` 253. Policy lives in `paginatedPage/`, `unpaginatedPage/`, `genericTable/`, and `addEditPanel/`.
- Coverage is enforced in CI through `yarn test:coverage`; thresholds are a ratchet in `vitest.config.ts` and currently represent the measured floor.
- All lint warnings are resolved. Intentionally discarded values use the `_` convention; one-time React Bits scene creation and stable uniform objects are documented at the call sites.
- Session revision participates in the application cache-reset key, so a batched same-actor sign-out/sign-in retires cached data even when tenant, actor, and signed-in state are unchanged.
- Both confirmation dialog components give the Headless UI `Dialog` root a full-viewport fixed box. Their overlay and panel children are fixed-position, so the `role="dialog"` element previously had zero height and was treated as hidden by assistive/automation visibility checks.

Remaining non-blocking items: Vite chunk-size warnings for intentionally deferred heavy feature chunks; `launch-editor` (Windows-only Vite dev dependency) and Vitest UI audit findings; live OAuth/cookie ordering and backend authorization still require validation against the real backend.
