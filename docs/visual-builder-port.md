# Visual builder

The project runtime includes the visual editor ported from ozmishow-nextjs.
It stores visual sections in ordinary AutoTable pages and renders them alongside
existing page components.

## Open the editor

```sh
corepack yarn install --immutable
corepack yarn start
```

Set `VITE_API_URL` to your backend's `/api/v1` base URL. Optionally set
`VITE_TENANT_PANEL_URL` to the panel's HTTP(S) URL to show a panel link. Restart
Vite after changing environment variables.

Sign in to Tenant Panel and open the project there, then visit:

```text
http://localhost:3005/t/YOUR_TENANT/p/YOUR_PROJECT/_builder
```

The editor uses the backend's project management cookie session. An ordinary
application-user login does not grant editing permission. Both frontends must
use the same backend cookie host, with the editor origin allowed by backend
CORS and cookie settings. A missing session offers a retry after you sign in;
the backend enforces project read/write permissions.

Create pages and manage their names, slugs, navigation and access rules in Tenant
Panel. In the builder, choose a content page, then choose a visual section or
click **Add visual section**. Design it with the component library, canvas,
layers and inspector. **Save** writes to AutoTable; **View page** opens the
runtime route. Reloading retrieves the persisted layout.

An editing target can be bookmarked:

```text
/t/TENANT/p/PROJECT/_builder?page=PAGE_ID&component=COMPONENT_ID
```

`_builder` is reserved. If a page already uses that slug, rename it in Tenant
Panel before using the editor. Group-only pages are not editing targets.

## Editing and storage

The port retains the source editor's responsive previews, drag/drop, inline
content editing, undo/redo, templates, styles, effects, motion, theme controls,
document import/export and version snapshots. The website-specific “create
project page from slide” publishing action is omitted; application page
creation stays in Tenant Panel.

Document and theme saves use the management page API. A failed save keeps the
draft, and edits made during an earlier save remain unsaved. Navigation asks
before discarding pending edits. Before saving, the editor re-reads the full
page and updates only the selected block. A changed/deleted block requires a
reload. The backend has no atomic page revision condition, so writes racing
after that final read retain the backend's existing last-write behavior.

Templates, custom style kits and versions are browser-local, not shared server
libraries or publication history. They are namespaced by tenant/project;
versions are additionally scoped by the visual block and document. Display
preferences remain browser-wide. Clearing browser storage removes these local
libraries without deleting saved project pages.

Built-in examples come from the source editor. Their example links, images and
content need to be configured for your project.

## Stored contract and API-driven cards

The existing backend custom-component slot carries the document:

```ts
{
  id: "stable-component-id",
  type: "custom",
  props: {
    visualBuilder: {
      document: componentDocument,
      theme: optionalSectionTheme,
    },
  },
}
```

The engine validates/migrates document versions 1 and 2. Visual themes are local
to their section. Management reads preserve the backend's canonical JSON
unchanged; runtime response normalization preserves authored visual envelopes.
Unrelated custom components keep their existing runtime fallback.

Repeaters and field bindings are preserved. This first port makes no new live
collection requests; runtime repeaters show an unconnected-data notice. The next
phase can fetch an API response, map its records to `resolvedCollections`, and
bind a single designed card's text/image/link fields to each item. The existing
renderer boundary is `src/visual-engine/renderer/repeaters.ts`; item field
resolution lives in `renderer/bindings.ts`.

## Maintenance and verification

The engine is a direct copy, not a runtime import from a sibling checkout.
The reference is ozmishow-nextjs revision `0606941` plus its then-current
`InfiniteSliderRuntime.tsx` working-tree update. Preserve upstream React Bits
notices and font licenses when syncing source changes.

Host adaptations include native images, a scoped theme provider, project/block
storage namespaces, React 18 graphics compatibility, external save/dirty
callbacks, removal of the website publishing dialog, and slow-save draft
protection. Defaults for source templates and operations otherwise remain the
source implementation. Engine lint keeps upstream unused/type warning
severities; host integration files retain the application's strict rules.

Default-scale Tailwind utilities are generated under `.ve-utilities` so they
coexist with the application's customized scale. Engine Inter font faces use a
separate internal family. Regenerate utilities after changing engine classes:

```sh
corepack yarn build:visual-css
corepack yarn lint
corepack yarn test
corepack yarn build
```

For verification without rewriting tracked build artifacts:

```sh
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build --outDir /private/tmp/react-template-visual-builder-build --manifest
```

Use the repository's package script for Vitest so it finds the local TypeScript
compiler rather than an older global `tsc`.

The CLI browser fixtures in `scripts/visual-builder-browser-fixture.js` and
`scripts/verify-visual-builder-*.js` intercept API requests in memory and block
external traffic. Run them through `playwright-cli run-code --filename` against
the local Vite server on port 3015. They do not access or mutate live project
records. The fixture uses the configured API base; it should end in `/api/v1`.
See `docs/verification/2026-11-03-visual-builder-port.md` for evidence and known
limitations.
