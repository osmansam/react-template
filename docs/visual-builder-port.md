# Visual page rendering

Authoring is in **Tenant Panel → select project → Pages → Visual builder**.
The runtime no longer contains an editor route or page-management client.
The previous `/t/TENANT/p/PROJECT/_builder` editor entry was removed.

Tenant Panel saves visual documents in ordinary page components:

```ts
{ id: "stable-id", type: "custom", props: { visualBuilder: { document, theme } } }
```

`DynamicPageSections` loads `VisualBlock`, which validates/migrates the document,
scopes its theme and renders it with the visual engine. Existing page access
rules still apply. The runtime normalizer preserves authored visual JSON keys.

The renderer supports the same node schema as Tenant Panel's engine. When adding
a new component type, update the model, validation and renderer in both apps and
register its editor metadata/defaults in Tenant Panel. Adding an instance of an
existing component only requires the builder's component library.

AutoTable schema-list repeaters now fetch authenticated live records through the
existing table-source transport. They expose local loading/empty/error/retry
states, preserve exact field keys and disclose the first-page limit. See
[visual-data-binding.md](visual-data-binding.md) for scope and release behavior.
Pipeline/configured-API sources, interactive pagination and actions remain later
increments.

Keep required React Bits/font licenses under `public/visual-builder` when syncing
the renderer. Regenerate scoped CSS with `corepack yarn build:visual-css` after
changing engine classes. Validate with `corepack yarn test`, `corepack yarn lint`,
`./node_modules/.bin/tsc --noEmit` and a Vite build directed to a temporary output
folder to avoid rewriting tracked build artifacts.
