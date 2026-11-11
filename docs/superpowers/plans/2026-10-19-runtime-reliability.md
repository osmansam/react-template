# React Template Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix session retry correctness, restore lint health, and reduce startup JavaScript without changing backend contracts.

**Architecture:** Keep the public axiosClient singleton, add scoped request metadata and per-project refresh coordination inside the API layer, and test real interceptor behavior through an Axios adapter. Use the existing route Suspense boundary to defer the dynamic renderer. Replace unsafe types and correct hook dependency ownership locally.

**Tech Stack:** React 18, TypeScript, Axios, TanStack Query, Vite 5, Vitest 2, ESLint 8.

**Spec:** `docs/superpowers/specs/2026-10-19-runtime-reliability.md`

## Global Constraints

- The user explicitly authorized implementation without review/approval pauses.
- Work in the existing clean feature checkout; no commits, pushes, deployment, or changes to sibling repos are required.
- Keep existing cookie auth endpoints, response normalization, page schemas and route semantics compatible.
- No disabling lint rules to hide errors. Add behavior tests for auth changes; existing coverage and TypeScript verify type-only cleanup.

## Review Focus

- Delayed 401 responses or refresh failures must not create refresh storms or endless retries.
- Navigation to a second project while requests are pending must not redirect the first project's retry or refresh.
- Auth POST failures must retain original errors and request payloads.
- Lazy page rendering must preserve router/query/runtime context and existing component tests.
- Type cleanup must preserve null/empty/malformed workflow-data handling and dynamic action configuration.

### Task 1: Scoped refresh recovery

**Files:** Modify `src/utils/api/axiosClient.ts`; create `src/utils/api/axiosClient.test.ts`.

**Interfaces:** Preserve `axiosClient` and `ACCESS_TOKEN` exports. Use internal typed request metadata; callers continue calling axiosClient.get/post unchanged.

- [x] Add real-interceptor regression tests for duplicate prefixes, concurrent refresh, project navigation, auth failure exclusion, failed refresh, retried 401, and normalization.
- [x] Run `yarn test src/utils/api/axiosClient.test.ts` and verify the intended regression failures.
- [x] Implement project-pinned request scoping and one in-flight refresh per project; preserve request bodies and one-retry bound.
- [x] Run focused tests followed by `yarn test`; expected: all tests and type checks pass.

### Task 2: Lint and hook reliability

**Files:** Baseline ESLint findings in `src/utils/api/container.ts`, `src/utils/dynamicQueryKeys.ts`, form display components, table config tests, and hook dependencies in relation/table/select components.

**Interfaces:** Preserve exported API/config types and current rendering/mutation behavior.

- [x] Read each linted expression and its consumers; replace unsafe any and unused bindings with correct configuration/unknown/error types.
- [x] Stabilize hook inputs and include complete callback dependencies where closures read changing configuration or mutation state.
- [x] Run `yarn lint` and `yarn test`; expected: zero lint errors, all tests/type checks pass. Report any remaining development-only warnings accurately.

### Task 3: Delivery and maintainability

**Files:** `src/hooks/useDynamicPages.tsx`, `README.md`, `.github/workflows/ci.yml`; additional component boundaries only if bundle evidence warrants them.

**Interfaces:** DynamicRoute.element and DynamicPageRenderer named export remain compatible; React Router's Suspense provides loading UI.

- [x] Inspect the build graph and defer the renderer at the dynamic-route boundary.
- [x] Run `yarn build`; expected: successful build with a smaller entry bundle and separate runtime chunk.
- [x] Document project URLs, environment setup, auth refresh and local checks. Add CI for lint/test/build using the declared Yarn version.
- [x] Run final lint, full suite and production build. Restore only the generated tracked `dist/index.html` to its original tracked contents.
- [x] Obtain one independent review of the working diff, address substantive findings, and record final verification.
