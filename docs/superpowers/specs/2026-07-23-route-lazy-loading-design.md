# Route Lazy Loading and Bundle Analysis Design

## Goal

Reduce the application's initial JavaScript bundle without changing route behavior or prematurely introducing manual vendor chunks. Establish a repeatable bundle report so later optimization work is based on measured output.

## Scope

This first phase will:

- add Rollup's bundle visualizer as a development dependency;
- add an explicit analysis build that writes `bundle-report.html`;
- lazy-load the public route pages and the static Audit Logs page;
- provide one consistent route-loading fallback with `Suspense`;
- preserve the current dynamic-route API and existing component-level lazy loading;
- verify behavior with the existing automated tests, TypeScript build, and production build.

This phase will not:

- add `manualChunks`;
- replace UI, chart, PDF, spreadsheet, or icon dependencies;
- redesign the dynamic page component registry;
- alter authentication, authorization, landing-route, or dynamic-page loading behavior.

## Current State

`DynamicPageSections` already lazy-loads the calendar, chart, and form renderers. Route-level code is still eager:

- `routes.tsx` directly imports `Login` and `GoogleCallback`;
- `constants.tsx` directly imports `AuditLogs`;
- the route configuration represents pages as zero-argument React component functions.

The project currently has no bundle analyzer. Its Vite build only configures the output directory and production console/debugger removal.

## Design

### Bundle analysis

Add `rollup-plugin-visualizer` and `cross-env` as development dependencies. Register the visualizer in `vite.config.ts` only when `ANALYZE=true`, so ordinary production builds do not generate or open a report. `cross-env` keeps the analysis script portable across Unix-like systems and Windows.

Add an `analyze` package script that runs the existing build as `cross-env ANALYZE=true yarn build`. The visualizer will use `fileURLToPath(new URL("./bundle-report.html", import.meta.url))` so its ESM Vite configuration writes `bundle-report.html` at the project root rather than relying on plugin-relative path behavior. The report will include gzip and Brotli size estimates and will not automatically open a browser.

The generated report is a local build artifact and will be ignored by Git.

### Route splitting

Replace eager imports of `Login`, `GoogleCallback`, and `AuditLogs` with `React.lazy` dynamic imports. All three modules have default exports, so no named-export adapters are needed.

Widen the route configuration's `element` field from `() => JSX.Element` to `React.ComponentType`. This accepts both ordinary function components and `LazyExoticComponent` values while preserving the field name, configuration structure, and current `<route.element />` rendering contract.

`RouterContainer` will render its `Routes` tree inside a single `Suspense` boundary located immediately around the route tree. The sidebar, global providers, toast container, and other application shell elements remain mounted during route chunk loading. The boundary covers:

- legacy public routes;
- tenant/project public routes;
- the static Audit Logs route;
- any future lazy route component added to the existing route configuration.

Dynamic pages created by `useDynamicPages` will continue to work as they do now.

### Loading and error behavior

While a route chunk downloads, the user sees a reusable centered, full-screen "Loading page..." fallback. Its status text will use `role="status"` and `aria-live="polite"`. Existing dynamic-page metadata loading and error states remain unchanged.

This phase does not add a new chunk error boundary. A failed dynamic import will continue to propagate to the application's existing error handling. Retry or recovery UI can be designed separately if production telemetry shows it is needed.

## Testing and Verification

Automated verification will cover:

1. Before implementation, record the initial entry chunk's raw, gzip, and Brotli sizes from an analysis build.
2. Existing unit tests continue to pass.
3. TypeScript accepts lazy component types in the widened route configuration.
4. A normal production build succeeds and emits separate route chunks.
5. The analysis build succeeds and creates `bundle-report.html`.
6. Record the post-change initial entry chunk size and the generated chunk names and sizes for Login, Google Callback, and Audit Logs.
7. The report is not tracked by Git.

No route URL, redirect rule, authentication guard, sidebar rule, or page output should change.

## Success Criteria

- `Login`, `GoogleCallback`, and `AuditLogs` are absent from the initial application chunk as eagerly imported page modules.
- Visiting any of those routes loads and renders the same page through a lazy chunk.
- Normal builds do not create or open a bundle report.
- `yarn analyze` creates a readable bundle report with raw, gzip, and Brotli size information.
- The implementation handoff reports the measured before-and-after initial entry size and the sizes of the three new route chunks.
- Existing tests and the production build pass.

## Follow-up

Use the generated report to decide whether a second phase should split heavy table/tab renderers, narrow dependency imports, replace large dependencies, or introduce carefully chosen manual chunks. No second-phase action is included without bundle evidence.
