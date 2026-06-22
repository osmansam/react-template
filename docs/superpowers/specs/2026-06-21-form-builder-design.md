# Tenant-Driven Form Builder Design

## Context

The current runtime can render backend-driven pages, tables, charts, tabs, and table actions. Table actions already use action field metadata to create modal forms through `GenericAddEditPanel`. The missing capability is a tenantPanel-configurable form component that can arrange fields in custom areas, run local form actions, and manage embedded object lists like a cart before the parent record is saved.

The target UI is a two-panel sale form:

- A main form collects sale fields such as date, product, quantity, and note.
- A local action adds the selected values into a cart/list.
- The list renders on the side and supports edit, remove, increment, and decrement actions.
- Editing a list item loads the item back into the source form fields.
- Final save persists one parent record with an embedded object array.

## Goals

- Add a first-class `form` page component that can be created in tenantPanel PageDesigner.
- Reuse the existing table action/form field metadata style wherever possible.
- Support field placement in `top`, `main`, `bottom`, `left`, and `right` areas.
- Support embedded object list sections inside a form.
- Support local object list actions: add, edit, remove, increment, and decrement.
- Keep existing `GenericAddEditPanel` table create/edit/action behavior working.
- Keep persisted page schemas backward-compatible.

## Non-Goals

- The first version will not save object list items as separate child records.
- The first version will not create a visual drag-and-drop designer.
- The first version will not replace all table action editors with a new shared UI.
- The first version will not support arbitrary custom React components inside tenant form layouts.

## Data Model

`autotable-Go` should add a `FormComponentConfig` to page component metadata and attach it to `ComponentBlock` as `form`.

```ts
interface FormComponentConfig {
  title?: string;
  schemaName: string;
  layout?: FormLayoutConfig;
  fields?: FormFieldConfig[];
  objectLists?: FormObjectListConfig[];
  actions?: FormActionConfig[];
  submit?: FormSubmitConfig;
}
```

`FormLayoutConfig` controls the overall layout shell.

```ts
interface FormLayoutConfig {
  variant?: "modal" | "page";
  columns?: 1 | 2 | 3;
  areas?: FormAreaConfig[];
}

interface FormAreaConfig {
  key: "top" | "main" | "bottom" | "left" | "right";
  title?: string;
  order?: number;
  className?: string;
}
```

`FormFieldConfig` extends the existing action form field behavior with layout-specific metadata.

```ts
interface FormFieldConfig extends TableActionFormFieldConfig {
  area?: "top" | "main" | "bottom" | "left" | "right";
  order?: number;
  width?: "full" | "half" | "third";
}
```

`FormObjectListConfig` describes embedded object-array fields such as `items`.

```ts
interface FormObjectListConfig {
  key: string;
  title?: string;
  area?: "top" | "main" | "bottom" | "left" | "right";
  source: "embedded";
  itemFields: string[];
  addAction?: FormObjectAddActionConfig;
  display?: FormObjectListDisplayConfig;
  actions?: FormObjectActionConfig[];
}
```

`FormObjectListDisplayConfig` describes how each embedded object appears in the list.

```ts
interface FormObjectListDisplayConfig {
  primaryField?: string;
  primaryTemplate?: string;
  secondaryField?: string;
  secondaryTemplate?: string;
  imageField?: string;
}
```

`FormObjectActionConfig` supports a small set of local mutations.

```ts
type FormObjectActionKind =
  | "editObject"
  | "removeObject"
  | "increment"
  | "decrement";

interface FormObjectActionConfig {
  kind: FormObjectActionKind;
  label?: string;
  icon?: string;
  field?: string;
  min?: number;
  max?: number;
  step?: number;
}
```

`FormActionConfig` covers actions attached to the form itself. The first version needs a local object-add action and a submit action. `FormObjectAddActionConfig` uses the same shape and is stored on an object list when the add button should appear next to that list's source fields.

```ts
type FormActionKind = "addObject" | "submit";

interface FormActionConfig {
  kind: FormActionKind;
  label?: string;
  buttonName?: string;
  targetObjectList?: string;
  sourceFields?: string[];
  clearSourceFields?: string[];
  preserveSourceFields?: string[];
  enabled?: boolean;
  order?: number;
}

type FormObjectAddActionConfig = FormActionConfig & {
  kind: "addObject";
  targetObjectList: string;
};
```

## Runtime Behavior

`react-template` should add a runtime form renderer for page components, while keeping `GenericAddEditPanel` available for modal table forms.

The renderer should:

- Build initial form state from schema fields and configured form fields.
- Render fields by area and order.
- Use the same input rendering behavior as `GenericAddEditPanel`.
- Use the same validation/conversion behavior as `GenericAddEditPanel`.
- Render object lists from values stored in `formElements[objectList.key]`.
- Add object list items by copying configured `sourceFields` from `formElements`.
- Track an editing index per object list.
- When editing, copy the selected object back into the source fields.
- When saving an edited object, replace the original item.
- Increment/decrement numeric fields in the embedded object list without submitting the parent form.
- Submit the parent form with embedded arrays included in the payload.

Example final payload:

```json
{
  "saleDate": "2026-06-18",
  "items": [
    {
      "product": "catan",
      "quantity": 2,
      "note": ""
    }
  ]
}
```

## react-template Changes

- Add form component types to `src/types/page.ts`.
- Add `form` extraction to dynamic component rendering.
- Update `DynamicPageSections.tsx` so `type: "form"` renders a new runtime component.
- Create a form runtime component named `DynamicForm`.
- Extract reusable form logic from `GenericAddEditPanel` where practical:
  - form initialization
  - value conversion
  - field validation
  - field rendering
  - action rendering
- Add an object list renderer for embedded object arrays.
- Preserve existing table create/edit/custom action behavior.

## tenantPanel Changes

- Add `Form` to the PageDesigner component type dropdown.
- Add state for form config when creating or editing a form component.
- Let admins choose a schema and build fields from schema fields.
- Let admins set each field's area, order, width, label, required behavior, disabled behavior, default value, and select options.
- Add an object list editor:
  - list key
  - title
  - area
  - source fields
  - display fields/templates
  - enabled item actions
  - increment/decrement field and min/max/step
- Add form-level action editor:
  - add object/list action
  - final submit action label
  - clear/preserve source field behavior after add
- Include cleaned form config in saved page component payloads.
- Hydrate existing form config when reopening an existing form component.

## autotable-Go Changes

- Add Go structs mirroring the TypeScript form config.
- Add `Form *FormComponentConfig` to `ComponentBlock`.
- Validate form component configs:
  - form components require `form.schemaName`.
  - field configs require `formKey` and `type`.
  - object list configs require `key`.
  - object list actions must use supported action kinds.
  - increment/decrement actions require a `field`.
  - add-object actions require a valid `targetObjectList`.
- Add model round-trip tests for page JSON/BSON persistence.
- Keep old page documents valid when they do not include `form`.

## Error Handling

- Missing form schema should render a warning panel instead of crashing.
- Invalid or empty object list values should be normalized to an empty array.
- Increment/decrement should ignore non-numeric values except where a default can be inferred.
- Submit should reuse existing required-field and validation error behavior.
- Invalid builder configuration should be caught by backend validation and surfaced by tenantPanel save errors.

## Testing

- Backend tests:
  - form config JSON/BSON round trip
  - validation accepts valid form configs
  - validation rejects missing schema, empty object list key, invalid action kind, and increment/decrement without field
- Runtime tests:
  - add object copies source fields into an embedded list
  - edit object copies list values back into source fields
  - save edited object replaces the original item
  - remove object deletes the selected item
  - increment/decrement mutates the configured numeric field and respects min/max
  - final submit includes embedded object arrays
- tenantPanel verification:
  - create a form component
  - configure areas and object list actions
  - save and reopen the page component
  - preview renders the configured layout
- Build verification:
  - `autotable-Go`: `go test ./...`
  - `react-template`: project build command
  - `tenantPanel`: project build command

## Implementation Order

1. Add backend model and validation support in `autotable-Go`.
2. Add shared TypeScript form config types in `react-template` and `tenantPanel`.
3. Add runtime rendering in `react-template`.
4. Add PageDesigner editing support in `tenantPanel`.
5. Add tests and build verification across all three projects.

## Decisions

- Embedded object arrays are the correct first version for cart-like forms.
- Separate child-record saving can be added later as `source: "schema"` or a submit strategy.
- Existing table actions remain table-specific, but form actions reuse their conventions and input field metadata.
