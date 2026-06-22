# Form Submit Modes Design

## Goal

Allow a dynamic form to submit through schema create, schema bulk create, or a configured workflow, while showing the exact request body in Tenant Panel.

## Contract

`FormSubmitConfig` gains:

- `mode`: `create`, `createMany`, or `workflow`; defaults to `create` for compatibility.
- `bulkObjectListKey`: required for `createMany` and identifies the embedded list sent as the request array.
- `workflowSchema` and `workflowName`: required for `workflow`.

Create sends the existing complete form payload. Bulk create sends the selected embedded object-list array. Workflow sends the complete form payload through the existing workflow mutation, whose HTTP body is `{ record: payload }`.

## Tenant Panel

- Submit mode is selectable beside the existing save-button settings.
- Bulk mode shows an object-list selector.
- Workflow mode shows a schema/workflow selector populated from project containers.
- A read-only JSON preview shows the exact HTTP request body with type-appropriate sample values and the same transient-field omission used at runtime.

## Validation

- Backend metadata validation rejects bulk mode without a configured object-list key.
- Backend metadata validation rejects workflow mode without workflow schema/name.
- Existing forms without a mode remain valid and use create.

## Verification

- Go model tests cover all modes and invalid configurations.
- Both frontend builds and focused lint pass.
- Browser checks verify conditional controls and all three previews.

