import * as React from "react";
import { CalendarNotifications } from "@/components/calendar/calendar-notifications";
import {
  format,
  addDays,
  parseISO,
  isSameDay,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  getMonth,
  getYear
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Plus,
  Calendar as CalendarIcon,
  RefreshCw,
  BarChart3,
  CheckSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { fetchAllEvents, fetchTasks, deleteTask, createTask } from "./api";
import { initialEvents } from "./types";
import type { CalendarEvent, CalendarColor } from "./types";
import CalendarDayView from "./CalendarDayView";
import EventCreator from "./EventCreator";
import Checklist from "./Checklist";

const Calendar: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [, setIsLoading] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(false);
  const [showChecklist, setShowChecklist] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Component initialization

  const saveAllAndRefresh = async () => {
    try {
      setIsRefreshing(true);
      setIsLoading(true);
      const fetchedEvents = await fetchAllEvents(token || undefined);

      setEvents(fetchedEvents);
      console.log(
        "All events refreshed from database successfully",
        fetchedEvents
      );

      alert("Calendar data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing events:", error);
      alert("Error refreshing calendar data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch tasks from API on component mount
  React.useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      try {
        const tasksData = await fetchTasks(token || undefined);
        setEvents(tasksData);
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadTasks();
    }
  }, [token, isAuthenticated]);

  const handleCreateEvent = async (newEvent: CalendarEvent) => {
    console.log("Creating new event:", newEvent);
    try {
      setEvents((prev) => [...prev, newEvent]);

      const eventData = newEvent;
      console.log("Event data being sent to API:", eventData);

      const createdTask = await createTask(eventData, token || undefined);

      if (createdTask) {
        setEvents((prev) =>
          prev.map((event) => (event.id === newEvent.id ? createdTask : event))
        );
        console.log("Event created successfully:", createdTask);
      } else {
        console.error("Failed to create event: No response from server");
        setEvents((prev) => prev.filter((event) => event.id !== newEvent.id));
      }
    } catch (error) {
      console.error("Error creating event:", error);
      setEvents((prev) => prev.filter((event) => event.id !== newEvent.id));
    }
    setCreatingEvent(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId, token ?? undefined);
      if (success) {
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event.id !== taskId)
        );
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const exportFileDefaultName = `tasks-${format(
      selectedDate,
      "yyyy-MM-dd"
    )}.txt`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = () => {
    const inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.accept = ".json";

    inputElement.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedEvents = JSON.parse(e.target?.result as string);
            if (Array.isArray(importedEvents)) {
              setEvents((prevEvents) => [...prevEvents, ...importedEvents]);
            }
          } catch (error) {
            console.error("Error parsing imported file:", error);
          }
        };
        reader.readAsText(file);
      }
    };

    inputElement.click();
  };

  const todayEvents = events.filter((event) =>
    isSameDay(parseISO(event.startDate), selectedDate)
  );

  const importantEvents = todayEvents.filter((event) => event.isImportant);

  const isEventCompleted = (e: CalendarEvent) =>
    parseISO(e.endDate).getTime() < Date.now();

  // Force neutral (zinc) color mapping for dots in grayscale theme
  const colorDot: Record<CalendarColor, string> = {
    blue: "bg-zinc-400 ring-zinc-400/20",
    green: "bg-zinc-400 ring-zinc-400/20",
    red: "bg-zinc-400 ring-zinc-400/20",
    yellow: "bg-zinc-400 ring-zinc-400/20",
    purple: "bg-zinc-400 ring-zinc-400/20",
    orange: "bg-zinc-400 ring-zinc-400/20",
    gray: "bg-zinc-400 ring-zinc-400/20"
  };

  // Enhanced keyboard navigation handlers
  React.useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      const target = evt.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("role") === "dialog" ||
          target.getAttribute("data-slot") === "select-trigger" ||
          target.getAttribute("data-slot") === "popover-trigger")
      )
        return;

      switch (evt.key) {
        case "ArrowLeft":
          evt.preventDefault();
          setSelectedDate((d) => addDays(d, -1));
          break;
        case "ArrowRight":
          evt.preventDefault();
          setSelectedDate((d) => addDays(d, 1));
          break;
        case "ArrowUp":
          if (evt.shiftKey) {
            evt.preventDefault();
            setSelectedDate((d) => subMonths(d, 1));
          }
          break;
        case "ArrowDown":
          if (evt.shiftKey) {
            evt.preventDefault();
            setSelectedDate((d) => addMonths(d, 1));
          }
          break;
        case "PageUp":
          evt.preventDefault();
          setSelectedDate((d) => subMonths(d, 1));
          break;
        case "PageDown":
          evt.preventDefault();
          setSelectedDate((d) => addMonths(d, 1));
          break;
        case "Home":
          evt.preventDefault();
          setSelectedDate(new Date());
          break;
        case "t":
        case "T":
          if (!evt.ctrlKey && !evt.metaKey) {
            evt.preventDefault();
            setSelectedDate(new Date());
          }
          break;
        case "s":
        case "S":
          if (!evt.ctrlKey && !evt.metaKey) {
            evt.preventDefault();
            setShowSummary(true);
          }
          break;
        case "c":
        case "C":
          if (!evt.ctrlKey && !evt.metaKey) {
            evt.preventDefault();
            setShowChecklist((v) => !v);
          }
          break;
        case "Escape":
          setShowSummary(false);
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-3 px-3 sm:px-4 md:px-6">
        {/* Header Section */}
        <Card className="mb-4 shadow-lg border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <CardHeader className="py-4 px-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Date Navigation */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                {/* Current Date Display */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                      {format(selectedDate, "EEEE")}
                    </h1>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors justify-start"
                          aria-label="Change month and year"
                        >
                          {format(selectedDate, "MMMM d, yyyy")}
                          <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4" align="start">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">
                              Select Month & Year
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Month
                              </label>
                              <Select
                                value={getMonth(selectedDate).toString()}
                                onValueChange={(value) =>
                                  setSelectedDate(
                                    setMonth(selectedDate, parseInt(value))
                                  )
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {format(new Date(2024, i, 1), "MMMM")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Year
                              </label>
                              <Select
                                value={getYear(selectedDate).toString()}
                                onValueChange={(value) =>
                                  setSelectedDate(
                                    setYear(selectedDate, parseInt(value))
                                  )
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 11 }, (_, i) => {
                                    const year = getYear(new Date()) - 5 + i;
                                    return (
                                      <SelectItem
                                        key={year}
                                        value={year.toString()}
                                      >
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => setSelectedDate(new Date())}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Today
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Separator
                  orientation="vertical"
                  className="h-12 mx-1 hidden sm:flex"
                />

                {/* Navigation Controls */}
                <nav
                  className="flex items-center gap-1 shrink-0 w-full sm:w-auto mt-2 sm:mt-0"
                  aria-label="Date navigation"
                  role="group"
                >
                  {/* Month Navigation */}
                  <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50">
                    <Button
                      onClick={() =>
                        setSelectedDate(subMonths(selectedDate, 1))
                      }
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                      aria-label="Previous month"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-4" />

                    <Button
                      onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <Button
                      onClick={() => setSelectedDate(new Date())}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold hover:bg-background hover:shadow-sm transition-all duration-200 min-w-[60px]"
                      aria-label="Go to today"
                    >
                      Today
                    </Button>

                    <Button
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                      aria-label="Next day"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-4" />

                    <Button
                      onClick={() =>
                        setSelectedDate(addMonths(selectedDate, 1))
                      }
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                      aria-label="Next month"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </nav>
              </div>

              {/* Stats and Actions */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto justify-between lg:justify-end">
                {/* Event Stats */}
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="gap-2 px-3 py-2 text-sm font-medium bg-card/80 backdrop-blur border border-border"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>{todayEvents.length}</span>
                      <span className="hidden xs:inline">events</span>
                    </Badge>
                    {importantEvents.length > 0 && (
                      <Badge className="gap-2 px-3 py-2 text-sm font-medium bg-muted text-foreground border border-border">
                        <Star className="w-4 h-4" />
                        <span>{importantEvents.length}</span>
                        <span className="hidden xs:inline">important</span>
                      </Badge>
                    )}
                  </div>

                  <Separator
                    orientation="vertical"
                    className="h-6 hidden sm:flex"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <CalendarNotifications 
                    events={events.map(event => ({
                      id: event.id,
                      title: event.title,
                      startTime: parseISO(event.startDate),
                      endTime: parseISO(event.endDate)
                    }))} 
                  />

                  <Button
                    onClick={() => setShowChecklist(!showChecklist)}
                    variant={showChecklist ? "default" : "outline"}
                    size="sm"
                    className="h-10 gap-2 px-4 rounded-lg font-medium transition-all duration-200"
                    aria-pressed={showChecklist}
                    aria-label="Toggle checklist"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Checklist</span>
                  </Button>

                  <Button
                    onClick={() => setShowSummary(true)}
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2 px-4 rounded-lg font-medium border border-border hover:bg-muted"
                    aria-label="Show event summary"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Summary</span>
                  </Button>

                  <Button
                    onClick={saveAllAndRefresh}
                    variant="outline"
                    size="sm"
                    disabled={isRefreshing}
                    className="h-10 gap-2 px-4 rounded-lg font-medium border border-border hover:bg-muted disabled:opacity-50 transition-all duration-200"
                    aria-label="Sync calendar data"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isRefreshing ? "animate-spin" : ""
                      }`}
                    />
                    <span className="hidden sm:inline">Sync</span>
                  </Button>

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={handleImport}
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg border border-border hover:bg-muted"
                      aria-label="Import events"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>

                    <Button
                      onClick={handleExport}
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg border border-border hover:bg-muted"
                      aria-label="Export events"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  <Dialog open={creatingEvent} onOpenChange={setCreatingEvent}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="h-10 gap-2 px-4 rounded-lg font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all duration-200"
                        aria-label="Create new event"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">New Event</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl bg-card">
                      <DialogHeader className="p-6 pb-4">
                        <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
                          <div className="p-2 bg-muted rounded-lg">
                            <Plus className="w-6 h-6 text-foreground" />
                          </div>
                          Create New Event
                        </DialogTitle>
                      </DialogHeader>
                      <EventCreator
                        selectedDate={selectedDate}
                        onSave={handleCreateEvent}
                        onCancel={() => setCreatingEvent(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="flex flex-1 gap-4 md:gap-6 flex-col xl:flex-row">
          {/* Calendar View */}
          <div className="flex-1">
            <Card className="shadow-lg border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 overflow-hidden">
              <CardContent className="py-2 pl-2 pr-0">
                <CalendarDayView
                  selectedDate={selectedDate}
                  events={events}
                  setEvents={setEvents}
                  token={token || undefined}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          {showChecklist && (
            <div className="w-full xl:w-96 md:shrink-0 transition-all duration-300">
              <Card className="shadow-lg border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 h-full">
                <CardHeader className="pb-3 pt-4 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
                      <div className="p-2 bg-muted rounded-lg">
                        <CheckSquare className="w-5 h-5 text-foreground" />
                      </div>
                      Daily Checklist
                    </CardTitle>
                    <Button
                      onClick={() => setShowChecklist(false)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 xl:hidden rounded-lg hover:bg-muted"
                      aria-label="Close checklist"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Checklist
                    events={events}
                    setEvents={setEvents}
                    token={token ?? undefined}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl bg-card p-0">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
              <div className="p-2 bg-muted rounded-lg">
                <BarChart3 className="w-6 h-6 text-foreground" />
              </div>
              Event Summary
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <CalendarIcon className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {events.length}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Total Events
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {events.filter((e) => e.isImportant).length}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Important
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <BarChart3 className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {todayEvents.length}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Today
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <CheckSquare className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {
                          events.filter(
                            (e) => parseISO(e.endDate).getTime() < Date.now()
                          ).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Completed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="bg-border" />

            {/* Events List with Show More */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  All Events
                </h3>
                {events.length > 5 && (
                  <Button
                    onClick={() => setShowAll((v) => !v)}
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-lg border border-border hover:bg-muted"
                    aria-label={
                      showAll ? "Show less events" : "Show all events"
                    }
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show All ({events.length})
                      </>
                    )}
                  </Button>
                )}
              </div>

              {events.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-muted/30 border border-dashed border-border">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">
                    No events found
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first event to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...events]
                    .sort(
                      (a, b) =>
                        parseISO(a.startDate).getTime() -
                        parseISO(b.startDate).getTime()
                    )
                    .slice(0, showAll ? events.length : 5)
                    .map((event) => (
                      <Card
                        key={event.id}
                        className="group hover:shadow-lg transition-all duration-300 border border-border hover:border-foreground/20 bg-card/50 backdrop-blur-sm"
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  colorDot[event.color]
                                }`}
                              ></div>
                              <h4 className="font-semibold text-foreground truncate">
                                {event.title}
                              </h4>
                              {event.isImportant && (
                                <Badge className="bg-muted text-foreground border border-border text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Important
                                </Badge>
                              )}
                              {isEventCompleted(event) && (
                                <Badge className="rounded-full border-none bg-zinc-700/10 text-zinc-700 focus-visible:ring-zinc-700/20 dark:bg-zinc-300/10 dark:text-zinc-300 dark:focus-visible:ring-zinc-300/40 text-xs">
                                  <span
                                    className="size-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300 mr-1"
                                    aria-hidden="true"
                                  />
                                  Completed
                                </Badge>
                              )}
                            </div>
                            <Button
                              onClick={() => handleDeleteTask(event.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              aria-label={`Delete ${event.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-xs bg-card/80 border border-border"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                {format(
                                  parseISO(event.startDate),
                                  "HH:mm"
                                )} - {format(parseISO(event.endDate), "HH:mm")}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(parseISO(event.startDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div
        className="sr-only"
        aria-live="polite"
        aria-label="Keyboard shortcuts"
      >
        Keyboard shortcuts: ←/→ navigate days, Shift+↑/↓ or Page Up/Down
        navigate months, Home or T: today, C: checklist, S: summary, Esc: close
        dialogs. Current date: {format(selectedDate, "EEEE, MMMM d, yyyy")}
      </div>
    </div>
  );
};

export default Calendar;
