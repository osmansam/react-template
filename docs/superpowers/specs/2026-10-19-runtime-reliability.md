# React Template reliability and delivery

The user authorized fixing the React Template findings autonomously, without approval pauses. Implement in the existing clean `feat-login-changes` checkout and leave a reviewable working-tree diff.

## Scope

- Fix the reproduced duplicate tenant/project URL on session-refresh retries.
- Pin retries to their originating project and coalesce concurrent refresh calls per project. Failed login/register/logout calls must not trigger refresh; protected session checks may refresh once. Preserve existing response normalization and legacy unscoped requests.
- Resolve the 35 baseline ESLint errors with meaningful types rather than disabling lint rules; address unstable/stale hook dependencies in touched components.
- Reduce the eagerly loaded application bundle by deferring the dynamic page renderer and its heavy component dependencies. Preserve existing routes, named/default exports, loading states, and chart support.
- Document setup and verification and add CI for the existing lint/test/build commands.

## Acceptance

Real Axios interceptors tested with an in-memory transport must preserve retry URL, body and project, coalesce concurrent refresh, stop retry loops, and propagate refresh failure. Existing tests, TypeScript, lint and the production build must pass. Compare entry assets with the baseline 1,907.15 kB minified / 548.20 kB gzip. Verify the build contains usable lazily loaded runtime chunks.

## Boundaries

No backend, Tenant Panel, Ozmishow, production data, deployment or authentication protocol changes. Keep the Go backend's current cookie-based APIs. Refactor large components incrementally where necessary; preserve working behavior. Restore only build-generated tracked output, and keep all source edits available for review.
