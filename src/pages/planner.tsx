import * as React from "react";
import {
  CalendarPlusIcon,
  Edit3Icon,
  SaveIcon,
  XIcon,
  Trash2Icon,
  FileTextIcon,
  CheckCircleIcon,
  BellIcon,
  DownloadIcon,
  UploadIcon,
  RotateCcwIcon,
  SearchIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable";
// ----- Data model -----
interface Reminder {
  time: string; // e.g., "1day", "2hours", "30minutes"
  enabled: boolean;
}
interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  endDate?: string; // ISO date
}
interface DayEvent {
  date: string; // ISO date key (YYYY-MM-DD)
  description?: string;
  note?: string;
  category?: string;
  completed?: boolean;
  reminder?: Reminder;
  recurrence?: RecurrenceRule;
}
const STORAGE_KEY = "planner_events_v2";
const CATEGORIES = {
  work: { name: "Work", color: "#ef4444" },
  personal: { name: "Personal", color: "#3b82f6" },
  study: { name: "Study", color: "#10b981" },
  travel: { name: "Travel", color: "#f59e0b" },
  health: { name: "Health", color: "#8b5cf6" },
  other: { name: "Other", color: "#6b7280" }
} as const;
const REMINDER_OPTIONS = [
  { value: "30minutes", label: "30 minutes before" },
  { value: "1hour", label: "1 hour before" },
  { value: "2hours", label: "2 hours before" },
  { value: "1day", label: "1 day before" },
  { value: "2days", label: "2 days before" }
];
const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
];

// FIXED: Added validation to handle invalid dates
function formatKey(d: Date | string | number) {
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

// FIXED: Added validation to handle invalid dates
function formatReadable(d: Date | string | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function generateRecurringEvents(
  baseEvent: DayEvent,
  endDate: Date
): DayEvent[] {
  if (!baseEvent.recurrence) return [baseEvent];
  const events: DayEvent[] = [];
  const startDate = new Date(baseEvent.date);
  const frequency = baseEvent.recurrence.frequency;
  const interval = baseEvent.recurrence.interval || 1;
  const recurrenceEndDate = baseEvent.recurrence.endDate
    ? new Date(baseEvent.recurrence.endDate)
    : endDate;
  const currentDate = new Date(startDate);
  while (currentDate <= recurrenceEndDate) {
    events.push({
      ...baseEvent,
      date: formatKey(currentDate)
    });
    // Increment date based on recurrence rule
    switch (frequency) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7 * interval);
        break;
      case "monthly":
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case "yearly":
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
    }
  }
  return events;
}

function checkReminders(events: Record<string, DayEvent>) {
  const now = new Date();
  Object.values(events).forEach((event) => {
    if (event.reminder && event.reminder.enabled) {
      const eventDate = new Date(event.date);
      const reminderTime = new Date(eventDate);
      // Calculate reminder time based on setting
      switch (event.reminder.time) {
        case "30minutes":
          reminderTime.setMinutes(reminderTime.getMinutes() - 30);
          break;
        case "1hour":
          reminderTime.setHours(reminderTime.getHours() - 1);
          break;
        case "2hours":
          reminderTime.setHours(reminderTime.getHours() - 2);
          break;
        case "1day":
          reminderTime.setDate(reminderTime.getDate() - 1);
          break;
        case "2days":
          reminderTime.setDate(reminderTime.getDate() - 2);
          break;
      }
      // Check if it's time to show the reminder
      if (now >= reminderTime && now < eventDate) {
        if (Notification.permission === "granted") {
          new Notification(`Reminder: ${event.description || "Event"}`, {
            body: `Your event is coming up on ${formatReadable(event.date)}`,
            icon: "/icon-192.png"
          });
        }
      }
    }
  });
}

function exportEventsToJSON(events: Record<string, DayEvent>) {
  const dataStr = JSON.stringify(events, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
    dataStr
  )}`;
  const exportFileDefaultName = `planner-export-${
    new Date().toISOString().split("T")[0]
  }.json`;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function exportEventsToCSV(events: Record<string, DayEvent>) {
  const eventsArray = Object.values(events);
  let csvContent = "Date,Description,Category,Completed\n";
  eventsArray.forEach((event) => {
    csvContent += `"${event.date}","${event.description || ""}","${
      event.category || ""
    }","${event.completed ? "Yes" : "No"}"\n`;
  });
  const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(
    csvContent
  )}`;
  const exportFileDefaultName = `planner-export-${
    new Date().toISOString().split("T")[0]
  }.csv`;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function importEventsFromFile(
  file: File,
  callback: (events: Record<string, DayEvent>) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      let events: Record<string, DayEvent> = {};
      if (file.name.endsWith(".json")) {
        events = JSON.parse(content);
      } else if (file.name.endsWith(".csv")) {
        // Improved CSV parsing
        const lines = content.split("\n").map(
          (line) => line.replace(/^"(.*)"$/, "$1") // Remove surrounding quotes if present
        );
        // Find column indexes by header name
        const headers = lines[0].split(",");
        const dateIndex = headers.findIndex((h) => h.toLowerCase() === "date");
        const descriptionIndex = headers.findIndex(
          (h) => h.toLowerCase() === "description"
        );
        const categoryIndex = headers.findIndex(
          (h) => h.toLowerCase() === "category"
        );
        const completedIndex = headers.findIndex(
          (h) => h.toLowerCase() === "completed"
        );
        // Check if required columns exist
        if (dateIndex === -1 || descriptionIndex === -1) {
          throw new Error("CSV file must contain Date and Description columns");
        }
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i]) continue;
          const values = lines[i].split(",").map(
            (value) => value.replace(/^"(.*)"$/, "$1") // Remove surrounding quotes
          );
          // Ensure we have enough columns
          if (values.length < Math.max(dateIndex, descriptionIndex) + 1) {
            continue;
          }
          const date = values[dateIndex];
          // Create event only if date is valid
          if (date && !isNaN(new Date(date).getTime())) {
            events[date] = {
              date: date,
              description: values[descriptionIndex] || "",
              category: values[categoryIndex] || "",
              completed:
                completedIndex !== -1 && values[completedIndex]
                  ? values[completedIndex].toLowerCase() === "yes" ||
                    values[completedIndex] === "1"
                  : false
            };
          }
        }
      }
      callback(events);
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Failed to import events. Please check the file format.");
    }
  };
  reader.readAsText(file);
}

export default function Planner() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Date | undefined>(new Date());
  const [events, setEvents] = React.useState<Record<string, DayEvent>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = React.useState<string>("all");
  const [showCompleted, setShowCompleted] = React.useState(true);

  // editing for DESCRIPTION (small drawer + side editor)
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [draftDescription, setDraftDescription] = React.useState("");
  const [draftCategory, setDraftCategory] = React.useState("_none_");
  const [draftReminder, setDraftReminder] = React.useState("_none_");
  const [draftRecurrence, setDraftRecurrence] = React.useState("none");
  const [draftCompleted, setDraftCompleted] = React.useState(false);

  // fullscreen editor state for NOTE (separate from description)
  const [fullEditorOpen, setFullEditorOpen] = React.useState<string | null>(
    null
  );
  const [fullDraft, setFullDraft] = React.useState("");
  const [markdownPreview, setMarkdownPreview] = React.useState(false);

  // FIXED: Changed to include current year so Today button works
  const minDate = React.useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1); // Allow dates from 1 year ago
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const maxDate = React.useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 5); // Allow dates up to 5 years in future
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // FIXED: Added clampDate function to ensure dates stay within range
  const clampDate = React.useCallback(
    (date: Date) => {
      return new Date(
        Math.min(Math.max(date.getTime(), minDate.getTime()), maxDate.getTime())
      );
    },
    [minDate, maxDate]
  );

  const isDateDisabled = React.useCallback(
    (date: Date) => date < minDate || date > maxDate,
    [minDate, maxDate]
  );

  // FIXED: Updated to use clampDate and handle invalid dates
  const handleDateSelect = React.useCallback(
    (d: Date | undefined) => {
      if (!d || isNaN(d.getTime())) return;
      const clampedDate = clampDate(d);
      setSelected(clampedDate);
    },
    [clampDate]
  );

  // Load events from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DayEvent>;
        setEvents(parsed || {});
      }

      // FIXED: Initialize selected date to a valid date within range
      setSelected(clampDate(new Date()));
    } catch (e) {
      console.warn("Failed to load planner events", e);
      setSelected(clampDate(new Date()));
    }
  }, [clampDate]);

  // Save events to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.warn("Failed to save planner events", e);
    }
  }, [events]);

  // Check for reminders periodically
  React.useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Check reminders every minute
    const interval = setInterval(() => {
      checkReminders(events);
    }, 60000);
    // Initial check
    checkReminders(events);
    return () => clearInterval(interval);
  }, [events]);

  // FIXED: Added null check for selected
  const currentDate = React.useMemo(
    () => selected || clampDate(new Date()),
    [selected, clampDate]
  );
  const currentYear = React.useMemo(
    () => currentDate.getFullYear(),
    [currentDate]
  );
  const currentMonth = React.useMemo(
    () => currentDate.toLocaleString("default", { month: "long" }),
    [currentDate]
  );
  const daysInMonth = React.useMemo(
    () =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate(),
    [currentDate]
  );
  const daysArray = React.useMemo(
    () =>
      Array.from(
        { length: daysInMonth },
        (_, i) =>
          new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
      ),
    [currentDate, daysInMonth]
  );

  // Filter events based on search, category, and date range
  const filteredEvents = React.useMemo(() => {
    let filtered = { ...events };
    // Apply search filter
    if (searchQuery) {
      filtered = Object.fromEntries(
        Object.entries(events).filter(
          ([, event]) =>
            (event.description || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            (event.note || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(
          ([, event]) => event.category === categoryFilter
        )
      );
    }
    // Apply completed filter
    if (!showCompleted) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, event]) => !event.completed)
      );
    }
    // Apply date range filter
    if (dateRangeFilter !== "all") {
      const today = new Date();
      const startDate = new Date(today);
      const endDate = new Date(today);
      switch (dateRangeFilter) {
        case "today":
          // Just today
          break;
        case "week":
          endDate.setDate(today.getDate() + 7);
          break;
        case "month":
          endDate.setMonth(today.getMonth() + 1);
          break;
        case "next7days":
          endDate.setDate(today.getDate() + 7);
          break;
        case "next30days":
          endDate.setDate(today.getDate() + 30);
          break;
      }
      if (dateRangeFilter !== "today") {
        filtered = Object.fromEntries(
          Object.entries(filtered).filter(([, event]) => {
            const eventDate = new Date(event.date);
            return eventDate >= startDate && eventDate <= endDate;
          })
        );
      } else {
        const todayKey = formatKey(today);
        filtered = Object.fromEntries(
          Object.entries(filtered).filter(([key]) => key === todayKey)
        );
      }
    }
    return filtered;
  }, [events, searchQuery, categoryFilter, dateRangeFilter, showCompleted]);

  // Generate recurring events for display
  const eventsWithRecurrence = React.useMemo(() => {
    const allEvents = { ...events };
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setFullYear(endDate.getFullYear() + 1); // Show recurring events for next year
    // Generate recurring events
    Object.values(events).forEach((event) => {
      if (event.recurrence) {
        const recurringEvents = generateRecurringEvents(event, endDate);
        recurringEvents.forEach((recurringEvent) => {
          if (
            !allEvents[recurringEvent.date] ||
            recurringEvent.date === event.date
          ) {
            allEvents[recurringEvent.date] = recurringEvent;
          }
        });
      }
    });
    return allEvents;
  }, [events]);

  // Get events for the current view (with filters applied)
  const viewEvents =
    dateRangeFilter === "all" ? eventsWithRecurrence : filteredEvents;

  // ----- DESCRIPTION save (small drawer / side editor) -----
  const saveDescription = React.useCallback(() => {
    if (!selected && !editingKey) return;
    const key = editingKey || (selected ? formatKey(selected) : null);
    if (!key) return;

    const eventData: DayEvent = {
      date: key,
      description: draftDescription,
      category: draftCategory !== "_none_" ? draftCategory : undefined,
      completed: draftCompleted,
      note: events[key]?.note // Preserve existing note
    };

    // Add reminder if set
    if (draftReminder !== "_none_") {
      eventData.reminder = {
        time: draftReminder,
        enabled: true
      };
    }

    // Add recurrence if set
    if (draftRecurrence !== "none") {
      eventData.recurrence = {
        frequency: draftRecurrence as "daily" | "weekly" | "monthly" | "yearly",
        interval: 1
      };
    }

    setEvents((prev) => ({
      ...prev,
      [key]: eventData
    }));

    // clear small editor state
    setOpen(false);
    setEditingKey(null);
    setDraftDescription("");
    setDraftCategory("_none_");
    setDraftReminder("_none_");
    setDraftRecurrence("none");
    setDraftCompleted(false);
  }, [
    selected,
    editingKey,
    draftDescription,
    draftCategory,
    draftReminder,
    draftRecurrence,
    draftCompleted,
    events
  ]);

  // ----- NOTE save (fullscreen editor) -----
  const saveFullNote = React.useCallback(
    (key?: string) => {
      const k = key || fullEditorOpen;
      if (!k) return;
      setEvents((prev) => ({
        ...prev,
        [k]: {
          ...(prev[k] || {}),
          date: k,
          note: fullDraft
        }
      }));
      setFullEditorOpen(null);
      setFullDraft("");
      setMarkdownPreview(false);
    },
    [fullEditorOpen, fullDraft]
  );

  const deleteEvent = React.useCallback(
    (key: string) => {
      setEvents((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      if (editingKey === key) {
        setEditingKey(null);
        setDraftDescription("");
        setOpen(false);
      }
      if (fullEditorOpen === key) {
        setFullEditorOpen(null);
        setFullDraft("");
      }
    },
    [editingKey, fullEditorOpen]
  );

  const cancelDescriptionEdit = React.useCallback(() => {
    setEditingKey(null);
    setDraftDescription("");
    setDraftCategory("_none_");
    setDraftReminder("_none_");
    setDraftRecurrence("none");
    setDraftCompleted(false);
    setOpen(false);
  }, []);

  const cancelFull = React.useCallback(() => {
    setFullEditorOpen(null);
    setFullDraft("");
    setMarkdownPreview(false);
  }, []);

  // Memoize event count for badge
  const eventCount = React.useMemo(
    () => Object.keys(viewEvents).length,
    [viewEvents]
  );

  // Handler for today button
  const handleTodayClick = React.useCallback(() => {
    const today = new Date();
    const clampedToday = clampDate(today);
    setSelected(clampedToday);
    const todayKey = formatKey(clampedToday);
    const todayEvent = events[todayKey];

    setDraftDescription(todayEvent?.description || "");
    setDraftCategory(todayEvent?.category || "_none_");
    setDraftReminder(todayEvent?.reminder?.time || "_none_");
    setDraftRecurrence(todayEvent?.recurrence?.frequency || "none");
    setDraftCompleted(todayEvent?.completed || false);

    setEditingKey(todayKey);
    setOpen(true);
  }, [events, clampDate]);

  // Handler for saving from side editor
  const saveFromSideEditor = React.useCallback(() => {
    if (!selected) return;
    const key = formatKey(selected);

    const eventData: DayEvent = {
      date: key,
      description: draftDescription,
      category: draftCategory !== "_none_" ? draftCategory : undefined,
      completed: draftCompleted,
      note: events[key]?.note // Preserve existing note
    };

    // Add reminder if set
    if (draftReminder !== "_none_") {
      eventData.reminder = {
        time: draftReminder,
        enabled: true
      };
    }

    setEvents((prev) => ({
      ...prev,
      [key]: eventData
    }));
  }, [
    selected,
    draftDescription,
    draftCategory,
    draftReminder,
    draftCompleted,
    events
  ]);

  // Toggle event completion
  const toggleCompletion = React.useCallback((key: string) => {
    setEvents((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        completed: !prev[key]?.completed
      }
    }));
  }, []);

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importEventsFromFile(file, (importedEvents) => {
        if (
          window.confirm(
            "Import events? This will merge with your existing events."
          )
        ) {
          setEvents((prev) => ({ ...prev, ...importedEvents }));
        }
      });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen w-full p-4 gap-4 pb-20 md:pb-16">
      <div className="w-full max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Planner</h1>
            <p className="text-sm text-muted-foreground">
              Quickly add and manage events :3
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="date" className="sr-only">
              Select date
            </Label>
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className="flex items-center gap-2"
                  aria-haspopup="dialog"
                >
                  <CalendarPlusIcon />
                  <span className="hidden sm:inline">
                    {selected ? selected.toLocaleDateString() : "Choose date"}
                  </span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="w-full max-w-md p-0 mx-auto border">
                <DrawerHeader className="text-left px-4 pt-4">
                  <DrawerTitle className="text-lg">
                    {editingKey ? "Edit Event" : "Add Event"}
                  </DrawerTitle>
                </DrawerHeader>
                
                <div className="px-4"> {/* Increased pb to ensure content doesn't overlap with buttons */}
                  <Calendar
                    mode="single"
                    selected={selected}
                    captionLayout="dropdown"
                    fromYear={2025}
                    toYear={2030}
                    onSelect={handleDateSelect}
                    disabled={isDateDisabled}
                    className="mx-auto [--cell-size:clamp(28px,calc(100vw/9),48px)]"
                  />
                  
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder={`What will you do on ${
                          selected
                            ? selected.toLocaleDateString()
                            : "the selected date"
                        }?`}
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        rows={3}
                        className="w-full"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                            saveDescription();
                          if (e.key === "Escape") cancelDescriptionEdit();
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={draftCategory}
                          onValueChange={setDraftCategory}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">None</SelectItem>
                            {Object.entries(CATEGORIES).map(([id, category]) => (
                              <SelectItem key={id} value={id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reminder">Reminder</Label>
                        <Select
                          value={draftReminder}
                          onValueChange={setDraftReminder}
                        >
                          <SelectTrigger id="reminder">
                            <SelectValue placeholder="No reminder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">None</SelectItem>
                            {REMINDER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recurrence">Recurrence</Label>
                      <Select
                        value={draftRecurrence}
                        onValueChange={setDraftRecurrence}
                      >
                        <SelectTrigger id="recurrence">
                          <SelectValue placeholder="Does not repeat" />
                        </SelectTrigger>
                        <SelectContent className="max-h-40 overflow-y-auto">
                          <SelectItem value="none">Does not repeat</SelectItem>
                          {RECURRENCE_OPTIONS.slice(1).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="completed"
                          checked={draftCompleted}
                          onCheckedChange={(checked) =>
                            setDraftCompleted(checked === true)
                          }
                        />
                        <Label htmlFor="completed" className="cursor-pointer">
                          Mark as completed
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Completed events will be shown with a strikethrough. 
                        You can toggle this later from the event list.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Fixed button area at the bottom */}
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 w-full max-w-md mx-auto">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelDescriptionEdit}>
                      <XIcon className="h-4 w-4" />
                      <span className="ml-2">Cancel</span>
                    </Button>
                    <Button
                      onClick={saveDescription}
                      disabled={!draftDescription.trim()}
                    >
                      <SaveIcon className="h-4 w-4" />
                      <span className="ml-2">Save</span>
                    </Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
            <Button variant="outline" onClick={handleTodayClick}>
              Today
            </Button>
            {/* Export buttons */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => exportEventsToJSON(events)}
                  >
                    Export as JSON
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => exportEventsToCSV(events)}
                  >
                    Export as CSV
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {/* Import button */}
            <Button variant="outline" size="icon" asChild>
              <Label htmlFor="import-file" className="cursor-pointer">
                <UploadIcon className="h-4 w-4" />
                <input
                  id="import-file"
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </Label>
            </Button>
          </div>
        </div>
        {/* Search and filter bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {Object.entries(CATEGORIES).map(([id, category]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="next7days">Next 7 days</SelectItem>
                <SelectItem value="next30days">Next 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showCompleted ? "default" : "outline"}
              size="icon"
              onClick={() => setShowCompleted(!showCompleted)}
              title={showCompleted ? "Hide completed" : "Show completed"}
            >
              <CheckCircleIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <aside className="md:col-span-2 border rounded-lg p-3 h-[50vh] md:h-[calc(100vh-16rem)] bg-[var(--calendar-date-bg)]">
            <ScrollArea
              className="h-full pr-4"
              style={{ scrollbarGutter: "stable" }}
            >
              <div className="sticky top-0 mb-1 z-10 bg-[var(--calendar-date-bg)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-lg font-medium">
                      {currentMonth} {currentYear}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tap a day to select - days with events are highlighted
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{eventCount}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to clear all events?"
                          )
                        ) {
                          localStorage.removeItem(STORAGE_KEY);
                          setEvents({});
                        }
                      }}
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                {daysArray.map((day) => {
                  const key = formatKey(day);
                  const evt = viewEvents[key];
                  const isSelected = selected && formatKey(selected) === key;
                  const isToday = formatKey(new Date()) === key;
                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleDateSelect(day)
                      }
                      // FIXED: Changed to use handleDateSelect instead of setSelected directly
                      onClick={() => handleDateSelect(day)}
                      className={`flex items-center gap-3 p-2 mx-1 rounded-lg cursor-pointer transition-shadow ${
                        isSelected
                          ? "ring-1 ring-secondary-foreground"
                          : "hover:shadow"
                      } ${isToday ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                      style={{ backgroundColor: "var(--calendar-date-bg)" }}
                      aria-pressed={isSelected}
                    >
                      <div className="w-12 text-center">
                        <div
                          className={`text-lg font-semibold ${
                            isToday ? "text-blue-600" : ""
                          }`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {day.toLocaleString(undefined, { weekday: "short" })}
                        </div>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium truncate ${
                            evt?.completed ? "line-through opacity-70" : ""
                          }`}
                        >
                          {evt?.description
                            ? evt.description
                            : "No event planned"}
                        </div>
                        {evt && (
                          <div className="flex flex-wrap gap-1 items-center mt-1">
                            <div className="text-xs text-muted-foreground">
                              {evt.date}
                            </div>
                            {evt.category && (
                              <Badge
                                variant="outline"
                                className="text-xs py-0 px-1.5"
                                style={{
                                  backgroundColor: `${
                                    CATEGORIES[
                                      evt.category as keyof typeof CATEGORIES
                                    ]?.color
                                  }20`,
                                  borderColor:
                                    CATEGORIES[
                                      evt.category as keyof typeof CATEGORIES
                                    ]?.color,
                                  color:
                                    CATEGORIES[
                                      evt.category as keyof typeof CATEGORIES
                                    ]?.color
                                }}
                              >
                                {
                                  CATEGORIES[
                                    evt.category as keyof typeof CATEGORIES
                                  ]?.name
                                }
                              </Badge>
                            )}
                            {evt.note && <Badge variant="outline" className="text-xs py-0 px-1.5">Note</Badge>}
                            {evt.reminder && (
                              <Badge variant="outline" className="gap-1 text-xs py-0 px-1.5">
                                <BellIcon className="h-2.5 w-2.5" />
                                Reminder
                              </Badge>
                            )}
                            {evt.recurrence && (
                              <Badge variant="outline" className="gap-1 text-xs py-0 px-1.5">
                                <RotateCcwIcon className="h-2.5 w-2.5" />
                                {evt.recurrence.frequency}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {evt && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCompletion(key);
                                  }}
                                  aria-label={
                                    evt.completed
                                      ? "Mark as not completed"
                                      : "Mark as completed"
                                  }
                                >
                                  <CheckCircleIcon
                                    className={`h-4 w-4 ${
                                      evt.completed
                                        ? "text-green-500"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {evt.completed
                                    ? "Completed"
                                    : "Mark as completed"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const dayToSelect = new Date(day); // Create a new Date instance
                                  setSelected(dayToSelect);
                                  setDraftDescription(evt?.description || "");
                                  setDraftCategory(evt?.category || "_none_");
                                  setDraftReminder(evt?.reminder?.time || "_none_");
                                  setDraftRecurrence(
                                    evt?.recurrence?.frequency || "none"
                                  );
                                  setDraftCompleted(evt?.completed || false);
                                  setEditingKey(key);
                                  setOpen(true);
                                }}
                                aria-label={`Edit event on ${key}`}
                              >
                                <Edit3Icon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Full-screen note button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // FIXED: Changed to use handleDateSelect
                                  handleDateSelect(day);
                                  setFullDraft(evt?.note || "");
                                  setFullEditorOpen(key);
                                }}
                                aria-label={`Open full note for ${key}`}
                              >
                                <FileTextIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open fullâ€‘screen note</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {evt && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete event on ${key}?`))
                                      deleteEvent(key);
                                  }}
                                  aria-label={`Delete event on ${key}`}
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>
          <section className="md:col-span-1 border rounded-lg p-3 bg-[var(--calendar-date-bg)]">
            <ScrollArea
              className="pr-4 pl-2 h-auto min-h-fit"
              style={{ scrollbarGutter: "stable" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium">Selected</h3>
                  <div className="text-xs text-muted-foreground">
                    {selected ? selected.toLocaleDateString() : "â€”"}
                  </div>
                </div>
                <div>
                  {selected && events[formatKey(selected)] ? (
                    <Badge>Saved</Badge>
                  ) : (
                    <Badge variant="outline">Empty</Badge>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <Label htmlFor="side-desc">Description</Label>
                <Textarea
                  className="mt-2"
                  id="side-desc"
                  placeholder="Type a short description and press Save"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftDescription("");
                      setDraftCategory("_none_");
                      setDraftReminder("_none_");
                      setDraftRecurrence("none");
                      setDraftCompleted(false);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={saveFromSideEditor}
                    disabled={!selected || !draftDescription.trim()}
                  >
                    Save
                  </Button>
                </div>
                {/* Optionally show a small preview of the note if it exists */}
                <div className="mt-4">
                  <Label>Full note</Label>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {selected && events[formatKey(selected)]?.note
                      ? events[formatKey(selected)]!.note
                      : "No full note. Use the note button beside Edit to open the fullâ€‘screen notepad."}
                  </div>
                </div>
              </div>
              <div className="mt-6 text-sm text-muted-foreground">
                Tips: Description and full notes are stored separately. Press{" "}
                <kbd className="rounded border px-1">Ctrl</kbd> +{" "}
                <kbd className="rounded border px-1">Enter</kbd> to save in
                editors.
              </div>
            </ScrollArea>
          </section>
        </div>
        {/* Fullscreen event editor (separate NOTE field) */}
        {fullEditorOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex items-center justify-between p-4 border-b shadow-sm">
              <div>
                <div className="text-sm text-muted-foreground">
                  Editing note
                </div>
                <div className="text-lg font-semibold">
                  {formatReadable(fullEditorOpen)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMarkdownPreview(!markdownPreview)}
                >
                  {markdownPreview ? "Edit" : "Preview"}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelFull}
                  aria-label="Cancel full editor"
                >
                  <XIcon className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={() => saveFullNote()}
                  disabled={!fullDraft.trim()}
                >
                  <SaveIcon className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="p-4 h-full">
                  {markdownPreview ? (
                    <div className="prose dark:prose-invert max-w-none p-4 border rounded-md h-full overflow-auto">
                      {fullDraft || <em>No content to preview</em>}
                    </div>
                  ) : (
                    <Textarea
                      value={fullDraft}
                      onChange={(e) => setFullDraft(e.target.value)}
                      className="h-full min-h-[30vh] w-full resize-none font-mono"
                      placeholder={`Write anything you want for ${formatReadable(
                        fullEditorOpen
                      )}... (Markdown supported)`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                          saveFullNote();
                        if (e.key === "Escape") cancelFull();
                      }}
                    />
                  )}
                </div>
              </ResizablePanel>
              {!markdownPreview && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={30} minSize={20}>
                    <div className="p-4 h-full overflow-auto">
                      <div className="prose dark:prose-invert max-w-none">
                        <h3>Markdown Preview</h3>
                        <div className="border rounded-md p-4">
                          {fullDraft || <em>No content to preview</em>}
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          <h4>Markdown Tips:</h4>
                          <ul>
                            <li>
                              **Bold** for <strong>bold text</strong>
                            </li>
                            <li>
                              *Italic* for <em>italic text</em>
                            </li>
                            <li># Heading 1</li>
                            <li>## Heading 2</li>
                            <li>- List items</li>
                            <li>[Link](https://example.com)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}
