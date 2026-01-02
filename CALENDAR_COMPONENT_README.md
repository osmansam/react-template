# ✨ Dynamic Calendar Component

A beautifully designed, pixel-perfect calendar component with **Linear/Vercel/Apple-inspired** UI aesthetics, fully integrated with your DynamicPageRenderer system.

![Calendar Preview](https://img.shields.io/badge/Status-Ready-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-Supported-blue) ![Dark Mode](https://img.shields.io/badge/Dark%20Mode-Supported-purple)

## 🎨 Design Features

- **Pixel-perfect UI** inspired by Linear, Vercel, and Apple design systems
- **Automatic dark mode** support with beautiful theme switching
- **Smooth animations** and delightful micro-interactions
- **Fully responsive** - works beautifully on desktop, tablet, and mobile
- **Accessibility-first** with keyboard navigation and screen reader support
- **Modern color palette** with smart status-based event coloring

## 📦 What's Included

### New Files Created

1. **`src/components/calendar/DynamicCalendar.tsx`**

   - Main calendar component with full event management
   - Month view with event display
   - Event detail modal
   - Smart data transformation and field mapping

2. **`src/components/calendar/dynamic-calendar.css`**

   - Beautiful, modern styling with CSS variables
   - Dark mode support with `prefers-color-scheme`
   - Smooth transitions and animations
   - Responsive breakpoints for all devices

3. **`src/components/calendar/calendar-usage-examples.ts`**

   - Complete usage examples
   - Sample data structures
   - Quick start guide

4. **`CALENDAR_SCHEMA_REQUIREMENTS.md`**
   - Comprehensive documentation
   - Schema requirements
   - Field mappings guide
   - Troubleshooting section

### Modified Files

1. **`src/types/page.ts`**

   - Added `"calendar"` to `ComponentType`

2. **`src/components/DynamicPageRenderer.tsx`**
   - Imported `DynamicCalendar` component
   - Added calendar case in component renderer
   - Configured field mappings and options support

## 🚀 Quick Start

### 1. Schema Requirements

Your data pipeline **MUST** return data with these fields:

#### Required Fields:

```typescript
{
  id: string; // Unique identifier
  title: string; // Event title
  date: string; // Date in YYYY-MM-DD format (ISO)
}
```

#### Optional Fields:

```typescript
{
  startTime?: string;    // Format: "HH:mm" (24-hour)
  endTime?: string;      // Format: "HH:mm" (24-hour)
  description?: string;  // Event details
  color?: string;        // Hex color code (e.g., "#3b82f6")
  category?: string;     // Event category/type
  status?: "scheduled" | "completed" | "cancelled" | "in-progress";
}
```

### 2. Basic Usage

Add to your page configuration:

```json
{
  "id": "calendar-component",
  "type": "calendar",
  "title": "Team Events",
  "order": 1,
  "dataBinding": {
    "kind": "pipeline",
    "schemaName": "events",
    "pipelineName": "getEvents"
  }
}
```

### 3. Advanced Usage with Field Mapping

If your schema uses different field names:

```json
{
  "id": "calendar-component",
  "type": "calendar",
  "title": "Project Schedule",
  "order": 1,
  "dataBinding": {
    "kind": "pipeline",
    "schemaName": "events",
    "pipelineName": "getAllEvents",
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
      "color": "event_color",
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

## 📋 Configuration Options

### Field Mappings (`props.fieldMappings`)

Map your schema field names to calendar fields:

| Calendar Field | Description             | Required |
| -------------- | ----------------------- | -------- |
| `id`           | Unique event identifier | ✅ Yes   |
| `title`        | Event title/name        | ✅ Yes   |
| `date`         | Event date (YYYY-MM-DD) | ✅ Yes   |
| `startTime`    | Start time (HH:mm)      | ❌ No    |
| `endTime`      | End time (HH:mm)        | ❌ No    |
| `description`  | Event description       | ❌ No    |
| `color`        | Custom color (hex)      | ❌ No    |
| `category`     | Event category          | ❌ No    |
| `status`       | Event status            | ❌ No    |

### Calendar Options (`props.options`)

| Option            | Type                             | Default   | Description                             |
| ----------------- | -------------------------------- | --------- | --------------------------------------- |
| `defaultView`     | `"month"` \| `"week"` \| `"day"` | `"month"` | Initial calendar view                   |
| `firstDayOfWeek`  | `0` \| `1`                       | `0`       | Week starts on Sunday (0) or Monday (1) |
| `allowEventClick` | `boolean`                        | `true`    | Allow clicking events for details       |
| `highlightToday`  | `boolean`                        | `true`    | Highlight current day                   |

## 💾 Sample Data

### Minimal Example

```json
[
  {
    "id": "1",
    "title": "Team Meeting",
    "date": "2026-01-15"
  }
]
```

### Complete Example

```json
[
  {
    "id": "evt_001",
    "title": "Team Standup",
    "date": "2026-01-15",
    "startTime": "09:00",
    "endTime": "09:30",
    "description": "Daily team sync",
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
    "description": "Review PRs",
    "color": "#8b5cf6",
    "category": "Development",
    "status": "in-progress"
  }
]
```

## ✨ Features

### 🎯 Core Functionality

- ✅ Month view with full event display
- ✅ Event detail modal on click
- ✅ Previous/Next month navigation
- ✅ "Today" quick navigation button
- ✅ Smart event coloring by status
- ✅ Up to 3 events shown per day
- ✅ "+X more" indicator for additional events
- ✅ Current day highlighting

### 🎨 Visual Design

- ✅ Clean, modern interface
- ✅ Subtle shadows and borders
- ✅ Smooth hover effects
- ✅ Beautiful typography
- ✅ Consistent spacing and alignment
- ✅ Professional color palette

### 📱 Responsive

- ✅ Desktop: Full-featured experience
- ✅ Tablet: Optimized layout
- ✅ Mobile: Compact, touch-friendly design

### 🌓 Dark Mode

- ✅ Automatic system preference detection
- ✅ Optimized contrast for readability
- ✅ Beautiful dark theme colors

### ♿ Accessibility

- ✅ Keyboard navigation support
- ✅ Focus visible states
- ✅ ARIA labels for screen readers
- ✅ Reduced motion support

## 🔍 Troubleshooting

### Events not showing?

- ✅ Verify pipeline returns array of objects
- ✅ Check `date` field is in `YYYY-MM-DD` format
- ✅ Confirm field mappings match your schema
- ✅ Check browser console for errors

### Wrong date format?

- ✅ Date must be: `"2026-01-15"` (ISO format)
- ❌ Not: `"01/15/2026"` or `"15-01-2026"`

### Times not displaying?

- ✅ Use 24-hour format: `"14:30"`
- ❌ Not: `"2:30 PM"` or `"14:30:00"`

### Colors not working?

- ✅ Use hex codes: `"#3b82f6"`
- ❌ Not: `"blue"` or `"rgb(59, 130, 246)"`

## 📚 Documentation

For complete documentation, see:

- **[CALENDAR_SCHEMA_REQUIREMENTS.md](./CALENDAR_SCHEMA_REQUIREMENTS.md)** - Full schema documentation
- **[calendar-usage-examples.ts](./src/components/calendar/calendar-usage-examples.ts)** - Code examples

## 🎉 Ready to Use!

The calendar is now fully integrated into your DynamicPageRenderer. Just:

1. ✅ Create a pipeline that returns event data
2. ✅ Ensure your schema has required fields: `id`, `title`, `date`
3. ✅ Add calendar component to your page configuration
4. ✅ (Optional) Configure field mappings if needed

That's it! Your beautiful, pixel-perfect calendar is ready to go! 🚀

---

**Note**: The calendar component enforces the schema requirements. If required fields are missing, you'll see a helpful error message guiding you to the correct format.
