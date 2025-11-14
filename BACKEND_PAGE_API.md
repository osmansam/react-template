# Backend Page API Implementation Guide

This document describes the Page API endpoints that need to be implemented on your Go backend.

## API Endpoints

Base URL: `/api/v1/page`

### 1. Create Page

```
POST /api/v1/page/
```

**Request Body:**

```json
{
  "name": "Rewards",
  "icon": "MdCardGiftcard",
  "schemas": [
    {
      "schemaName": "can",
      "label": "Optional Label",
      "isPaginated": true,
      "icon": "MdSportsEsports"
    }
  ],
  "page": {
    "name": "Nested Page",
    "icon": "FaHeart",
    "schemas": [...]
  }
}
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Rewards",
  "icon": "MdCardGiftcard",
  "schemas": [...],
  "page": {...}
}
```

### 2. Get All Pages

```
GET /api/v1/page/
```

**Response:**

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Rewards",
    "icon": "MdCardGiftcard",
    "schemas": [...],
    "page": {...}
  },
  ...
]
```

### 3. Get Single Page

```
GET /api/v1/page/:id
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Rewards",
  "icon": "MdCardGiftcard",
  "schemas": [...],
  "page": {...}
}
```

### 4. Update Page

```
PATCH /api/v1/page/:id
```

**Request Body:** (partial update)

```json
{
  "name": "Updated Name",
  "icon": "NewIcon"
}
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Updated Name",
  "icon": "NewIcon",
  "schemas": [...],
  "page": {...}
}
```

### 5. Delete Page

```
DELETE /api/v1/page/:id
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "message": "Page deleted successfully"
}
```

## Data Models

### Page Model

```go
type PageSchema struct {
    SchemaName  string `json:"schemaName" bson:"schemaName"`
    Label       string `json:"label,omitempty" bson:"label,omitempty"`
    IsPaginated *bool  `json:"isPaginated,omitempty" bson:"isPaginated,omitempty"`
    Icon        string `json:"icon,omitempty" bson:"icon,omitempty"`
}

type Page struct {
    ID      primitive.ObjectID `json:"_id,omitempty" bson:"_id,omitempty"`
    Name    string             `json:"name" bson:"name"`
    Icon    string             `json:"icon,omitempty" bson:"icon,omitempty"`
    Schemas []PageSchema       `json:"schemas,omitempty" bson:"schemas,omitempty"`
    Page    *Page              `json:"page,omitempty" bson:"page,omitempty"`
}
```

## WebSocket Events

### Page Changes

When a page is created, updated, or deleted, broadcast this WebSocket message:

```json
{
  "type": "pageChanged",
  "ts": 1699900800000
}
```

This will trigger the frontend to refetch all page data automatically.

### Container Changes

When a container is created, updated, or deleted, broadcast this WebSocket message:

```json
{
  "type": "containerChanged",
  "ts": 1699900800000
}
```

This will trigger the frontend to refetch all container data automatically.

### Schema Changes

For dynamic schema changes, use the existing format:

```json
{
  "type": "invalidate",
  "schema": "schemaName",
  "ts": 1699900800000
}
```

## Implementation Reference

Your Go controller should look similar to your `DynamicRoutes` implementation. Here's a basic structure:

```go
package controllers

import (
    "github.com/gofiber/fiber/v2"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

func CreatePage(c *fiber.Ctx) error {
    // Parse request body
    // Validate data
    // Insert into MongoDB
    // Broadcast WebSocket event: {"type": "pageChanged"}
    // Return created page
}

func GetAllPages(c *fiber.Ctx) error {
    // Fetch all pages from MongoDB
    // Return array of pages
}

func GetPage(c *fiber.Ctx) error {
    // Get :id param
    // Find page by ID
    // Return page
}

func UpdatePage(c *fiber.Ctx) error {
    // Get :id param
    // Parse update payload
    // Update page in MongoDB
    // Broadcast WebSocket event: {"type": "pageChanged"}
    // Return updated page
}

func DeletePage(c *fiber.Ctx) error {
    // Get :id param
    // Delete page from MongoDB
    // Broadcast WebSocket event: {"type": "pageChanged"}
    // Return success message
}
```

## Important Notes

1. **WebSocket Broadcasting**: Every mutation (create/update/delete) should broadcast appropriate events:
   - `pageChanged` for page mutations
   - `containerChanged` for container mutations
   - `invalidate` with schema name for dynamic schema mutations
2. **Nested Pages**: The `page` field can contain another complete Page object (for nested structures)
3. **Optional Fields**: All fields except `name` are optional
4. **Icon Names**: Icons use react-icons component names (e.g., "MdCardGiftcard", "FaHeart")
5. **MongoDB Collection**: Store pages in a dedicated `pages` collection, separate from the dynamic schemas

## Frontend Integration

The frontend will:

- Fetch pages on app load using `useGetAllPages()`
- Auto-generate routes from page data
- Listen for WebSocket events:
  - `pageChanged` - refetches all page queries
  - `containerChanged` - refetches all container queries
  - `invalidate` - refetches specific schema queries
- Automatically refetch when data is modified
- Display pages in the sidebar with dynamic icons

## Testing

Test the API with these scenarios:

1. Create a simple page with one schema
2. Create a page with multiple schemas (tabs)
3. Create a page with nested page structure
4. Update a page's icon
5. Delete a page
6. Verify WebSocket events are broadcast correctly
