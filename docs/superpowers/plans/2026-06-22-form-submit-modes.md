# Form Submit Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add create, bulk-create, and workflow submit modes with exact payload previews.

**Architecture:** Extend the persisted form submit contract in all three repositories. Keep payload construction in pure form-config helpers, dispatch through existing dynamic mutations, and expose conditional mode controls in Tenant Panel.

**Tech Stack:** Go, React, TypeScript, TanStack Query, Tailwind CSS, Vite.

---

### Task 1: Backend Contract

**Files:**
- Modify: `models/pageModel.go` in Autotable Go
- Modify: `models/frontendValidation.go` in Autotable Go
- Modify: `models/models_test.go` in Autotable Go

- [ ] Add failing model/validation cases for supported and incomplete submit configurations.
- [ ] Add submit mode, bulk object-list key, and workflow fields.
- [ ] Validate mode-specific required values and rerun `go test ./...`.

### Task 2: Runtime Payloads

**Files:**
- Modify: `src/types/page.ts`
- Modify: `src/utils/formConfig.ts`
- Modify: `src/components/forms/DynamicForm.tsx`

- [ ] Add submit-mode TypeScript contracts.
- [ ] Add pure sample-payload and request-preview builders matching runtime omission rules.
- [ ] Dispatch create, create-many, or workflow mutations from the form submit handler.
- [ ] Preserve create as the default for existing forms.

### Task 3: Tenant Panel Controls

**Files:**
- Modify: `src/types/page.ts` in Tenant Panel
- Modify: `src/utils/api/page.ts` in Tenant Panel
- Modify: `src/components/PageDesigner/FormComponentEditor.tsx` in Tenant Panel
- Modify: `src/components/PageDesigner/PageDesigner.tsx` in Tenant Panel

- [ ] Pass workflow options into the form editor.
- [ ] Add mode, list, and workflow selectors with mode-specific visibility.
- [ ] Show an exact read-only JSON request preview.
- [ ] Normalize submit metadata during page save.

### Task 4: Verification

- [ ] Run full Go tests.
- [ ] Run both frontend production builds and focused ESLint.
- [ ] Verify all submit modes and previews in a browser harness.
- [ ] Remove harness/build artifacts and retain uncommitted source changes.
