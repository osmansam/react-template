# React Template

A multi-tenant admin runtime with a schema-driven page system and a visual document renderer.

The application resolves a tenant and project from the URL, authenticates against the project API, and renders admin pages defined by runtime schemas. Pages authored in the visual builder use the same versioned document model rendered by this runtime.

## Stack

- React 18 + TypeScript (strict)
- Vite 5
- Tailwind CSS 3
- TanStack Query 5
- React Router 7
- Vitest 2 + Testing Library
- Axios with cookie-based authentication

## Requirements

- Node.js 22.x
- Yarn 4.5 (declared in `package.json`, enabled through Corepack)

## Quick start

```bash
corepack enable
yarn install --immutable
cp .env.example .env
# edit .env and point VITE_API_URL at your backend
yarn start
```

The dev server runs on `http://localhost:3005`.

### Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the tenant/project API, for example `http://localhost:3002/api/v1` |

`VITE_*` values are compiled into the browser bundle. Do not put secrets in them. `.env` files are ignored by git; only `.env.example` is tracked.

## Scripts

| Command | Description |
| --- | --- |
| `yarn start` | Start the Vite dev server |
| `yarn build` | Type-check and build the production bundle into `dist/` |
| `yarn test` | Run the Vitest suite with type-checking |
| `yarn test:coverage` | Run the suite with V8 coverage and enforce thresholds |
| `yarn test:e2e` | Run production Playwright tests at desktop and mobile sizes |
| `yarn test:bundle` / `yarn check:bundle` | Test and run the emitted bundle budget checker |
| `yarn lint` | Run ESLint over TypeScript source, configuration and tests |
| `yarn analyze` | Build with the Rollup bundle visualizer (`bundle-report.html`) |
| `yarn build:visual-css` | Regenerate the visual engine's utility CSS |

## Routing

Routes are tenant/project scoped:

```text
/t/:tenant/p/:project/login
/t/:tenant/p/:project/auth/google/callback
/t/:tenant/p/:project/<dynamic-page-path>
```

The legacy paths without a tenant/project prefix remain available for backward compatibility.

`PrivateRoutes` checks the server session before rendering protected content. Dynamic page routes are loaded after authentication and are merged with the static route table.

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/navigation/` | Route table, guards, landing-page resolution, dynamic page loading |
| `src/pageRuntime/` | Schema-driven page model, binding compiler, table adapters, request runtime |
| `src/visualBuilder/` | Visual editor state, collections, record actions, drag/drop integration |
| `src/visual-engine/` | Document model, validation, renderer, theme, effects, host integration |
| `src/components/` | Shared admin design system (tables, forms, modals, typography) |
| `src/utils/api/` | Axios client, tenant/project scoping, auth, query helpers |
| `src/context/` | User, branding, and general UI context |
| `src/hooks/` | Shared data and UI hooks |

### Authentication

Authentication is cookie based. Requests use `withCredentials: true`; no access or refresh tokens are stored in `localStorage`.

- `/auth/session` determines whether the current browser session is authenticated.
- Project requests are automatically prefixed with `/:tenant/:project`.
- An eligible `401` shares a refresh attempt within its originating project and observable session. Stale work is rejected after session replacement.
- Public auth endpoints and management-only endpoints are excluded from the refresh flow.
- Google login uses an origin-checked popup message flow.

### Visual engine

The visual engine stores pages as a versioned component document:

1. `src/visual-engine/model/` defines nodes, styles, validation, and migrations.
2. `src/visual-engine/renderer/` renders documents for the runtime and the editor canvas.
3. `src/visual-engine/effects/` provides registered React Bits and WebGL background effects.
4. `src/visual-engine/theme/` resolves palettes and serializes scoped CSS variables.

Custom colors, lengths, and effect props are validated before they reach CSS or the DOM. Documents are versioned and migrated on load.

## Testing

```bash
yarn test                                   # full suite + type-check
yarn test:coverage                          # coverage + enforced thresholds
yarn vitest run src/utils/api/axiosClient.test.ts   # a single file
```

The suite covers page runtime, request/query behavior, table helpers, route resolution, auth redirects, and the visual builder. Mounted DOM tests opt into jsdom with a `// @vitest-environment jsdom` header and live alongside the code they cover. Coverage thresholds are declared in `vitest.config.ts`, including a separate floor for `src/visual-engine/**`; raise them as coverage improves rather than lowering them.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`/`master`:

1. Immutable Yarn install
2. Lint
3. Test, type-check, and coverage thresholds
4. Production build
5. Bundle budget regression checks
6. Chromium production browser tests at desktop/mobile sizes

## Deployment

```bash
yarn build
```

Deploy the generated `dist/` directory to any static host. Configure an SPA fallback so unknown paths serve `index.html`, and set `VITE_API_URL` at build time for the target environment.

## Contributing

Before opening a pull request:

```bash
yarn lint
yarn test
yarn build
```

Keep new behavior covered by tests, especially request scoping, authentication, and visual document migrations.

## Browser tests and bundle budgets

```bash
corepack yarn playwright install chromium
yarn test:e2e       # production preview + local API/socket fixtures
yarn test:bundle    # test the budget checker
yarn build
yarn check:bundle   # check emitted transitive raw/gzip totals
```

The browser runner is pinned and starts its own preview server on port 3018. CI installs its matching browser. Normal builds exclude the test fixture entry. Generated compiler scratch, browser results and `.e2e-dist` are ignored.

See [runtime ownership and verification](docs/runtime-hardening.md) for scope conventions, component/effect extension guidance, recovery behavior, measured bundle changes and verification limits.
