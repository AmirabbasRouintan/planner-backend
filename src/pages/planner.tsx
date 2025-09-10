import * as React from "react";
import {
  CalendarPlusIcon,
  Edit3Icon,
  SaveIcon,
  XIcon,
  Trash2Icon,
  FileTextIcon
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

// ----- Data model -----
interface DayEvent {
  date: string; // ISO date key (YYYY-MM-DD)
  // SHORT description used in list / side editor
  description?: string;
  // FULL note (notepad) stored separately from description
  note?: string;
}

const STORAGE_KEY = "planner_events_v1";

function formatKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatReadable(d: Date | string | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default function Planner() {
  const [open, setOpen] = React.useState(false); // small drawer
  const [selected, setSelected] = React.useState<Date | undefined>(new Date());
  const [events, setEvents] = React.useState<Record<string, DayEvent>>({});

  // editing for DESCRIPTION (small drawer + side editor)
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [draftDescription, setDraftDescription] = React.useState("");

  // fullscreen editor state for NOTE (separate from description)
  const [fullEditorOpen, setFullEditorOpen] = React.useState<string | null>(
    null
  );
  const [fullDraft, setFullDraft] = React.useState("");

  const minDate = React.useMemo(() => new Date(2025, 0, 1), []);
  const maxDate = React.useMemo(() => new Date(2030, 11, 31), []);

  const isDateDisabled = React.useCallback(
    (date: Date) => date < minDate || date > maxDate,
    [minDate, maxDate]
  );

  // Load events from localStorage. Support backwards-compatible shape where note may not exist.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DayEvent>;
        setEvents(parsed || {});
      }
    } catch (e) {
      console.warn("Failed to load planner events", e);
    }
  }, []);

  // Save entire events map back to storage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.warn("Failed to save planner events", e);
    }
  }, [events]);

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    if (isDateDisabled(d)) return;
    setSelected(d);
  };

  // ----- DESCRIPTION save (small drawer / side editor) -----
  const saveDescription = () => {
    if (!selected && !editingKey) return;
    const key = editingKey || (selected ? formatKey(selected) : null);
    if (!key) return;

    setEvents((prev) => ({
      ...prev,
      [key]: {
        // preserve existing note if present
        ...(prev[key] || {}),
        date: key,
        description: draftDescription
      }
    }));

    // clear small editor state
    setOpen(false);
    setEditingKey(null);
    setDraftDescription("");
  };

  // ----- NOTE save (fullscreen editor) -----
  const saveFullNote = (key?: string) => {
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
  };

  const deleteEvent = (key: string) => {
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
  };

  const cancelDescriptionEdit = () => {
    setEditingKey(null);
    setDraftDescription("");
    setOpen(false);
  };

  const cancelFull = () => {
    setFullEditorOpen(null);
    setFullDraft("");
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentDate = selected || new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const daysArray = React.useMemo(
    () =>
      Array.from(
        { length: daysInMonth },
        (_, i) =>
          new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
      ),
    [currentDate, daysInMonth]
  );

  return (
    <div className="flex flex-col items-center min-h-screen w-full p-4 gap-4">
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

              <DrawerContent className="w-full max-w-md p-4 mx-auto border">
                <DrawerHeader>
                  <DrawerTitle className="text-lg">
                    {editingKey ? "Edit Description" : "Add Description"}
                  </DrawerTitle>
                </DrawerHeader>

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

                <div className="mt-4 grid gap-2">
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
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                        saveDescription();
                      if (e.key === "Escape") cancelDescriptionEdit();
                    }}
                  />

                  <div className="flex justify-end gap-2 mt-1">
                    <Button variant="outline" onClick={cancelDescriptionEdit}>
                      <XIcon className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={saveDescription}
                      disabled={!draftDescription.trim()}
                    >
                      <SaveIcon className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            <Button
              variant="outline"
              onClick={() => {
                // open description editor for today
                const todayKey = formatKey(new Date());
                setSelected(new Date());
                setDraftDescription(events[todayKey]?.description || "");
                setEditingKey(todayKey);
                setOpen(true);
              }}
            >
              Today
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <aside className="md:col-span-2 border rounded-lg p-3 h-[60vh] md:h-[calc(100vh-12rem)] bg-[var(--calendar-date-bg)]">
            <ScrollArea
              className="h-full pr-4 pl-1"
              style={{ scrollbarGutter: "stable" }}
            >
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
                  <Badge>{Object.keys(events).length}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem(STORAGE_KEY);
                      setEvents({});
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {daysArray.map((day) => {
                  const key = formatKey(day);
                  const evt = events[key];
                  const isSelected = selected && formatKey(selected) === key;

                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelected(day)}
                      onClick={() => setSelected(day)}
                      className={`flex items-center gap-3 p-2 mx-1 rounded-lg cursor-pointer transition-shadow ${
                        isSelected
                          ? "ring-1 ring-secondary-foreground"
                          : "hover:shadow"
                      }`}
                      style={{ backgroundColor: 'var(--calendar-date-bg)' }}
                      aria-pressed={isSelected}
                    >
                      <div className="w-12 text-center">
                        <div className="text-lg font-semibold">
                          {day.getDate()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {day.toLocaleString(undefined, { weekday: "short" })}
                        </div>
                      </div>

                      <Separator orientation="vertical" className="h-8" />

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {evt?.description
                            ? evt.description
                            : "No event planned"}
                        </div>
                        {evt && (
                          <div className="flex gap-2 items-center mt-1">
                            <div className="text-xs text-muted-foreground">
                              {evt.date}
                            </div>
                            {evt.note && <Badge variant="outline">Note</Badge>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelected(day);
                                      setDraftDescription(
                                        evt?.description || ""
                                      );
                                      setEditingKey(key);
                                      setOpen(true);
                                    }}
                                    aria-label={`Edit description on ${key}`}
                                  >
                                    <Edit3Icon className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent side="bottom" align="center">
                                  <div className="text-sm">
                                    Edit short description
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Full-screen note button (NEW) */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(day);
                                  setFullDraft(evt?.note || "");
                                  setFullEditorOpen(key);
                                }}
                                aria-label={`Open full note for ${key}`}
                              >
                                <FileTextIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open full‑screen note</p>
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

          <section className="md:col-span-1 border rounded-lg p-3 h-[60vh] bg-[var(--calendar-date-bg)]">
            <ScrollArea
              className="h-full pr-4 pl-2"
              style={{ scrollbarGutter: "stable" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium">Selected</h3>
                  <div className="text-xs text-muted-foreground">
                    {selected ? selected.toLocaleDateString() : "—"}
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
                  rows={6}
                />

                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={() => setDraftDescription("")}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={() => {
                      if (!selected) return;
                      const key = formatKey(selected);
                      setEvents((prev) => ({
                        ...prev,
                        [key]: {
                          ...(prev[key] || {}),
                          date: key,
                          description: draftDescription
                        }
                      }));
                    }}
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
                      : "No full note. Use the note button beside Edit to open the full‑screen notepad."}
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
                  onClick={() => cancelFull()}
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

            <div className="flex-1 p-4">
              <Textarea
                value={fullDraft}
                onChange={(e) => setFullDraft(e.target.value)}
                className="h-full min-h-[30vh] w-full resize-none"
                placeholder={`Write anything you want for ${formatReadable(
                  fullEditorOpen
                )}...`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                    saveFullNote();
                  if (e.key === "Escape") cancelFull();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
