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

Add `rollup-plugin-visualizer` as a development dependency. Register it in `vite.config.ts` only when analysis is explicitly requested, so ordinary production builds do not generate or open a report.

Add an `analyze` package script that runs the existing TypeScript check and a Vite production build with analysis enabled. The visualizer will write `bundle-report.html` at the project root and include gzip and Brotli size estimates. It will not automatically open a browser.

The generated report is a local build artifact and will be ignored by Git.

### Route splitting

Replace eager imports of `Login`, `GoogleCallback`, and `AuditLogs` with `React.lazy` dynamic imports. Keep the existing default exports and route configuration shape so consumers do not need a new registry API.

`RouterContainer` will render its `Routes` tree inside a single `Suspense` boundary. The fallback will use the project's existing full-screen loading presentation. This boundary covers:

- legacy public routes;
- tenant/project public routes;
- the static Audit Logs route;
- any future lazy route component added to the existing route configuration.

Dynamic pages created by `useDynamicPages` will continue to work as they do now.

### Loading and error behavior

While a route chunk downloads, the user sees a centered, full-screen "Loading page..." state. Existing dynamic-page metadata loading and error states remain unchanged.

This phase does not add a new chunk error boundary. A failed dynamic import will continue to propagate to the application's existing error handling. Retry or recovery UI can be designed separately if production telemetry shows it is needed.

## Testing and Verification

Automated verification will cover:

1. Existing unit tests continue to pass.
2. TypeScript accepts lazy component types in the current route configuration.
3. A normal production build succeeds and emits separate route chunks.
4. The analysis build succeeds and creates `bundle-report.html`.
5. The report is not tracked by Git.

No route URL, redirect rule, authentication guard, sidebar rule, or page output should change.

## Success Criteria

- `Login`, `GoogleCallback`, and `AuditLogs` are absent from the initial application chunk as eagerly imported page modules.
- Visiting any of those routes loads and renders the same page through a lazy chunk.
- Normal builds do not create or open a bundle report.
- `yarn analyze` creates a readable bundle report with raw, gzip, and Brotli size information.
- Existing tests and the production build pass.

## Follow-up

Use the generated report to decide whether a second phase should split heavy table/tab renderers, narrow dependency imports, replace large dependencies, or introduce carefully chosen manual chunks. No second-phase action is included without bundle evidence.
