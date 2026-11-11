# AutoTable React application runtime

Renders project-configured pages, tables, forms, charts and workflows from the
AutoTable API. Tenant Panel manages project configuration; this application is
the interface used by project end users.

## Local setup

Use Node.js 22 or newer and the Yarn version declared in `package.json`:

```sh
corepack enable
yarn install --immutable
cp .env.example .env.local
yarn start
```

Set the public API base URL in `.env.local`:

```dotenv
VITE_API_URL=http://localhost:3002/api/v1
```

The URL ends at `/api/v1`; tenant and project slugs are added by the API client.
Vite variables are public browser configuration. Keep credentials and private
service keys on the backend. Restart Vite after changing environment variables.

Open a project URL, for example:

```text
http://localhost:3005/t/acme/p/inventory/login
```

The tenant/project must exist in AutoTable. Configure the backend's allowed
origins and cookie settings for the frontend origin. Authentication requests
include backend cookies; local session hints do not replace backend session
validation. Production hosting must serve `index.html` for application routes
(the repository includes the Vercel rewrite configuration).

## Verification

```sh
yarn lint
yarn test
yarn build
yarn serve
```

Tests include runtime behavior and TypeScript checks. API-client regressions
use real Axios interceptors with an in-memory HTTP adapter; they do not call a
live backend. CI runs lint, tests and a production build on pull requests and
pushes to `main` or `master`.

## Session recovery

Requests keep their original tenant/project context, including during refresh
and retry. Concurrent requests in one project share an in-flight refresh;
different projects refresh independently. A protected request retries at most
once. Failed login, registration, logout and refresh calls are returned to their
callers without starting another refresh.

Container metadata supports legacy PascalCase and current camelCase responses,
including nested response envelopes. Explicit camelCase false values take
precedence over legacy values.

## Application loading

Dynamic page rendering is loaded on demand through the router's Suspense
boundary. Charts, forms and calendar components retain their existing deferred
loading. Generate an optional bundle report with:

```sh
yarn analyze
```

The build may report large deferred chunks. Six existing Fast Refresh warnings
also remain for modules that export both components and helpers; lint has no
errors or hook dependency warnings.

## Visual pages

Developers design pages in Tenant Panel: select a project, open **Pages**, then
choose **Visual builder** beside a content page. This application renders the
saved page sections for end users.

See [visual page rendering](docs/visual-builder-port.md).
