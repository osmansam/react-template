import React, { useMemo, useState } from "react";
import { useDynamicCrud, useGetDynamicItems } from "../../utils/dynamic";
import "./dynamic-calendar.css";

export interface CalendarEvent {
  _id: string | number;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  description?: string;
  color?: string; // Hex color code
  category?: string;
  status?: "scheduled" | "completed" | "cancelled" | "in-progress";
}

export interface CalendarConfig {
  title?: string;
  height?: number;
  width?: string;
  schemaName: string;
  // Field mappings for calendar data
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
    firstDayOfWeek?: 0 | 1; // 0 = Sunday, 1 = Monday
    allowEventClick?: boolean;
    highlightToday?: boolean;
    enableCreate?: boolean;
    enableEdit?: boolean;
    enableDelete?: boolean;
  };
}

interface DynamicCalendarProps {
  config: CalendarConfig;
  sourceRevision?: string;
}

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const defaultFieldMappings = {
  id: "_id",
  title: "title",
  date: "date",
  startTime: "startTime",
  endTime: "endTime",
  description: "description",
  color: "color",
  category: "category",
  status: "status",
};

type FormMode = "create" | "edit" | "view";

const DynamicCalendar: React.FC<DynamicCalendarProps> = ({
  config,
  sourceRevision = "",
}) => {
  const {
    schemaName,
    fieldMappings = defaultFieldMappings,
    options = {},
  } = config;

  const {
    // defaultView = "month", // Reserved for future view switching feature
    firstDayOfWeek = 0,
    allowEventClick = true,
    highlightToday = true,
    enableCreate = true,
    enableEdit = true,
    enableDelete = true,
  } = options;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [formMode, setFormMode] = useState<FormMode>("view");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({});

  // Fetch data from schema
  const rawData = useGetDynamicItems<Record<string, unknown>>(
    schemaName,
    {},
    sourceRevision,
  );
  const { createDynamicItem, updateDynamicItem, deleteDynamicItem } =
    useDynamicCrud<CalendarEvent>(schemaName);

  // Check loading state
  const loading = !rawData;
  const error = false;

  // Transform raw data to calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    if (!rawData || !Array.isArray(rawData)) return [];

    return rawData.map((item) => ({
      _id: item[fieldMappings.id || "_id"] as string | number,
      title: String(item[fieldMappings.title || "title"] || "Untitled"),
      date: String(item[fieldMappings.date || "date"] || ""),
      startTime: item[fieldMappings.startTime || "startTime"] as
        | string
        | undefined,
      endTime: item[fieldMappings.endTime || "endTime"] as string | undefined,
      description: item[fieldMappings.description || "description"] as
        | string
        | undefined,
      color: item[fieldMappings.color || "color"] as string | undefined,
      category: item[fieldMappings.category || "category"] as
        | string
        | undefined,
      status: item[fieldMappings.status || "status"] as
        | CalendarEvent["status"]
        | undefined,
    }));
  }, [rawData, fieldMappings]);

  // Calendar navigation helpers
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days for month view
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);

    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const offset = (dayOfWeek - firstDayOfWeek + 7) % 7;
    startDate.setDate(startDate.getDate() - offset);

    const days: Date[] = [];
    const totalDays = 42; // 6 rows x 7 days

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => event.date === dateStr);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (allowEventClick) {
      setSelectedEvent(event);
      setFormMode("view");
      setFormData(event);
    }
  };

  const handleDayClick = (date: Date) => {
    if (enableCreate) {
      const dateStr = date.toISOString().split("T")[0];
      setSelectedDate(dateStr);
      setFormMode("create");
      setFormData({
        date: dateStr,
        title: "",
        status: "scheduled",
      });
      setSelectedEvent(null);
    }
  };

  const handleEdit = () => {
    if (selectedEvent && enableEdit) {
      setFormMode("edit");
      setFormData(selectedEvent);
    }
  };

  const handleDelete = async () => {
    if (selectedEvent && enableDelete) {
      if (window.confirm("Are you sure you want to delete this event?")) {
        try {
          deleteDynamicItem(selectedEvent._id);
          setSelectedEvent(null);
          setFormMode("view");
        } catch (error) {
          console.error("Failed to delete event:", error);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (formMode === "create") {
        createDynamicItem(formData as Partial<CalendarEvent>);
      } else if (formMode === "edit" && selectedEvent) {
        updateDynamicItem(selectedEvent._id, formData);
      }

      // Close modal
      setSelectedEvent(null);
      setSelectedDate(null);
      setFormMode("view");
      setFormData({});
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };

  const handleCancel = () => {
    setSelectedEvent(null);
    setSelectedDate(null);
    setFormMode("view");
    setFormData({});
  };

  const getEventColor = (event: CalendarEvent): string => {
    if (event.color) return event.color;

    // Default colors based on status
    switch (event.status) {
      case "completed":
        return "#10b981"; // green
      case "cancelled":
        return "#ef4444"; // red
      case "in-progress":
        return "#f59e0b"; // amber
      default:
        return "#3b82f6"; // blue
    }
  };

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="calendar-spinner" />
        <p>Loading calendar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="calendar-error">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            fill="currentColor"
          />
        </svg>
        <p>Failed to load calendar data</p>
      </div>
    );
  }

  const monthDays = getMonthDays();
  const adjustedDays = [
    ...DAYS_SHORT.slice(firstDayOfWeek),
    ...DAYS_SHORT.slice(0, firstDayOfWeek),
  ];

  return (
    <div className="dynamic-calendar-container">
      {config.title && (
        <div className="calendar-title">
          <h2>{config.title}</h2>
        </div>
      )}

      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <button
            className="calendar-nav-button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="calendar-nav-button"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 12L10 8L6 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h3 className="calendar-month-year">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
        </div>

        <div className="calendar-header-right">
          <button className="calendar-today-button" onClick={goToToday}>
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day headers */}
        {adjustedDays.map((day, index) => (
          <div key={`header-${index}`} className="calendar-day-header">
            <span className="day-name-full">
              {DAYS_LONG[(index + firstDayOfWeek) % 7]}
            </span>
            <span className="day-name-short">{day}</span>
          </div>
        ))}

        {/* Calendar days */}
        {monthDays.map((date, index) => {
          const dateEvents = getEventsForDate(date);
          const isTodayDate = isToday(date);
          const isCurrentMonthDate = isCurrentMonth(date);

          return (
            <div
              key={`day-${index}`}
              className={`calendar-day ${
                !isCurrentMonthDate ? "other-month" : ""
              } ${isTodayDate && highlightToday ? "today" : ""} ${
                enableCreate ? "clickable" : ""
              }`}
              onClick={() => isCurrentMonthDate && handleDayClick(date)}
            >
              <div className="calendar-day-number">
                <span>{date.getDate()}</span>
              </div>
              <div
                className="calendar-day-events"
                onClick={(e) => e.stopPropagation()}
              >
                {dateEvents.slice(0, 3).map((event) => (
                  <div
                    key={event._id}
                    className="calendar-event"
                    style={{
                      borderLeftColor: getEventColor(event),
                      backgroundColor: `${getEventColor(event)}10`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                  >
                    <div className="event-time">
                      {event.startTime && <span>{event.startTime}</span>}
                    </div>
                    <div className="event-title">{event.title}</div>
                  </div>
                ))}
                {dateEvents.length > 3 && (
                  <div className="calendar-event-more">
                    +{dateEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Modal - View/Edit/Delete */}
      {selectedEvent && formMode !== "create" && (
        <div className="calendar-modal-overlay" onClick={handleCancel}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-modal-header">
              <h3>
                {formMode === "edit" ? "Edit Event" : selectedEvent.title}
              </h3>
              <button
                className="calendar-modal-close"
                onClick={handleCancel}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {formMode === "view" ? (
              <>
                <div className="calendar-modal-content">
                  <div className="event-detail-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="2"
                        y="3"
                        width="12"
                        height="11"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                      />
                      <path
                        d="M2 6H14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M5 1.5V4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M11 1.5V4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>
                      {new Date(selectedEvent.date).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>

                  {(selectedEvent.startTime || selectedEvent.endTime) && (
                    <div className="event-detail-row">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                        />
                        <path
                          d="M8 4V8L10.5 10.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>
                        {selectedEvent.startTime}
                        {selectedEvent.endTime && ` - ${selectedEvent.endTime}`}
                      </span>
                    </div>
                  )}

                  {selectedEvent.category && (
                    <div className="event-detail-row">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M2 5L8 2L14 5V11L8 14L2 11V5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                        />
                      </svg>
                      <span>{selectedEvent.category}</span>
                    </div>
                  )}

                  {selectedEvent.status && (
                    <div className="event-detail-row">
                      <div
                        className="status-indicator"
                        style={{
                          backgroundColor: getEventColor(selectedEvent),
                        }}
                      />
                      <span className="status-text">
                        {selectedEvent.status}
                      </span>
                    </div>
                  )}

                  {selectedEvent.description && (
                    <div className="event-description">
                      <p>{selectedEvent.description}</p>
                    </div>
                  )}
                </div>
                <div className="calendar-modal-actions">
                  {enableEdit && (
                    <button
                      className="calendar-action-button edit"
                      onClick={handleEdit}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M11.333 2L14 4.667l-9.333 9.333H2v-2.667L11.333 2z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                      Edit
                    </button>
                  )}
                  {enableDelete && (
                    <button
                      className="calendar-action-button delete"
                      onClick={handleDelete}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="calendar-modal-form">
                <div className="form-field">
                  <label htmlFor="event-title">Title *</label>
                  <input
                    id="event-title"
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Event title"
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="event-start-time">Start Time</label>
                    <input
                      id="event-start-time"
                      type="time"
                      value={formData.startTime || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="event-end-time">End Time</label>
                    <input
                      id="event-end-time"
                      type="time"
                      value={formData.endTime || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="event-category">Category</label>
                  <input
                    id="event-category"
                    type="text"
                    value={formData.category || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g., Meeting, Task"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="event-status">Status</label>
                  <select
                    id="event-status"
                    value={formData.status || "scheduled"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as CalendarEvent["status"],
                      })
                    }
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="event-color">Color</label>
                  <input
                    id="event-color"
                    type="color"
                    value={formData.color || "#3b82f6"}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="event-description">Description</label>
                  <textarea
                    id="event-description"
                    rows={3}
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Event details..."
                  />
                </div>

                <div className="calendar-modal-actions">
                  <button
                    type="button"
                    className="calendar-action-button cancel"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="calendar-action-button save">
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {formMode === "create" && selectedDate && (
        <div className="calendar-modal-overlay" onClick={handleCancel}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-modal-header">
              <h3>New Event</h3>
              <button
                className="calendar-modal-close"
                onClick={handleCancel}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="calendar-modal-form">
              <div className="form-field">
                <label htmlFor="new-event-date">Date *</label>
                <input
                  id="new-event-date"
                  type="date"
                  required
                  value={formData.date || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor="new-event-title">Title *</label>
                <input
                  id="new-event-title"
                  type="text"
                  required
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Event title"
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="new-event-start-time">Start Time</label>
                  <input
                    id="new-event-start-time"
                    type="time"
                    value={formData.startTime || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="new-event-end-time">End Time</label>
                  <input
                    id="new-event-end-time"
                    type="time"
                    value={formData.endTime || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="new-event-category">Category</label>
                <input
                  id="new-event-category"
                  type="text"
                  value={formData.category || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Meeting, Task"
                />
              </div>

              <div className="form-field">
                <label htmlFor="new-event-status">Status</label>
                <select
                  id="new-event-status"
                  value={formData.status || "scheduled"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as CalendarEvent["status"],
                    })
                  }
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="new-event-color">Color</label>
                <input
                  id="new-event-color"
                  type="color"
                  value={formData.color || "#3b82f6"}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor="new-event-description">Description</label>
                <textarea
                  id="new-event-description"
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Event details..."
                />
              </div>

              <div className="calendar-modal-actions">
                <button
                  type="button"
                  className="calendar-action-button cancel"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button type="submit" className="calendar-action-button save">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCalendar;
