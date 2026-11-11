# Runtime metadata and refresh authentication fix

The reported requests were GET `/api/v1/davinci/iyikafa/container` (401) and POST `/api/v1/davinci/iyikafa/auth/refresh` (403).

## Causes and changes

- At the initial diagnosis, `/container` was management-only. React-template's runtime tables, component request boundaries, and audit schema selector called it using an application session. Their shared `useGetContainers` hook now uses GET `/runtime/schemas` instead, with the normal tenant/project URL prefix. Management permission errors no longer trigger an unrelated application-session refresh.
- The backend auth mutation guard used a hardcoded origin list, even though CORS and normal cookie mutations use `Config.CorsWhitelist`. Refresh/logout now use the configured whitelist too. The current production config already includes `https://bayi.davinciboardgame.com`. Missing, null, unconfigured, and lookalike origins remain rejected.
- New backend runtime schema metadata is read-only and filtered by active application route/pipeline/workflow/API access. Record access policies require authentication. Account/role schemas, hashed/restricted fields, server pipeline/workflow/API definitions, indexes, cache configuration, and access-policy contents are omitted. Restricted nested fields are filtered recursively.
- Calculated fields retain a safe `isComputed` flag, so automatic create/edit/bulk forms continue excluding them without exposing the server formula. Legacy equation-based metadata remains supported.
- Metadata responses are `no-store`; stale application credentials return 401 before schema loading so existing refresh recovery can run.

## Files and rollout

Backend (`autotable-Go`): `controllers/sessionController.go`, `controllers/runtime_schema.go`, `routes/runtimeSchemaRoutes.go`, `main.go`, and corresponding regression tests.

Frontend (`react-template`): `src/utils/api/container.ts`, `axiosClient.ts`, metadata normalizers, computed-field checks in both generic table components, and corresponding regression tests.

Deploy the backend first, then react-template. React-template continues using the dedicated `/runtime/schemas` endpoint. The compatibility reads described below support older clients still calling `/container`. These changes are local; no production deployment or real production session mutation was performed.

## Verification

- React-template: full Vitest run reported 697 passing tests, no type errors; production build passed; ESLint reported 0 errors and 6 Fast Refresh warnings.
- Backend: controller, route, and middleware suites passed, including configured/untrusted origins, public/member metadata filtering, restricted nested and hashed fields, stale credentials, no-store responses, safe computed markers, record-access policies, and the unchanged management 401 boundary.
- Full backend `go test ./...` passed. Independent read-only review approved the final changes after the record-access and computed-field regression fixes.

## October 22: container read compatibility and session recovery

Production probes without session cookies confirmed GET `/container` returned 401 with `Missing or invalid management credential`, while GET `/runtime/schemas` returned 200. POST `/auth/refresh` from the configured `https://bayi.davinciboardgame.com` origin returned 401 (`Session expired. Please log in again.`), rather than the previous origin-related 403. These probes did not validate the user's authenticated browser session or establish its frontend origin.

- GET `/container`, `/container/types`, and `/container/:id` now accept a valid application session and return the same access-filtered metadata as `/runtime/schemas`. Full management reads still use the management authorization chain. Management credentials retain priority when both application and management cookies exist. `/container/tenant` and all writes retain management authorization.
- React-template permits one shared application refresh and retry for these three read aliases. Management writes and management-only routes remain excluded from application refresh recovery.
- GET `/auth/session` now returns 401 when the access cookie is absent or invalid and a refresh cookie remains. This activates the existing Axios recovery path instead of prematurely treating the visitor as anonymous. Visitors with neither cookie still receive 200 with `authenticated: false`.
- Refresh continues requiring a valid, current refresh session. Missing, invalid, expired, or revoked sessions cannot be renewed; those visitors must sign in again. No token or cookie policy was weakened to turn those 401 responses into success.

New regressions cover application versus management dispatch, missing/stale and foreign-project credentials, session bootstrap recovery, JWT refresh rotation with a stubbed session store, restored session cookies, and rejected refresh cookie cleanup. The authenticated production flow still needs validation after deployment; no deployment was performed during this fix.

October 22 verification: full `go test ./...` passed; frontend Vitest reported 701 passing tests and no type errors; production build passed; ESLint reported 0 errors and the same 6 Fast Refresh warnings. Independent read-only review approved the compatibility and session recovery changes.
