# Form Surface and Input Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic polished form-area panels and full-model form-field configuration in Tenant Panel.

**Architecture:** Keep runtime presentation in the existing dynamic form components. Add a focused Tenant Panel field editor component that edits `FormFieldConfig` and receives schema containers, while `FormComponentEditor` continues to own form layout and object-list configuration.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite, React Icons.

---

### Task 1: Runtime Panels

**Files:**
- Modify: `src/components/forms/DynamicForm.tsx`
- Modify: `src/components/forms/DynamicFormObjectList.tsx`
- Modify: `src/components/forms/DynamicFormField.tsx`

- [ ] Wrap each populated area in a bordered white panel with a header, body, and action footer.
- [ ] Remove the nested object-list card treatment and use divided rows.
- [ ] Disable detached field clear controls.
- [ ] Run `yarn build` and focused ESLint.

### Task 2: Full Form Field Editor

**Files:**
- Create: `src/components/PageDesigner/FormFieldEditor.tsx` in Tenant Panel
- Modify: `src/components/PageDesigner/FormComponentEditor.tsx` in Tenant Panel
- Modify: `src/components/PageDesigner/PageDesigner.tsx` in Tenant Panel

- [ ] Build a focused field editor for all shared `TableActionFormFieldConfig` properties plus area, width, and order.
- [ ] Add static option editing and schema source selectors using available containers.
- [ ] Add default, validation, conditional, number, multiple, and invalidation controls.
- [ ] Replace the compact form field row and pass containers from Page Designer.
- [ ] Run `yarn build` and focused ESLint.

### Task 3: Visual Verification

**Files:**
- Verify only; do not commit generated output.

- [ ] Run the runtime and Tenant Panel development servers.
- [ ] Inspect desktop and mobile layouts with Playwright.
- [ ] Confirm area boundaries, object-list hierarchy, source controls, and no overlapping text or controls.
- [ ] Keep all implementation changes uncommitted for user review.
