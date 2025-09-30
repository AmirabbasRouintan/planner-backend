// Calendar.tsx
import * as React from "react";
import { format, parseISO, isSameDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  BarChart3,
  CheckSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllEvents, fetchTasks, deleteTask } from "./api";
import { initialEvents } from "./types";
import type { CalendarEvent } from "./types";
import CalendarDayView from "./CalendarDayView";
import Checklist from "./Checklist";
import { CalendarNav } from "./CalendarNav";

const Calendar: React.FC = () => {
  const { token, isAuthenticated, user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [, setIsLoading] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(false);
  const [showChecklist, setShowChecklist] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("calendar");
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Handle scroll for shadow
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calendar functionality
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

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const success = await deleteTask(eventId, token ?? undefined);
      if (success) {
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event.id !== eventId)
        );
      } else {
        console.error("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
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

  // Note save function
  const handleSaveNote = React.useCallback(async () => {
    if (!quickNote.trim()) return;
    
    try {
      // Save to localStorage as permanent note
      const newNote = {
        id: `note_${Date.now()}`,
        title: 'Permanent Note',
        content: quickNote.trim(),
        date: format(selectedDate, "yyyy-MM-dd"),
        timestamp: Date.now()
      };
      
      const existingNotes = JSON.parse(localStorage.getItem('permanent-notes') || '[]');
      const updatedNotes = [newNote, ...existingNotes];
      localStorage.setItem('permanent-notes', JSON.stringify(updatedNotes));
      
      console.log("Note saved:", newNote);
    } catch (error) {
      console.error('Error saving note to localStorage:', error);
    }
    
    // Reset and close dialog
    setQuickNote("");
    setNotePopupOpen(false);
  }, [quickNote, selectedDate]);

  // Apply formatting to selected text in note
  const applyFormatting = React.useCallback((prefix: string, suffix: string) => {
    const textarea = document.getElementById('quick-note') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = quickNote.substring(start, end);
    let cursorPos = textarea.selectionStart;

    if (selectedText) {
      const newText = quickNote.substring(0, start) + prefix + selectedText + suffix + quickNote.substring(end);
      setQuickNote(newText);
    } else {
      cursorPos = textarea.selectionStart;
      const textBefore = quickNote.substring(0, cursorPos);
      const textAfter = quickNote.substring(cursorPos);
      setQuickNote(textBefore + prefix + suffix + textAfter);
    }
    
    textarea.focus();
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, end + prefix.length + suffix.length);
      } else {
        textarea.setSelectionRange(cursorPos + prefix.length, cursorPos + prefix.length);
      }
    }, 0);
  }, [quickNote]);

  const todayEvents = events.filter((event) =>
    isSameDay(parseISO(event.startDate), selectedDate)
  );

  const importantEvents = todayEvents.filter((event) => event.isImportant);

  return (
    <div className="min-h-screen bg-background">
      <CalendarNav
        isAuthenticated={isAuthenticated}
        user={user}
        logout={logout}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        setCreatingEvent={() => {}}
        showChecklist={showChecklist}
        setShowChecklist={setShowChecklist}
        setShowSummary={setShowSummary}
        isRefreshing={isRefreshing}
        saveAllAndRefresh={saveAllAndRefresh}
        handleImport={handleImport}
        handleExport={handleExport}
        events={events}
        todayEvents={todayEvents}
        importantEvents={importantEvents}
        isScrolled={isScrolled}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Content */}
        <div className="flex flex-1 gap-4 md:gap-6 flex-col xl:flex-row">
          {/* Calendar View */}
          <div className="flex-1">
            <Card className="shadow-lg border border-border bg-card backdrop-blur overflow-hidden">
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
                    onClick={() => setShowAll(!showAll)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                  >
                    {showAll ? (
                      <>
                        Show Less
                        <ChevronUp className="w-3 h-3 ml-1" />
                      </>
                    ) : (
                      <>
                        Show More
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(showAll ? events : events.slice(0, 5)).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {format(
                            parseISO(event.startDate),
                            "MMM d, yyyy h:mm a"
                          )}{" "}
                          - {format(parseISO(event.endDate), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteEvent(event.id)}
                      aria-label={`Delete event ${event.title}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;