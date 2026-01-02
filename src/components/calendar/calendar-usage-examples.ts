// Example: How to use the Dynamic Calendar in your page configuration

export const exampleCalendarPage = {
  id: "events-page",
  name: "Team Calendar",
  icon: "calendar",
  slug: "calendar",
  order: 5,
  sections: [
    {
      columns: 1,
      gap: 24,
      cells: [
        {
          id: "calendar-cell",
          row: 1,
          column: 1,
          components: [
            {
              id: "team-events-calendar",
              type: "calendar",
              title: "Team Events",
              order: 1,
              dataBinding: {
                kind: "pipeline",
                schemaName: "events", // Your schema name
                pipelineName: "getAllEvents", // Your pipeline name
                params: {
                  // Optional: Add any pipeline parameters
                  teamId: "team-123",
                  year: 2026,
                },
              },
              props: {
                // Optional: Customize height
                height: 800,

                // Optional: Map your schema fields to calendar fields
                // Only needed if your field names differ from defaults
                fieldMappings: {
                  id: "event_id", // Maps your 'event_id' field to calendar 'id'
                  title: "event_name", // Maps your 'event_name' field to calendar 'title'
                  date: "event_date", // Maps your 'event_date' field to calendar 'date'
                  startTime: "start_time",
                  endTime: "end_time",
                  description: "details",
                  color: "event_color",
                  category: "event_type",
                  status: "event_status",
                },

                // Optional: Configure calendar options
                options: {
                  defaultView: "month", // "month" | "week" | "day"
                  firstDayOfWeek: 1, // 0 = Sunday, 1 = Monday
                  allowEventClick: true, // Allow clicking events to view details
                  highlightToday: true, // Highlight the current day
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

// ============================================
// MINIMAL EXAMPLE (Using default field names)
// ============================================

export const minimalCalendarExample = {
  id: "simple-calendar",
  name: "Calendar",
  slug: "calendar",
  sections: [
    {
      columns: 1,
      cells: [
        {
          id: "cal",
          row: 1,
          column: 1,
          components: [
            {
              id: "calendar-1",
              type: "calendar",
              order: 1,
              dataBinding: {
                kind: "pipeline",
                schemaName: "events",
                pipelineName: "getEvents",
              },
            },
          ],
        },
      ],
    },
  ],
};

// ============================================
// EXAMPLE DATA YOUR PIPELINE SHOULD RETURN
// ============================================

export const examplePipelineResponse = [
  {
    // REQUIRED FIELDS
    id: "evt_001",
    title: "Team Standup",
    date: "2026-01-15", // MUST be in YYYY-MM-DD format

    // OPTIONAL FIELDS
    startTime: "09:00", // 24-hour format HH:mm
    endTime: "09:30",
    description: "Daily team synchronization meeting",
    color: "#3b82f6", // Hex color code
    category: "Meeting",
    status: "scheduled", // "scheduled" | "completed" | "cancelled" | "in-progress"
  },
  {
    id: "evt_002",
    title: "Code Review",
    date: "2026-01-15",
    startTime: "14:00",
    endTime: "15:00",
    description: "Review pull requests for sprint 12",
    color: "#8b5cf6",
    category: "Development",
    status: "in-progress",
  },
  {
    id: "evt_003",
    title: "Deploy to Production",
    date: "2026-01-16",
    startTime: "10:00",
    endTime: "11:00",
    description: "Production deployment of v2.1.0",
    status: "completed",
  },
  {
    id: "evt_004",
    title: "Client Meeting - CANCELLED",
    date: "2026-01-17",
    startTime: "15:00",
    endTime: "16:00",
    description: "Quarterly business review - Rescheduled",
    status: "cancelled",
  },
];

// ============================================
// QUICK START CHECKLIST
// ============================================

/**
 * ✅ BEFORE USING THE CALENDAR:
 *
 * 1. Ensure your schema has these REQUIRED fields:
 *    - id (string)
 *    - title (string)
 *    - date (string in YYYY-MM-DD format)
 *
 * 2. Create a pipeline that returns an array of event objects
 *
 * 3. Add calendar component to your page configuration:
 *    - Set type: "calendar"
 *    - Configure dataBinding with schemaName and pipelineName
 *
 * 4. (Optional) Add fieldMappings if your schema uses different field names
 *
 * 5. (Optional) Configure options for calendar behavior
 *
 * 📚 For complete documentation, see CALENDAR_SCHEMA_REQUIREMENTS.md
 */
