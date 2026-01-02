# Dynamic Calendar Component - Schema Requirements

## Overview

The **Dynamic Calendar** component is a beautifully designed calendar interface with Linear/Vercel/Apple-inspired aesthetics. It seamlessly integrates with your DynamicPageRenderer to display events from your data pipeline.

## Visual Design Features

- **Pixel-perfect UI** inspired by Linear, Vercel, and Apple design systems
- **Dark mode support** with automatic theme switching
- **Smooth animations** and micro-interactions
- **Responsive design** that adapts to all screen sizes
- **Accessibility-first** with keyboard navigation and screen reader support

## Required Schema Fields

Your data schema **MUST** include these fields for the calendar to work properly:

### Mandatory Fields

| Field   | Type     | Format            | Description                                         | Example          |
| ------- | -------- | ----------------- | --------------------------------------------------- | ---------------- |
| `id`    | `string` | Any unique string | Unique identifier for the event                     | `"evt_123"`      |
| `title` | `string` | Any string        | Event title/name                                    | `"Team Meeting"` |
| `date`  | `string` | `YYYY-MM-DD`      | ISO date format (required for calendar positioning) | `"2026-01-15"`   |

### Optional Fields

| Field         | Type     | Format         | Description                       | Example                        |
| ------------- | -------- | -------------- | --------------------------------- | ------------------------------ |
| `startTime`   | `string` | `HH:mm`        | Event start time (24-hour format) | `"14:30"`                      |
| `endTime`     | `string` | `HH:mm`        | Event end time (24-hour format)   | `"16:00"`                      |
| `description` | `string` | Any string     | Detailed event description        | `"Quarterly planning session"` |
| `color`       | `string` | Hex color code | Custom event color                | `"#3b82f6"`                    |
| `category`    | `string` | Any string     | Event category/type               | `"Meeting"`, `"Task"`          |
| `status`      | `string` | Enum           | Event status (see below)          | `"scheduled"`                  |

### Status Field Values

The `status` field accepts these predefined values with automatic color coding:

- `"scheduled"` - Blue (default)
- `"completed"` - Green
- `"cancelled"` - Red
- `"in-progress"` - Amber

## Configuration Example

Here's how to use the calendar in your page configuration:

```json
{
  "id": "calendar-component",
  "type": "calendar",
  "title": "Project Schedule",
  "order": 1,
  "dataBinding": {
    "kind": "pipeline",
    "schemaName": "events",
    "pipelineName": "getEvents",
    "params": {
      "year": 2026
    }
  },
  "props": {
    "height": 800,
    "fieldMappings": {
      "id": "event_id",
      "title": "event_name",
      "date": "event_date",
      "startTime": "start_time",
      "endTime": "end_time",
      "description": "details",
      "color": "custom_color",
      "category": "event_type",
      "status": "event_status"
    },
    "options": {
      "defaultView": "month",
      "firstDayOfWeek": 1,
      "allowEventClick": true,
      "highlightToday": true
    }
  }
}
```

## Field Mappings

If your schema uses different field names, use `fieldMappings` in the `props` to map them:

```json
{
  "fieldMappings": {
    "id": "your_id_field",
    "title": "your_title_field",
    "date": "your_date_field",
    "startTime": "your_start_time_field",
    "endTime": "your_end_time_field",
    "description": "your_description_field",
    "color": "your_color_field",
    "category": "your_category_field",
    "status": "your_status_field"
  }
}
```

### Default Field Mappings

If you don't provide `fieldMappings`, the calendar expects these exact field names:

```javascript
{
  id: "id",
  title: "title",
  date: "date",
  startTime: "startTime",
  endTime: "endTime",
  description: "description",
  color: "color",
  category: "category",
  status: "status"
}
```

## Calendar Options

Customize the calendar behavior with these options in `props.options`:

| Option            | Type                             | Default   | Description                            |
| ----------------- | -------------------------------- | --------- | -------------------------------------- |
| `defaultView`     | `"month"` \| `"week"` \| `"day"` | `"month"` | Initial calendar view                  |
| `firstDayOfWeek`  | `0` \| `1`                       | `0`       | Start week on Sunday (0) or Monday (1) |
| `allowEventClick` | `boolean`                        | `true`    | Enable clicking events to view details |
| `highlightToday`  | `boolean`                        | `true`    | Highlight the current day              |

## Sample Data Structure

### Minimal Schema (Required Fields Only)

```json
[
  {
    "id": "1",
    "title": "Project Kickoff",
    "date": "2026-01-15"
  },
  {
    "id": "2",
    "title": "Design Review",
    "date": "2026-01-20"
  }
]
```

### Complete Schema (All Fields)

```json
[
  {
    "id": "evt_001",
    "title": "Team Standup",
    "date": "2026-01-15",
    "startTime": "09:00",
    "endTime": "09:30",
    "description": "Daily team synchronization meeting",
    "color": "#3b82f6",
    "category": "Meeting",
    "status": "scheduled"
  },
  {
    "id": "evt_002",
    "title": "Code Review",
    "date": "2026-01-15",
    "startTime": "14:00",
    "endTime": "15:00",
    "description": "Review pull requests for sprint 12",
    "color": "#8b5cf6",
    "category": "Development",
    "status": "in-progress"
  },
  {
    "id": "evt_003",
    "title": "Deploy to Production",
    "date": "2026-01-16",
    "startTime": "10:00",
    "endTime": "11:00",
    "description": "Production deployment of v2.1.0",
    "color": "#10b981",
    "category": "Deployment",
    "status": "completed"
  }
]
```

## Pipeline Requirements

Your pipeline must:

1. **Return an array** of event objects
2. **Include at minimum**: `id`, `title`, and `date` fields (or mapped equivalents)
3. **Use ISO date format** (`YYYY-MM-DD`) for the date field
4. **Use 24-hour time format** (`HH:mm`) for time fields if provided

Example pipeline response:

```json
[
  {
    "id": "1",
    "title": "Meeting",
    "date": "2026-01-15",
    "startTime": "14:00",
    "endTime": "15:00",
    "description": "Quarterly review",
    "status": "scheduled"
  }
]
```

## Common Issues & Solutions

### Events Not Showing

**Problem**: Calendar displays but no events appear

**Solutions**:

- Verify your pipeline returns an array of objects
- Check that `date` field uses `YYYY-MM-DD` format
- Ensure field mappings match your actual schema field names
- Check browser console for data transformation errors

### Incorrect Date Format Error

**Problem**: Events appear on wrong dates

**Solution**: Date field must be in ISO format `YYYY-MM-DD`. Examples:

- ✅ Correct: `"2026-01-15"`
- ❌ Wrong: `"01/15/2026"`, `"15-01-2026"`, `"January 15, 2026"`

### Time Not Displaying

**Problem**: Event times don't show up

**Solution**: Use 24-hour format `HH:mm`. Examples:

- ✅ Correct: `"14:30"`, `"09:00"`
- ❌ Wrong: `"2:30 PM"`, `"9:00 AM"`, `"14:30:00"`

### Colors Not Working

**Problem**: Custom colors not applied

**Solution**: Use hex color codes:

- ✅ Correct: `"#3b82f6"`, `"#10b981"`
- ❌ Wrong: `"blue"`, `"rgb(59, 130, 246)"`

## Features

### Month View

- See entire month at a glance
- Up to 3 events per day shown inline
- "+X more" indicator for additional events
- Click any day to see all events

### Event Details Modal

- Click any event to view full details
- Beautiful modal with event information
- Shows date, time, category, status, and description
- Smooth animations and transitions

### Navigation

- Previous/Next month navigation
- "Today" button to jump to current date
- Smooth transitions between months

### Responsive Design

- Desktop: Full featured experience
- Tablet: Optimized layout
- Mobile: Compact view with essential information

### Dark Mode

- Automatic detection of system preferences
- Beautiful dark theme
- Optimized contrast and readability

## TypeScript Types

For TypeScript users, the calendar exports these types:

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  description?: string;
  color?: string; // Hex color
  category?: string;
  status?: "scheduled" | "completed" | "cancelled" | "in-progress";
}

interface CalendarConfig {
  title?: string;
  height?: number;
  width?: string;
  dataBinding: {
    kind: "pipeline";
    schemaName: string;
    pipelineName: string;
    params?: Record<string, unknown>;
  };
  fieldMappings?: {
    id?: string;
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    color?: string;
    category?: string;
    status?: string;
  };
  options?: {
    defaultView?: "month" | "week" | "day";
    showWeekNumbers?: boolean;
    firstDayOfWeek?: 0 | 1;
    allowEventClick?: boolean;
    highlightToday?: boolean;
  };
}
```

## Support

For issues or questions about the calendar component, check:

- Your schema matches the required format
- Pipeline returns data in expected structure
- Field mappings are correctly configured
- Browser console for any error messages
