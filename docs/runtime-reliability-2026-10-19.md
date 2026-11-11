# React runtime reliability update — 2026-10-19

## Changes

- Scoped API requests exactly once, including already scoped paths and retries.
- Bound each request to its original tenant/project synchronously, so navigation cannot redirect an outstanding request.
- Coordinated refresh per project/session generation. Concurrent requests and delayed 401 responses reuse the same refresh outcome; a later request can attempt recovery again after failure.
- Excluded failed login, registration, logout, refresh and other public-auth operations from automatic refresh; protected session checks may recover once.
- Preserved mutation data, idempotency headers and response normalization during retries.
- Fixed container suffix routing, including `/container/types` and `/container/:id`.
- Extracted typed metadata normalization, preserving workflows/frontend settings, handling response envelopes and legacy fields, respecting explicit false values and filtering malformed field entries safely.
- Removed 35 ESLint errors without weakening lint rules. Corrected hook dependency warnings in relation, table, select, locale and tab components.
- Deferred the dynamic renderer through the router's existing Suspense boundary.
- Added CI for lint/tests/build, a public environment example and usable setup documentation.

## Verification

- Full suite: 62 runtime test files / 368 runtime test cases passed. Type checks also passed. Vitest reports 124 file results / 689 cases when runtime and type-check results are combined.
- Lint: zero errors. Six existing Fast Refresh warnings remain in modules mixing components and helpers; there are no hook dependency warnings.
- Production build: passed. Entry JavaScript is approximately 482 kB minified / 161 kB gzip, versus the earlier 1,907 kB / 548 kB baseline. The entry has no static JavaScript imports; large deferred chunks still warrant future optimization.
- Browser smoke against the production build with mocked API responses: login rendered, login navigated to the configured page, the deferred renderer loaded, and expired-session recovery used one refresh for concurrent protected requests without JavaScript exceptions.
- Independent read-only review identified a delayed-401 race and malformed-field regression. Both were reproduced with failing tests and fixed before final verification.
- `git diff --check`: passed.

The browser and interceptor tests use controlled API responses. Live backend cookie rotation, production deployment and hosted GitHub Actions were not exercised. Existing large table components were preserved with targeted fixes; this update is not a complete architectural rewrite.
