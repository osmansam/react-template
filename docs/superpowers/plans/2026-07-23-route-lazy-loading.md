# Route Lazy Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure and reduce the initial JavaScript bundle by adding opt-in bundle analysis and lazy-loading the Login, Google Callback, and Audit Logs routes.

**Architecture:** Vite conditionally registers Rollup Visualizer when `ANALYZE=true`, with an ESM-safe absolute report path. Route modules become `React.lazy` components accepted by a widened route configuration type and rendered beneath a route-local `Suspense` boundary with a focused accessible fallback.

**Tech Stack:** React 18, TypeScript 5, React Router 7, Vite 5, Vitest 2, Yarn 4, Rollup Visualizer, cross-env.

## Global Constraints

- Preserve `useDynamicPages`, authentication, authorization, redirect, landing-route, sidebar, and existing component-level lazy-loading behavior.
- Do not add `manualChunks` or replace application dependencies in this phase.
- Ordinary `yarn build` runs must not create or open `bundle-report.html`.
- `yarn analyze` must create `bundle-report.html` at the project root without opening a browser.
- Preserve unrelated uncommitted user changes; stage and commit only files named by each task.
- `src/navigation/routes.tsx` was already modified before this work; do not stage or commit it unless the user separately authorizes including its pre-existing changes.
- Use the existing `tsc && vite build` build sequence; do not change it to `tsc -b`.

---

## File Structure

- Modify `package.json`: add analysis tooling and the opt-in `analyze` script.
- Modify `yarn.lock`: lock the new development dependencies.
- Modify `vite.config.ts`: conditionally install the visualizer and resolve the report path.
- Modify `.gitignore`: ignore the generated root-level report and Vite's `dist` output.
- Create `src/navigation/RouteLoadingFallback.tsx`: own the reusable accessible route-loading UI.
- Create `src/navigation/RouteLoadingFallback.test.tsx`: verify the fallback's status semantics and copy.
- Modify `src/navigation/constants.tsx`: lazy-load Audit Logs and widen the static route component type.
- Modify `src/navigation/routes.tsx`: lazy-load public pages, widen the local route type, and add the route-local `Suspense` boundary.

### Task 1: Add opt-in bundle analysis and capture the baseline

**Files:**
- Modify: `package.json`
- Modify: `yarn.lock`
- Modify: `vite.config.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: existing `yarn build` script and ESM `vite.config.ts`.
- Produces: `yarn analyze`, which sets `ANALYZE=true`, performs the production build, and writes `<project-root>/bundle-report.html`.

- [ ] **Step 1: Install the analysis dependencies**

Run:

```bash
yarn add --dev rollup-plugin-visualizer cross-env
```

Expected: `package.json` gains both packages under `devDependencies`, `yarn.lock` is updated, and the command exits successfully.

- [ ] **Step 2: Add the analysis script**

Add this entry to `package.json` under `scripts`, leaving the existing `build` script unchanged:

```json
"analyze": "cross-env ANALYZE=true yarn build"
```

- [ ] **Step 3: Configure an ESM-safe conditional visualizer**

Replace `vite.config.ts` with the following configuration while retaining the current server, build, esbuild, React, path-alias, and SVGR behavior:

```ts
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import svgrPlugin from "vite-plugin-svgr";
import viteTsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  const analyze = process.env.ANALYZE === "true";
  const plugins: PluginOption[] = [
    react(),
    viteTsconfigPaths(),
    svgrPlugin(),
  ];

  if (analyze) {
    plugins.push(
      visualizer({
        filename: fileURLToPath(
          new URL("./bundle-report.html", import.meta.url),
        ),
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    );
  }

  return {
    server: {
      host: "0.0.0.0",
      port: 3005,
    },
    build: {
      outDir: "dist",
    },
    esbuild:
      process.env.NODE_ENV === "production"
        ? {
            drop: ["console", "debugger"],
          }
        : undefined,
    plugins,
  };
});
```

- [ ] **Step 4: Ignore generated build artifacts**

Add these entries under the production section of `.gitignore`:

```gitignore
/dist
/bundle-report.html
```

Keep the existing `/build` entry.

- [ ] **Step 5: Verify ordinary builds do not generate the report**

Ensure no stale report is present, then run:

```bash
test ! -e bundle-report.html
yarn build
test ! -e bundle-report.html
```

Expected: all commands exit with status 0; the production build succeeds and no root-level `bundle-report.html` exists.

- [ ] **Step 6: Capture the pre-splitting baseline**

Run:

```bash
yarn analyze
test -f bundle-report.html
```

Expected: both commands succeed. Record from the build output and report:

```text
Before initial entry:
  file:
  raw:
  gzip:
  brotli:
```

Keep these values in the task notes for the final implementation handoff, then preserve the baseline report outside the workspace:

```bash
mv bundle-report.html /private/tmp/react-template-bundle-before.html
test ! -e bundle-report.html
```

Expected: the baseline report is available at `/private/tmp/react-template-bundle-before.html`, and no report remains at the project root. Do not commit either report.

- [ ] **Step 7: Commit the analyzer**

```bash
git add package.json yarn.lock vite.config.ts .gitignore
git commit -m "build: add opt-in bundle analysis"
```

Expected: the commit contains exactly the four named files.

### Task 2: Add an accessible route-loading fallback

**Files:**
- Create: `src/navigation/RouteLoadingFallback.test.tsx`
- Create: `src/navigation/RouteLoadingFallback.tsx`

**Interfaces:**
- Consumes: React and the project's Tailwind utility classes.
- Produces: `RouteLoadingFallback(): JSX.Element`, used as the route `Suspense` fallback.

- [ ] **Step 1: Write the failing fallback test**

Create `src/navigation/RouteLoadingFallback.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RouteLoadingFallback } from "./RouteLoadingFallback";

describe("RouteLoadingFallback", () => {
  it("announces route loading without interrupting the user", () => {
    const markup = renderToStaticMarkup(<RouteLoadingFallback />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Loading page...");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
yarn test src/navigation/RouteLoadingFallback.test.tsx
```

Expected: FAIL because `./RouteLoadingFallback` does not exist.

- [ ] **Step 3: Implement the focused fallback**

Create `src/navigation/RouteLoadingFallback.tsx`:

```tsx
export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
      <div role="status" aria-live="polite">
        Loading page...
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
yarn test src/navigation/RouteLoadingFallback.test.tsx
```

Expected: one test file and one test pass.

- [ ] **Step 5: Commit the fallback**

```bash
git add src/navigation/RouteLoadingFallback.tsx src/navigation/RouteLoadingFallback.test.tsx
git commit -m "feat: add route loading fallback"
```

Expected: the commit contains only the fallback and its test.

### Task 3: Lazy-load the static route modules

**Files:**
- Modify: `src/navigation/constants.tsx`
- Modify: `src/navigation/routes.tsx`

**Interfaces:**
- Consumes: `RouteLoadingFallback`, default exports from `pages/Login`, `pages/GoogleCallback`, and `pages/AuditLogs`, and dynamic route functions created by `useDynamicPages`.
- Produces: route configuration fields typed as `React.ComponentType` and a `Suspense` boundary immediately around the `Routes` tree.

- [ ] **Step 1: Verify the three route modules expose default exports**

Run:

```bash
rg -n "^export default (Login|GoogleCallback|AuditLogs);$" src/pages/Login.tsx src/pages/GoogleCallback.tsx src/pages/AuditLogs.tsx
```

Expected: one matching default export in each file.

- [ ] **Step 2: Lazy-load Audit Logs and widen the static route type**

In `src/navigation/constants.tsx`, replace the eager import with:

```tsx
import { lazy, type ComponentType } from "react";

const AuditLogs = lazy(() => import("../pages/AuditLogs"));
```

Change the route field declaration from:

```ts
element?: () => JSX.Element;
```

to:

```ts
element?: ComponentType;
```

Do not change route names, paths, sidebar flags, or the `allRoutes` export.

- [ ] **Step 3: Lazy-load the public pages and widen the local route type**

In `src/navigation/routes.tsx`, change the React import and page imports to:

```tsx
import {
  lazy,
  Suspense,
  useMemo,
  type ComponentType,
} from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useDynamicPages } from "../hooks/useDynamicPages";
import { RouteLoadingFallback } from "./RouteLoadingFallback";

const GoogleCallback = lazy(() => import("../pages/GoogleCallback"));
const Login = lazy(() => import("../pages/Login"));
```

Remove the eager `GoogleCallback` and `Login` imports. Change the local `RouteConfig` field to:

```ts
element?: ComponentType;
```

- [ ] **Step 4: Add the route-local Suspense boundary**

Wrap only the existing `<Routes>...</Routes>` return tree in `src/navigation/routes.tsx`:

```tsx
return (
  <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      {/* Tenant/Project scoped routes - ALL routes including login */}
      <Route path="/t/:tenant/p/:project">
        <Route path="login" element={<Login />} />
        <Route path="auth/google/callback" element={<GoogleCallback />} />

        {/* Private routes */}
        <Route element={<PrivateRoutes />}>
          <Route
            index
            element={<Navigate to={tenantLandingPath} replace />}
          />
          {flattenedRoutes.map((route) => (
            <Route
              key={route.path}
              path={
                route.path?.startsWith("/") ? route.path.slice(1) : route.path
              }
              element={route.element && <route.element />}
            />
          ))}
          {/* Catch-all for 404 within tenant/project context */}
          <Route
            path="*"
            element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-2">
                  404 - Page Not Found
                </h1>
                <p className="text-gray-600">
                  The page you're looking for doesn't exist.
                </p>
              </div>
            }
          />
        </Route>
      </Route>

      {/* Legacy routes without tenant/project (for backward compatibility) */}
      <Route path={PublicRoutes.Login} element={<Login />} />
      <Route element={<PrivateRoutes />}>
        <Route index element={<Navigate to={landingPath} replace />} />
        {flattenedRoutes.map((route) => (
          <Route
            key={`legacy-${route.path}`}
            path={route.path}
            element={route.element && <route.element />}
          />
        ))}
      </Route>
    </Routes>
  </Suspense>
);
```

Do not wrap `RouterContainer`, providers, the sidebar, or `AppContent`.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
yarn test src/navigation/RouteLoadingFallback.test.tsx src/navigation/dynamicPagesLoading.test.ts src/navigation/landingRoute.test.ts
yarn test
```

Expected: focused tests pass, followed by the complete test suite passing.

- [ ] **Step 6: Run type and production verification**

Run:

```bash
yarn build
test ! -e bundle-report.html
```

Expected: TypeScript and Vite build successfully; output lists separate chunks for Login, Google Callback, and Audit Logs; no bundle report is created by the ordinary build.

- [ ] **Step 7: Capture post-splitting measurements**

Run:

```bash
yarn analyze
test -f bundle-report.html
```

Expected: the analysis succeeds. Record:

```text
After initial entry:
  file:
  raw:
  gzip:
  brotli:

Route chunks:
  Login:
  GoogleCallback:
  AuditLogs:
```

Compare these values with Task 1 and include the raw and percentage change in the final handoff.

- [ ] **Step 8: Confirm lazy boundaries in generated output**

Run:

```bash
rg -l "Loading page|Authentication Error|Audit Logs" dist/assets
```

Expected: route-specific strings occur in separately named asset files rather than all being present only in the initial entry asset. Confirm the exact asset names against the analysis report.

- [ ] **Step 9: Commit only the cleanly separable route change**

```bash
git add src/navigation/constants.tsx
git diff --cached --check
git commit -m "perf: lazy-load audit logs route"
```

Expected: the commit contains only `src/navigation/constants.tsx`. Leave `src/navigation/routes.tsx` unstaged because it contained user changes before this plan; report that its lazy Login/Google Callback imports, type widening, and `Suspense` boundary remain as verified working-tree changes.

### Task 4: Final regression and artifact review

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: all deliverables from Tasks 1–3.
- Produces: evidence-backed handoff with test results, build results, chunk names, and before/after sizes.

- [ ] **Step 1: Run the full verification suite from the final source state**

Run:

```bash
yarn test
yarn lint
yarn build
yarn analyze
```

Expected: tests, lint, ordinary build, and analysis build all succeed.

- [ ] **Step 2: Review repository state and generated artifacts**

Run:

```bash
git status --short
git check-ignore -v bundle-report.html dist
git diff --check
```

Expected: `bundle-report.html` and `dist` are ignored; no whitespace errors exist; unrelated pre-existing user changes may remain unstaged, but the files committed by this plan have no uncommitted changes.

- [ ] **Step 3: Report measurable results**

The final handoff must state:

```text
Tests:
Lint:
Production build:
Analysis build:
Initial entry before (raw/gzip/brotli):
Initial entry after (raw/gzip/brotli):
Initial entry change (raw and percent):
Login chunk:
Google Callback chunk:
Audit Logs chunk:
```

Also list the commits produced by Tasks 1–3 and note that `bundle-report.html` remains an ignored local artifact.
