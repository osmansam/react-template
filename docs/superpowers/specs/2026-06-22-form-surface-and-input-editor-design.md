# Form Surface and Input Editor Design

## Goal

Give dynamic forms clear, polished visual boundaries and give Tenant Panel form fields the complete configuration model already available to table action and filter inputs.

## Runtime Surface

- Every populated `top`, `left`, `main`, `right`, and `bottom` area renders automatically as a white bordered panel.
- Panels use restrained radius, a subtle border and shadow, compact headers, and consistent internal spacing.
- Object lists render as unframed rows inside their containing panel so cards are not nested.
- Area actions render in a footer separated by a top border.
- The layout stacks on small screens and respects the configured one, two, or three columns at desktop sizes.
- Form fields do not show detached clear icons.

## Tenant Panel Input Editor

- Replace the compact field row with a readable per-field configuration panel.
- Preserve form-only placement controls: area, width, and order.
- Support the full action/filter input model: type, label, placeholder, required, disabled, multiple, number buttons, default value, min/max, validation, required and disabled conditions, static/schema options, source schema, value and label fields, source filter condition, and invalidated fields.
- Pass all available schema containers to the editor so schema-backed select fields can be configured.
- Continue storing the configuration in `FormFieldConfig`, which already extends `TableActionFormFieldConfig`.

## Verification

- TypeScript production builds pass in React Template and Tenant Panel.
- Focused ESLint passes for changed files.
- Browser inspection confirms boundaries, hierarchy, spacing, no overlaps, and mobile stacking.

