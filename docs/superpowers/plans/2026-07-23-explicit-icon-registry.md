# Explicit Icon Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove full `react-icons` namespace imports from the initial bundle while preserving all locally required icon-resolution behavior.

**Architecture:** `menuIcons.tsx` will use named icon imports and module-level menu and component registries. Both public resolver functions remain synchronous and retain their existing signatures and fallback behavior.

**Tech Stack:** React 18, TypeScript 5, react-icons 5, Vitest 2, Vite 5.

## Global Constraints

- Do not change backend schemas or resolver signatures.
- Every icon used by repository source must remain supported.
- Unsupported and empty icon names must resolve to `MdSpaceDashboard`.
- Do not optimize unrelated dependencies or fix repository-wide lint debt.

---

### Task 1: Lock icon resolver behavior with tests

**Files:**
- Create: `src/utils/menuIcons.test.ts`

**Interfaces:**
- Consumes: `getIconByName(name: string): IconType` and `getMenuIcon(name: string): IconType`.
- Produces: regression coverage for default action icons, representative menu icons, and fallback behavior.

- [ ] Write `src/utils/menuIcons.test.ts` with identity assertions for `FiCheck`, `FiEdit`, `HiOutlineTrash`, `MdSportsEsports`, `MdStorefront`, `MdShoppingBag`, and `MdSpaceDashboard`.
- [ ] Run `yarn test src/utils/menuIcons.test.ts` and confirm the test passes against existing behavior, establishing compatibility coverage before refactoring.
- [ ] Commit the compatibility test as `test: cover dynamic icon resolution`.

### Task 2: Replace wildcard icon packs with an explicit registry

**Files:**
- Modify: `src/utils/menuIcons.tsx`

**Interfaces:**
- Consumes: named exports from `react-icons/fi`, `react-icons/hi`, and `react-icons/md`.
- Produces: unchanged `getMenuIcon` and `getIconByName` public functions.

- [ ] Replace `IconType` with a type-only import.
- [ ] Delete all 20 `import * as ...Icons` namespace imports.
- [ ] Add `FiCheck`, `FiEdit`, and `HiOutlineTrash` as named imports.
- [ ] Keep the existing named Material icon imports.
- [ ] Hoist the menu-name map to a module-level `Record<string, IconType>`.
- [ ] Add a module-level `iconRegistry` containing every named Material icon plus the three action icons.
- [ ] Simplify both resolver functions to registry lookups with `MdSpaceDashboard` fallback.
- [ ] Run `yarn test src/utils/menuIcons.test.ts`, then `yarn test`.
- [ ] Run ESLint on `src/utils/menuIcons.tsx` and `src/utils/menuIcons.test.ts`.
- [ ] Commit as `perf: replace wildcard icon imports`.

### Task 3: Measure and verify the bundle reduction

**Files:**
- Verify only.

**Interfaces:**
- Consumes: `yarn build`, `yarn analyze`, and the current 31,306,503-byte analyzed entry baseline.
- Produces: final raw, gzip, and Brotli measurements.

- [ ] Run `yarn build` and confirm production compilation succeeds.
- [ ] Run `yarn analyze` and confirm `bundle-report.html` is generated.
- [ ] Parse the report and confirm no full `react-icons/*/index.mjs` modules remain in the initial entry.
- [ ] Compare initial-entry raw, gzip, and Brotli sizes with the recorded baseline.
- [ ] Restore tracked `dist` and `.yarn/install-state.gz` build artifacts.
- [ ] Confirm `git status --short` is clean and `git diff --check` passes.
