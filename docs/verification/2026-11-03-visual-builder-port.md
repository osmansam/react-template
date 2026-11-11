> Historical verification of the initial port. Authoring was subsequently moved to Tenant Panel on 2026-11-03. Current ownership and workflow are documented in `docs/visual-builder-port.md`; relocation evidence is in Tenant Panel’s `docs/visual-builder-relocation.md`.

# Visual builder port verification

Date: 2026-11-03

## Baseline before product implementation

- `yarn lint`: passed, zero errors, six existing Fast Refresh warnings.
- `yarn test`: passed, 124 reported test files and 701 checks including
  Vitest's TypeScript suites; no type errors.
- `yarn exec tsc --noEmit`: passed.
- Production Vite build: passed, with existing chunk-size, Browserslist age and
  deprecated Tailwind `@variants` warnings.
- Runtime: Node v22.22.0; the `yarn` executable is v1.22.19 even though the
  repository declares Yarn 4.5.0. Existing node_modules are available.
- Source reference: ozmishow-nextjs commit `0606941`, including the current
  uncommitted engine changes in `InfiniteSliderRuntime.tsx`.

The attempted baseline command `yarn exec vite build --outDir ...` did not
forward the directory option under the installed Yarn, and regenerated the
tracked `dist/index.html`. That path was already modified before this task;
its original uncommitted contents were not captured, so do not restore it to
HEAD or claim it was preserved. No source files were changed by this check.
Subsequent builds must invoke `./node_modules/.bin/vite build --outDir
/private/tmp/react-template-visual-builder-build` directly.

## Implementation verification

Implemented and independently reviewed. Final checks:

- `corepack yarn test`: **140 reported test files, 763 checks passed**, including
  Vitest typechecking; no type errors. This adds 31 runtime regression tests
  (and their TypeScript suites) to the baseline.
- `corepack yarn lint`: **zero errors, 79 warnings**. Imported engine code retains
  its upstream unused/type warning severities, alongside inherited hook and
  Fast Refresh warnings; host integration retains strict rules.
- `./node_modules/.bin/tsc --noEmit`: passed.
- Production Vite build to `/private/tmp/react-template-visual-builder-build`:
  passed. Existing and deferred large-chunk warnings remain; the deferred
  template library is about 1.9 MB before gzip.
- Build manifest/static import inspection: the main entry and visual runtime
  entry do not import the editor workspace. Renderer/model/effect support is
  shared; the full editor is a separate lazy entry.
- Compared 16 pre-existing modified tracked files against the saved baseline:
  no unexpected changes. Feature changes to the already-dirty README, ignore
  file and runtime API client were staged separately from the user's hunks.

## Controlled browser acceptance

All requests were fulfilled from an in-memory fixture. External API traffic was
blocked; no live records were changed. Vite's local update socket is allowed.

Passed desktop and narrow-screen checks for:

- Editing a heading, undo/redo, Save and reload with persisted text.
- Preserving existing page sections, authentication/roles and page variables.
- Adding and saving a new visual section to a second project page.
- Dragging a Badge from the library onto the canvas and persisting it.
- Loading and saving a lazy Shiny Text effect.
- Document JSON export/import; invalid tokens are rejected without replacing
  the active document.
- Creating a local named version snapshot and inspecting its actions.
- Saving section theme colors while preserving hyphenated semantic token keys.
- Rendering the saved section through the runtime route on desktop and mobile.
- Failed write (403) retaining a draft, then successful retry.
- Cancelling a page-target switch and browser Back without losing the draft.
- Edits made during a delayed Save staying dirty until a subsequent Save.
- A failed background reconnect refetch retaining the mounted editor/draft.
- Explicit Reload using a new external document value rather than cached data.
- Effect CSS retaining an ordinary canvas's 123×45 dimensions while its own
  canvas fills a 400×200 effect surface.

The browser regression scripts are checked in under `scripts/verify-visual-builder-*.js`.
The asynchronous-save check uses a delayed fixture response, and the Reload
check changes the external value on every run. Fixtures intentionally generate
HTTP 403/503 console errors in error-path tests; successful runtime rendering
had no browser errors or warnings.

Screenshots: `output/playwright/visual-builder-port/editor-desktop.png`,
`editor-mobile.png`, `runtime-desktop.png`, and `runtime-mobile.png`.

## Independent review and fixes

A fresh reviewer completed the original review. It found three Important
issues; each was reproduced with a browser regression before fixing and passed
with the fix:

1. Background query errors could unmount the editor and lose internal drafts.
   The active editing session now remains mounted with cached data and an error
   notice.
2. Reload rebuilt the editor before fresh reads completed. It now waits for
   those reads, prevents editing/switching while loading, and only then replaces
   the session. Failed reads retain the draft.
3. Hyperspeed's global canvas styling could leak into other application views.
   Its surface and canvas selectors are now scoped to `.ve-utilities`.

The review found no additional material defects and no deferred minor findings.
Its initial review was interrupted by a usage limit, then resumed and completed
in the same reviewer context. As intended by the execution workflow, subsequent
fixes were verified with regression checks rather than a second review.

## Decisions and practical limits

- Worked in the existing non-main feature checkout with a baseline snapshot,
  preserving the user's current source changes. Cost: review must distinguish
  those existing changes from this feature's changes.
- Retained upstream engine lint severities and untouched source/license
  whitespace. Cost: warnings remain, and a whole-port whitespace check reports
  inherited formatting; the integration-only whitespace check passes.
- Generated default-scale utilities inside `.ve-utilities` and used a distinct
  internal Inter font family. Cost: regenerate `build:visual-css` when engine
  utility classes change.
- Management page JSON is lossless, using the Go endpoint's canonical camelCase
  schema. Runtime normalization has only a narrow visual-envelope exception.
  Cost: legacy PascalCase management PageModel responses are not supported.
- Local versions are scoped to a visual block/document, while templates/style
  kits are shared within one project. Cost: a copied block does not automatically
  inherit another block's local snapshot history.
- API collection resolution/card binding is the explicitly deferred next phase.
  Cost: repeaters show an unconnected-data notice until that work is implemented.
- Atomic writes after the final read require backend revision support. Cost:
  truly concurrent saves can retain the backend's last-write behavior.
- Production management-cookie/CORS configuration is deployment-specific and was
  not validated against a live account. Cost: the operator must configure the
  shared backend host/origins and sign into/open the project in Tenant Panel.
- Pre-existing unrelated work was outside the review. The baseline build artifact
  caveat above remains: the previous uncommitted `dist/index.html` was not
  captured before the first build, so its original contents cannot be asserted.
