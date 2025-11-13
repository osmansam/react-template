# Dynamic Pages System

This system allows you to dynamically create pages from a `page` schema in your database, automatically generating routes and navigation items.

## How It Works

### 1. Page Schema Structure

Create documents in the `page` collection with this structure:

```json
{
  "_id": "691632d781f6304dfdaba6c8",
  "name": "test",
  "schemas": [
    {
      "schemaName": "can"
    },
    {
      "schemaName": "konu"
    }
  ]
}
```

### 2. Automatic Route Generation

The system automatically creates routes based on the page configuration:

- **Page name** → URL path (e.g., `"test"` → `/test`)
- **Single schema** → `GenericPaginatedPage` with that schema
- **Multiple schemas** → `GenericTabPage` with tabs for each schema

### 3. File Structure

```
src/
├── hooks/
│   ├── useDynamicPages.tsx      # Hook that fetches and transforms pages
│   └── useFilteredRoutes.ts     # Combines static + dynamic routes
├── navigation/
│   ├── constants.tsx             # Static routes definition
│   └── routes.tsx                # Route rendering with dynamic routes
```

## Usage

### Creating a New Page

1. Add a document to the `page` collection:

```json
{
  "name": "My Page",
  "schemas": [
    {
      "schemaName": "users",
      "label": "Users" // Optional: custom tab label
    },
    {
      "schemaName": "roles",
      "label": "Roles"
    }
  ]
}
```

2. The page will automatically appear in:
   - Routes (accessible at `/my-page`)
   - Sidebar navigation (if `isOnSidebar: true`)

### Page Types

#### Single Schema Page

```json
{
  "name": "users",
  "schemas": [{ "schemaName": "user" }]
}
```

→ Renders `<GenericPaginatedPage schemaName="user" />`

#### Multi-Schema Page (Tabs)

```json
{
  "name": "settings",
  "schemas": [
    { "schemaName": "general", "label": "General" },
    { "schemaName": "security", "label": "Security" },
    { "schemaName": "notifications", "label": "Notifications" }
  ]
}
```

→ Renders `<GenericTabPage tabs={[...]} />`

## API

### `useDynamicPages` Hook

```typescript
const {
  dynamicRoutes, // Array of route objects
  routeEnums, // Enum-like object { PageName: "/page-name" }
  isLoading, // Loading state
  pages, // Raw page data
} = useDynamicPages();
```

### Route Object Structure

```typescript
{
  name: string; // Display name
  path: string; // URL path
  isOnSidebar: boolean; // Show in sidebar
  element: () => JSX.Element; // Component to render
}
```

## Examples

### Example 1: Dashboard with Multiple Schemas

```json
{
  "name": "Dashboard",
  "schemas": [
    { "schemaName": "analytics" },
    { "schemaName": "reports" },
    { "schemaName": "metrics" }
  ]
}
```

Result:

- URL: `/dashboard`
- Component: Tabs with Analytics, Reports, Metrics

### Example 2: Simple User List

```json
{
  "name": "Users",
  "schemas": [{ "schemaName": "user" }]
}
```

Result:

- URL: `/users`
- Component: Paginated table of users

## Combining Static and Dynamic Routes

Static routes (defined in `constants.tsx`) and dynamic routes work together:

```typescript
// constants.tsx
export const staticRoutes = [
  {
    name: "Home",
    path: "/home",
    element: () => <HomePage />,
    isOnSidebar: true,
  },
];

// Automatically combined with dynamic routes in:
// - routes.tsx (for routing)
// - useFilteredRoutes.ts (for sidebar)
```

## Notes

- Pages are fetched from the `page` schema using `useGetDynamicItems`
- URL paths are generated from page names (lowercase, spaces → hyphens)
- The system automatically decides between `GenericPaginatedPage` and `GenericTabPage`
- All dynamic routes appear in the sidebar by default
