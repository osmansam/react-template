# Multi-Tenant & Multi-Project URL Structure

## Overview

The application now supports dynamic tenant and project slugs in the URL, eliminating the need for hardcoded tenant/project values in the API configuration.

## URL Format

```
https://app.yourdomain.com/t/{tenant}/p/{project}/{route}
```

### Examples

- `http://localhost:5173/t/acme/p/inventory/audit-logs`
- `http://localhost:5173/t/techcorp/p/crm/dashboard`
- `http://localhost:5173/t/acme/p/deneme/audit-logs`

## How It Works

### 1. Frontend Routing

The application uses React Router with dynamic parameters:

```tsx
/t/:tenant/p/:project/*
```

All authenticated routes are nested under this pattern.

### 2. API Request Transformation

The axios interceptor automatically extracts tenant and project from the URL and prepends them to API requests:

**URL:** `/t/acme/p/inventory/audit-logs`

**API Call:** `GET /container`

**Transformed To:** `GET /acme/inventory/container`

### 3. Environment Configuration

**Before:**

```env
VITE_API_URL="http://localhost:3002/api/v1/acme/deneme"
```

**After:**

```env
VITE_API_URL="http://localhost:3002/api/v1"
```

The tenant (`acme`) and project (`deneme`) are now dynamic from the URL.

## Usage

### In Components

Use the `useTenantProject` hook to access tenant/project values:

```tsx
import { useTenantProject } from "../hooks/useTenantProject";

function MyComponent() {
  const { tenant, project, buildPath } = useTenantProject();

  console.log(tenant); // 'acme'
  console.log(project); // 'inventory'

  // Build paths with tenant/project
  const auditLogsPath = buildPath("/audit-logs");
  // Result: '/t/acme/p/inventory/audit-logs'

  return <Link to={auditLogsPath}>Audit Logs</Link>;
}
```

### Making API Calls

No changes needed! The axios interceptor handles everything:

```tsx
// This works automatically
const { data } = await axiosClient.get("/container");

// Will be transformed to: GET /acme/inventory/container
```

## Migration Guide

### For Existing Projects

1. **Update .env file:**

   ```env
   # Old
   VITE_API_URL="http://localhost:3002/api/v1/acme/deneme"

   # New
   VITE_API_URL="http://localhost:3002/api/v1"
   ```

2. **Update URLs when accessing the app:**

   ```
   # Old
   http://localhost:5173/audit-logs

   # New
   http://localhost:5173/t/acme/p/deneme/audit-logs
   ```

3. **Legacy Support:**
   The app still supports old URLs for backward compatibility, but they won't include tenant/project in API calls.

## Backend Requirements

Your backend should accept URLs in this format:

```
/api/v1/{tenant}/{project}/{resource}
```

Example:

```
GET /api/v1/acme/inventory/container
POST /api/v1/acme/inventory/dynamic
```

## Benefits

1. **No Hardcoding:** Tenant and project are never hardcoded
2. **Multi-Tenancy:** Easy to switch between tenants/projects
3. **URL Sharing:** Users can share URLs that include context
4. **Cleaner Config:** Single API base URL for all tenants
5. **Scalability:** Add new tenants/projects without code changes
