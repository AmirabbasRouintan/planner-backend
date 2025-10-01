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
  Star,
  Pin,
  Bell,
  LayoutTemplate,
  Target,
  Notebook,
  Plus,
  Edit3,
} from "lucide-react";
import alertSound from "@/assets/alert.mp3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllEvents,
  fetchTasks,
  deleteTask,
  fetchPermanentNotes,
  createPermanentNote,
  fetchDailyGoals,
  fetchEventTemplates,
  createEventTemplate,
  updateEventTemplate,
  deleteEventTemplate,
} from "./api";
import { initialEvents } from "./types";
import type {
  CalendarEvent,
  EventTemplate,
  CalendarColor,
  DailyGoal,
  PermanentNote,
} from "./types";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import CalendarDayView from "./CalendarDayView";
import Checklist from "./Checklist";
import { CalendarNav } from "./CalendarNav";
import { Goals } from "./Goals";
import { PermanentNotes } from "./PermanentNotes";
import { QuickNoteDialog } from "@/components/planner";

function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

const colorMap: Record<CalendarColor, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#8b5cf6",
  orange: "#f97316",
  gray: "#64748b",
};

const DraggableTemplate: React.FC<{
  template: EventTemplate;
  onDelete: (template: EventTemplate) => void;
  onEdit?: (template: EventTemplate) => void;
}> = ({ template, onDelete, onEdit }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return draggable({
      element: el,
      getInitialData: () => ({ template }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [template]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`p-2 border rounded-md cursor-grab bg-card hover:bg-muted flex items-center justify-between gap-3 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: colorMap[template.color] }}
        />
        <span>{template.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => onEdit && onEdit(template)}
          aria-label={`Edit template ${template.name}`}
        >
          <Edit3 className="h-4 w-4 text-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => onDelete(template)}
          aria-label={`Delete template ${template.name}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

const Calendar: React.FC = () => {
  const { token, isAuthenticated, user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [, setIsLoading] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(false);
  const [showChecklist, setShowChecklist] = React.useState<boolean>(() => {
    const saved = getCookie("showChecklist");
    return saved ? JSON.parse(saved) : false;
  });
  const [showAll, setShowAll] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("calendar");
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [permanentNotes, setPermanentNotes] = React.useState<PermanentNote[]>(
    []
  );
  const [notePopupOpen, setNotePopupOpen] = React.useState(false);
  const [quickNote, setQuickNote] = React.useState("");
  const [notePreviewMode, setNotePreviewMode] = React.useState(true);
  const [pinnedItems, setPinnedItems] = React.useState<string[]>(() => {
    const saved = getCookie("pinnedItems");
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddTemplateOpen, setIsAddTemplateOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [newTemplate, setNewTemplate] = React.useState<
    Omit<EventTemplate, "id">
  >({
    name: "",
    title: "",
    color: "blue",
  });
  const [isEditTemplateOpen, setIsEditTemplateOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<EventTemplate | null>(null);
  const [dailyGoals, setDailyGoals] = React.useState<DailyGoal[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<DailyGoal | null>(null);

  const alertAudioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    setCookie("showChecklist", JSON.stringify(showChecklist), 365);
  }, [showChecklist]);

  React.useEffect(() => {
    setCookie("pinnedItems", JSON.stringify(pinnedItems), 365);
  }, [pinnedItems]);

  const handleSaveTemplate = async () => {
    if (newTemplate.name.trim() && newTemplate.title.trim()) {
      try {
        const createdTemplate = await createEventTemplate(
          newTemplate,
          token || undefined
        );
        setTemplates((prev) => [...prev, createdTemplate]);
        setNewTemplate({ name: "", title: "", color: "blue" });
        setIsAddTemplateOpen(false);
      } catch (error) {
        console.error("Failed to save template:", error);
      }
    }
  };

  const handleDeleteTemplate = async (templateToDelete: EventTemplate) => {
    try {
      await deleteEventTemplate(templateToDelete.id, token || undefined);
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      // call API
      const updated = await updateEventTemplate(editingTemplate, token || undefined);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTemplate(null);
      setIsEditTemplateOpen(false);
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const playAlertSound = async () => {
    try {
      const audio = new Audio(alertSound);
      alertAudioRef.current = audio;
      await audio.play();
      console.log("Alert sound played successfully");
    } catch (error) {
      console.error("Error playing alert sound:", error);
      alert("Event reminder!");
    }
  };

  React.useEffect(() => {
    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current = null;
      }
    };
  }, []);

  const togglePin = (item: string) => {
    setPinnedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const loadNotes = async () => {
      if (isAuthenticated) {
        try {
          const notes = await fetchPermanentNotes(token || undefined);
          setPermanentNotes(notes);
        } catch (error) {
          console.error("Failed to load permanent notes:", error);
        }
      }
    };
    loadNotes();
  }, [isAuthenticated, token]);

  React.useEffect(() => {
    const loadGoals = async () => {
      if (isAuthenticated) {
        try {
          const goals = await fetchDailyGoals(token || undefined);
          setDailyGoals(goals);
        } catch (error) {
          console.error("Failed to load daily goals:", error);
        }
      }
    };
    loadGoals();
  }, [isAuthenticated, token]);

  React.useEffect(() => {
    const loadTemplates = async () => {
      if (isAuthenticated) {
        try {
          const templates = await fetchEventTemplates(token || undefined);
          setTemplates(templates);
        } catch (error) {
          console.error("Failed to load event templates:", error);
        }
      }
    };
    loadTemplates();
  }, [isAuthenticated, token]);

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

  const handleSaveNote = React.useCallback(async () => {
    if (!quickNote.trim()) return;

    try {
      const newNote = await createPermanentNote(
        {
          title: "Permanent Note",
          content: quickNote.trim(),
        },
        token ?? undefined
      );
      setPermanentNotes((prev) => [newNote, ...prev]);
      setQuickNote("");
      setNotePopupOpen(false);
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  }, [quickNote, token]);

  const applyFormatting = React.useCallback(
    (prefix: string, suffix: string) => {
      const textarea = document.getElementById(
        "quick-note"
      ) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = quickNote.substring(start, end);
      let cursorPos = textarea.selectionStart;

      if (selectedText) {
        const newText =
          quickNote.substring(0, start) +
          prefix +
          selectedText +
          suffix +
          quickNote.substring(end);
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
          textarea.setSelectionRange(
            start,
            end + prefix.length + suffix.length
          );
        } else {
          textarea.setSelectionRange(
            cursorPos + prefix.length,
            cursorPos + prefix.length
          );
        }
      }, 0);
    },
    [quickNote]
  );

  const todayEvents = events.filter((event) =>
    isSameDay(parseISO(event.startDate), selectedDate)
  );

  const importantEvents = todayEvents.filter((event) => event.isImportant);

  return (
    <div className="min-h-screen mb-20 bg-background">
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
            <Card className="shadow-lg border border-border bg-[var(--calendar-date-bg)] backdrop-blur overflow-hidden">
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
              <Card className="shadow-lg border border-border bg-[var(--calendar-date-bg)] backdrop-blur supports-[backdrop-filter]:bg-[var(--calendar-date-bg)]/70 h-full flex flex-col">
                {/* Top part for Daily Checklist */}
                <div>
                  <CardHeader className="pb-3 pt-4 px-6">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
                      <div className="p-2 bg-muted rounded-lg">
                        <CheckSquare className="w-5 h-5 text-foreground" />
                      </div>
                      Daily Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Checklist
                      events={events}
                      setEvents={setEvents}
                      token={token ?? undefined}
                    />
                  </CardContent>
                </div>

                {/* Pinned items */}
                <div className="p-4 space-y-4">
                  {pinnedItems.includes("goals") && (
                    <div className="border-t pt-4">
                      <div className="flex flex-row items-center justify-between pb-2">
                        <h3 className="text-base font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Daily Goals
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white"
                            onClick={() => setIsGoalDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 text-black" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePin("goals")}
                          >
                            <Pin className="h-2 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Goals
                        goals={dailyGoals}
                        setGoals={setDailyGoals}
                        token={token}
                        isGoalDialogOpen={isGoalDialogOpen}
                        setIsGoalDialogOpen={setIsGoalDialogOpen}
                        editingGoal={editingGoal}
                        setEditingGoal={setEditingGoal}
                      />
                    </div>
                  )}
                  {pinnedItems.includes("notes") && (
                    <div className="border-t pt-4">
                      <div className="flex flex-row items-center justify-between pb-2">
                        <h3 className="text-base font-medium flex items-center gap-2">
                          <Notebook className="h-4 w-4" />
                          Permanent Notes
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white"
                            onClick={() => setNotePopupOpen(true)}
                          >
                            <Plus className="h-4 w-4 text-black" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePin("notes")}
                          >
                            <Pin className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                      <PermanentNotes
                        permanentNotes={permanentNotes}
                        setPermanentNotes={setPermanentNotes}
                        setQuickNote={setQuickNote}
                        setNotePreviewMode={setNotePreviewMode}
                        setNotePopupOpen={setNotePopupOpen}
                        token={token}
                      />
                    </div>
                  )}
                  {pinnedItems.includes("templates") && (
                    <div className="border-t pt-4">
                      <div className="flex flex-row items-center justify-between pb-2">
                        <h3 className="text-base font-medium flex items-center gap-2">
                          <LayoutTemplate className="h-4 w-4" />
                          Event Templates
                        </h3>
                        <div className="flex items-center">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAddTemplateOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 text-black" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePin("templates")}
                          >
                            <Pin className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        {templates.map((template, index) => (
                          <DraggableTemplate
                            key={index}
                            template={template}
                            onDelete={handleDeleteTemplate}
                            onEdit={(t) => {
                              setEditingTemplate(t);
                              setIsEditTemplateOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom part for Accordion */}
                <div className="mt-auto p-4">
                  <Accordion type="multiple" className="w-full">
                    {!pinnedItems.includes("goals") && (
                      <AccordionItem value="item-2">
                        <div className="flex justify-between w-full items-center pr-2">
                          <AccordionTrigger className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              <span>Daily Goals</span>
                            </div>
                          </AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsGoalDialogOpen(true);
                                setEditingGoal(null);
                              }}
                            >
                              <Plus className="h-4 w-4 text-black" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin("goals");
                              }}
                            >
                              <Pin className="h-2 w-4" />
                            </Button>
                          </div>
                        </div>
                        <AccordionContent>
                          <Goals
                            goals={dailyGoals}
                            setGoals={setDailyGoals}
                            token={token}
                            isGoalDialogOpen={isGoalDialogOpen}
                            setIsGoalDialogOpen={setIsGoalDialogOpen}
                            editingGoal={editingGoal}
                            setEditingGoal={setEditingGoal}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    {!pinnedItems.includes("notes") && (
                      <AccordionItem value="item-3">
                        <div className="flex justify-between w-full items-center pr-2">
                          <AccordionTrigger className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <Notebook className="h-4 w-4" />
                              <span>Permanent Notes</span>
                            </div>
                          </AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotePopupOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 text-black" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin("notes");
                              }}
                            >
                              <Pin className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <AccordionContent>
                          <PermanentNotes
                            permanentNotes={permanentNotes}
                            setPermanentNotes={setPermanentNotes}
                            setQuickNote={setQuickNote}
                            setNotePreviewMode={setNotePreviewMode}
                            setNotePopupOpen={setNotePopupOpen}
                            token={token}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    {!pinnedItems.includes("templates") && (
                      <AccordionItem value="templates">
                        <div className="flex justify-between w-full items-center pr-2">
                          <AccordionTrigger className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <LayoutTemplate className="h-4 w-4" />
                              <span>Event Templates</span>
                            </div>
                          </AccordionTrigger>
                          <div className="flex items-center">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsAddTemplateOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 text-black" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin("templates");
                              }}
                            >
                              <Pin className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {templates.map((template, index) => (
                              <DraggableTemplate
                                key={index}
                                template={template}
                                onDelete={handleDeleteTemplate}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Template Dialog */}
      <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="template-name" className="text-sm font-medium">
                Template Name
              </label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Morning Routine"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="template-title" className="text-sm font-medium">
                Default Event Title
              </label>
              <Input
                id="template-title"
                value={newTemplate.title}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Morning Standup"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Color</label>
              <div className="flex gap-2 pt-2">
                {(Object.keys(colorMap) as CalendarColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                      newTemplate.color === color
                        ? "border-primary ring-2 ring-primary/50"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: colorMap[color] }}
                    onClick={() =>
                      setNewTemplate((prev) => ({ ...prev, color }))
                    }
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddTemplateOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-template-name" className="text-sm font-medium">
                Template Name
              </label>
              <Input
                id="edit-template-name"
                value={editingTemplate?.name || ""}
                onChange={(e) =>
                  setEditingTemplate((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                placeholder="Template name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-template-title" className="text-sm font-medium">
                Default Event Title
              </label>
              <Input
                id="edit-template-title"
                value={editingTemplate?.title || ""}
                onChange={(e) =>
                  setEditingTemplate((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
                placeholder="Default event title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Color</label>
              <div className="flex gap-2 pt-2">
                {(Object.keys(colorMap) as CalendarColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                      editingTemplate?.color === color ? "border-primary ring-2 ring-primary/50" : "border-transparent"
                    }`}
                    style={{ backgroundColor: colorMap[color] }}
                    onClick={() => setEditingTemplate((prev) => (prev ? { ...prev, color } : prev))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTemplateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl bg-[var(--calendar-date-bg)] p-0">
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
                <Card className="border border-border bg-[var(--calendar-date-bg)]">
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
                <Card className="border border-border bg-[var(--calendar-date-bg)]">
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
                <Card className="border border-border bg-[var(--calendar-date-bg)]">
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
                <Card className="border border-border bg-[var(--calendar-date-bg)]">
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
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-[var(--calendar-date-bg)] hover:bg-muted/50 transition-colors"
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
                      onClick={playAlertSound}
                      aria-label={`Set alert for event ${event.title}`}
                    >
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    </Button>
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
      <QuickNoteDialog
        notePopupOpen={notePopupOpen}
        setNotePopupOpen={setNotePopupOpen}
        quickNote={quickNote}
        setQuickNote={setQuickNote}
        handleSaveNote={handleSaveNote}
        notePreviewMode={notePreviewMode}
        setNotePreviewMode={setNotePreviewMode}
        applyFormatting={applyFormatting}
      />
    </div>
  );
};

export default Calendar;
