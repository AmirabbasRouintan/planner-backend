import * as React from "react";
import { format, addDays, parseISO, isSameDay, startOfDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Plus,
  Bell,
  BellOff,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from "@/config/backend";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  color: "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray";
  isImportant?: boolean;
}

// API functions for tasks
const API_URL = API_BASE_URL;

const fetchTasks = async (token?: string): Promise<CalendarEvent[]> => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }

    const response = await fetch(`${API_URL}/tasks/`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }

    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

const createTask = async (task: Omit<CalendarEvent, "id">, token?: string): Promise<CalendarEvent | null> => {
  try {
    console.log("Creating task with data:", task);
    
    const taskWithImportance = {
      ...task,
      isImportant: Boolean(task.isImportant), // Ensure boolean value is sent
    };

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    const response = await fetch(`${API_URL}/tasks/`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(taskWithImportance),
    });

    console.log("Create task response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Create task failed:", errorText);
      throw new Error(`Failed to create task: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Create task result:", result);
    return result;
  } catch (error) {
    console.error("Error creating task:", error);
    return null;
  }
};

const updateTask = async (task: CalendarEvent, token?: string): Promise<CalendarEvent | null> => {
  try {
    // Ensure we have a valid ID for the API call
    if (!task.id) {
      console.error("Task ID is missing");
      return null;
    }
    
    const taskWithImportance = {
      ...task,
      isImportant: Boolean(task.isImportant), // Ensure boolean value is sent
    };

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    // Use the original string ID for the API call
    const response = await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify(taskWithImportance),
    });

    if (!response.ok) {
      throw new Error("Failed to update task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
};

const deleteTask = async (taskId: string, token?: string): Promise<boolean> => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    const response = await fetch(`${API_URL}/tasks/${taskId}/`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

// Function to fetch all events from the database
const fetchAllEvents = async (token?: string): Promise<CalendarEvent[]> => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    const response = await fetch(`${API_URL}/tasks/`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const data = await response.json();
    console.log("Fetched events:", data);
    
    // Handle the case where the API returns {tasks: []} instead of just an array
    if (data && data.tasks && Array.isArray(data.tasks)) {
      return data.tasks;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.error("Unexpected data format:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};

// Initial empty events array
const initialEvents: CalendarEvent[] = [];

const EventEditor: React.FC<{
  event: CalendarEvent | null;
  onSave: (updatedEvent: CalendarEvent) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string; // Add token prop
}> = ({ event, onSave, onCancel, open, onOpenChange, token }) => {
  const [title, setTitle] = React.useState(event?.title || "");
  const [description, setDescription] = React.useState(event?.description || "");
  const [startTime, setStartTime] = React.useState(
    event ? format(parseISO(event.startDate), "HH:mm") : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    event ? format(parseISO(event.endDate), "HH:mm") : "10:00"
  );
  const [color, setColor] = React.useState<CalendarEvent["color"]>(
    event?.color || "blue"
  );
  const [isImportant, setIsImportant] = React.useState(event?.isImportant || false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setStartTime(format(parseISO(event.startDate), "HH:mm"));
      setEndTime(format(parseISO(event.endDate), "HH:mm"));
      setColor(event.color);
      setIsImportant(event.isImportant || false);
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;

    setIsSaving(true);

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startDate = new Date(parseISO(event.startDate));
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(parseISO(event.endDate));
    endDate.setHours(endHours, endMinutes, 0, 0);

    try {
      await onSave({
        ...event,
        title,
        description: description || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color,
        isImportant,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as CalendarEvent["color"])}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
                <option value="purple">Purple</option>
                <option value="orange">Orange</option>
                <option value="gray">Gray</option>
              </select>
            </div>

            <div className="flex items-center">
              <Checkbox
                checked={isImportant}
                onCheckedChange={(checked) => setIsImportant(checked)}
              />
              <label className="ml-2 text-sm font-medium">Important</label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Checklist Component
const ChecklistComponent: React.FC<{
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  token?: string;
}> = ({ events, setEvents, token }) => {
  const [checklistItems, setChecklistItems] = React.useState<Array<{id: number; text: string; completed: boolean}>>([]);
  const [newItemText, setNewItemText] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  // Fetch checklist items from the backend
  React.useEffect(() => {
    const fetchChecklistItems = async () => {
      console.log("Fetching checklist items with token:", token);
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Token ${token}`;
          console.log("Setting Authorization header:", headers["Authorization"]);
        } else {
          console.log("No token provided");
        }

        const response = await fetch(`${API_URL}/checklist/`, {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Response not ok:", response.status, response.statusText);
          const errorData = await response.text();
          console.error("Error response:", errorData);
          throw new Error("Failed to fetch checklist items");
        }

        const data = await response.json();
        setChecklistItems(data.checklist_items || []);
      } catch (error) {
        console.error("Error fetching checklist items:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchChecklistItems();
    }
  }, [token]);

  const addChecklistItem = async () => {
    if (newItemText.trim() !== "") {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Token ${token}`;
        }
        
        const response = await fetch(`${API_URL}/checklist/`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            text: newItemText,
            completed: false
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checklist item");
        }

        const newItem = await response.json();
        setChecklistItems([...checklistItems, newItem]);
        setNewItemText("");
      } catch (error) {
        console.error("Error creating checklist item:", error);
      }
    }
  };

  const toggleChecklistItem = async (id: number) => {
    try {
      const item = checklistItems.find(item => item.id === id);
      if (!item) return;
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = `Token ${token}`;
      }
      
      const response = await fetch(`${API_URL}/checklist/${id}/`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          ...item,
          completed: !item.completed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update checklist item");
      }

      const updatedItem = await response.json();
      setChecklistItems(checklistItems.map(item => 
        item.id === id ? updatedItem : item
      ));
    } catch (error) {
      console.error("Error updating checklist item:", error);
    }
  };

  const deleteChecklistItem = async (id: number) => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = `Token ${token}`;
      }
      
      const response = await fetch(`${API_URL}/checklist/${id}/`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete checklist item");
      }

      setChecklistItems(checklistItems.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addChecklistItem();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new item"
          className="w-full"
        />
        <Button onClick={addChecklistItem}>Add</Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {checklistItems.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => toggleChecklistItem(item.id)}
              />
              <span className={item.completed ? "line-through" : ""}>{item.text}</span>
              <Button variant="ghost" onClick={() => deleteChecklistItem(item.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EventCreator: React.FC<{
  selectedDate: Date;
  onSave: (newEvent: CalendarEvent) => void;
  onCancel: () => void;
  tempEvent?: CalendarEvent | null;
}> = ({ selectedDate, onSave, onCancel, tempEvent }) => {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startTime, setStartTime] = React.useState(
    tempEvent ? format(parseISO(tempEvent.startDate), "HH:mm") : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    tempEvent ? format(parseISO(tempEvent.endDate), "HH:mm") : "10:00"
  );

  // Update times when tempEvent changes
  React.useEffect(() => {
    if (tempEvent) {
      setTitle(tempEvent.title);
      setDescription(tempEvent.description || "");
      setStartTime(format(parseISO(tempEvent.startDate), "HH:mm"));
      setEndTime(format(parseISO(tempEvent.endDate), "HH:mm"));
    }
  }, [tempEvent]);
  const [color, setColor] = React.useState("blue");
  const [isImportant, setIsImportant] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsCreating(true);

    // Combine selected date with time values
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startDate = new Date(selectedDate);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(selectedDate);
    endDate.setHours(endHours, endMinutes, 0, 0);

    const newEvent: CalendarEvent = {
      id: tempEvent ? tempEvent.id : Math.random().toString(36).substr(2, 9),
      title,
      description: description || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: color as CalendarEvent["color"],
      isImportant,
    };

    console.log("EventCreator submitting event:", newEvent);
    console.log("tempEvent was:", tempEvent);

    try {
      await onSave(newEvent);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Color</label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="red">Red</option>
            <option value="yellow">Yellow</option>
            <option value="purple">Purple</option>
            <option value="orange">Orange</option>
            <option value="gray">Gray</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is-important-create"
            checked={isImportant}
            onCheckedChange={(checked) => setIsImportant(checked as boolean)}
          />
          <label 
            htmlFor="is-important-create" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Is Important
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={isCreating} className="w-full sm:w-auto">
          {isCreating ? "Creating..." : "Create Event"}
        </Button>
      </div>
    </form>
  );
};

const getEventsForDay = (
  date: Date,
  events: CalendarEvent[]
): CalendarEvent[] => {
  const dayStart = startOfDay(date);
  return events.filter((event) => {
    const eventStart = startOfDay(parseISO(event.startDate));
    return isSameDay(eventStart, dayStart);
  });
};

const EventBlock: React.FC<{
  event: CalendarEvent;
  onMove: (id: string, newStartDate: string, newEndDate: string) => void;
  onResize: (id: string, newEndDate: string) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  position: { left: number; width: number };
  isDraggingId: string | null;
  isSavingId: string | null;
}> = React.memo(
  ({ event, onMove, onResize, onEdit, onDelete, position, isDraggingId, isSavingId }) => {
    const start = React.useMemo(
      () => parseISO(event.startDate),
      [event.startDate]
    );
    const end = React.useMemo(() => parseISO(event.endDate), [event.endDate]);
    const durationInMinutes = React.useMemo(
      () => (end.getTime() - start.getTime()) / (1000 * 60),
      [start, end]
    );
    const heightInPixels = React.useMemo(
      () => (durationInMinutes / 60) * 48 - 4,
      [durationInMinutes]
    );


    const isDragging = React.useRef(false);

    const [touchStart, setTouchStart] = React.useState<{
      x: number;
      y: number;
      time: number;
    } | null>(null);
    const [longPressTimer, setLongPressTimer] =
      React.useState<NodeJS.Timeout | null>(null);
    const [isTouchDragging, setIsTouchDragging] = React.useState(false);
    const [longPressProgress, setLongPressProgress] = React.useState(0);

    const colorClasses = {
      blue: "bg-blue-100 border-blue-200 text-blue-800",
      green: "bg-green-100 border-green-200 text-green-800",
      red: "bg-red-100 border-red-200 text-red-800",
      yellow: "bg-yellow-100 border-yellow-200 text-yellow-800",
      purple: "bg-purple-100 border-purple-200 text-purple-800",
      orange: "bg-orange-100 border-orange-200 text-orange-800",
      gray: "bg-gray-100 border-gray-200 text-gray-800",
    };

    const [swipeStart, setSwipeStart] = React.useState<{
      x: number;
      y: number;
    } | null>(null);
    const [showDelete, setShowDelete] = React.useState(false);
    // State for hover effect
    const [isHovered, setIsHovered] = React.useState(false);

    const handleDragStart = (e: React.MouseEvent) => {
      if (showDelete) return;

      e.stopPropagation();

      const body = document.body;
      body.classList.add("select-none");

      const eventBlocks = document.querySelectorAll(".event-block");
      eventBlocks.forEach((block) =>
        block.classList.add("pointer-events-none")
      );

      isDragging.current = true;

      const startY = e.clientY;
      const originalStart = new Date(start);
      const originalEnd = new Date(end);
      const originalDuration = originalEnd.getTime() - originalStart.getTime();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();

        const deltaY = moveEvent.clientY - startY;
        const minutesDiff = Math.round((deltaY / 48) * 60);

        const snappedMinutesDiff = Math.round(minutesDiff / 5) * 5;

        const newStart = new Date(
          originalStart.getTime() + snappedMinutesDiff * 60000
        );
        const newEnd = new Date(
          originalEnd.getTime() + snappedMinutesDiff * 60000
        );

        let finalStart = newStart;
        let finalEnd = newEnd;

        if (
          newStart < originalStart &&
          (newStart.getDate() < originalStart.getDate() ||
            newStart.getMonth() < originalStart.getMonth() ||
            newStart.getFullYear() < originalStart.getFullYear())
        ) {
          finalStart = new Date(originalStart);
          finalStart.setHours(23, 55, 0, 0);

          finalEnd = new Date(finalStart.getTime() + originalDuration);

          const endOfDay = new Date(originalStart);
          endOfDay.setHours(23, 59, 59, 999);
          if (finalEnd > endOfDay) {
            finalEnd = endOfDay;
            finalStart = new Date(finalEnd.getTime() - originalDuration);
          }
        } else if (
          newEnd > originalEnd &&
          (newEnd.getDate() > originalEnd.getDate() ||
            newEnd.getMonth() > originalEnd.getMonth() ||
            newEnd.getFullYear() > originalEnd.getFullYear())
        ) {
          finalStart = new Date(originalStart);
          finalStart.setHours(0, 0, 0, 0);

          finalEnd = new Date(finalStart.getTime() + originalDuration);

          const startOfDay = new Date(originalStart);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfNextDay = new Date(startOfDay);
          endOfNextDay.setDate(startOfDay.getDate() + 1);
          endOfNextDay.setMilliseconds(endOfNextDay.getMilliseconds() - 1);

          if (finalEnd > endOfNextDay) {
            finalEnd = new Date(finalStart);
            finalEnd.setHours(23, 59, 59, 999);
          }
        }

        onMove(event.id, finalStart.toISOString(), finalEnd.toISOString());
      };

      const handleMouseUp = () => {
        isDragging.current = false;

        const body = document.body;
        body.classList.remove("select-none");

        const eventBlocks = document.querySelectorAll(".event-block");
        eventBlocks.forEach((block) =>
          block.classList.remove("pointer-events-none")
        );

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
      if (showDelete) return;

      e.stopPropagation();

      const startY = e.clientY;
      const originalEnd = new Date(end);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();

        const deltaY = moveEvent.clientY - startY;
        const minutesDiff = Math.round((deltaY / 48) * 60);

        const newEnd = new Date(originalEnd.getTime() + minutesDiff * 60000);

        if (newEnd > start) {
          onResize(event.id, newEnd.toISOString());
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleSwipeStart = (e: React.MouseEvent | React.TouchEvent) => {
      if ((e.target as HTMLElement).classList.contains("cursor-se-resize")) {
        return;
      }

      if (isTouchDragging) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setSwipeStart({ x: clientX, y: clientY });
      setShowDelete(false);
    };

    React.useEffect(() => {
      if (!swipeStart) return;

      const handleSwipeMove = (e: MouseEvent | TouchEvent) => {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - swipeStart.x;
        const deltaY = clientY - swipeStart.y;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
          if (deltaX < 0) {
            setShowDelete(true);
          }
          setSwipeStart(null);
        }

        if (Math.abs(deltaY) > 10) {
          setSwipeStart(null);
        }
      };

      const handleSwipeEnd = () => {
        setSwipeStart(null);
      };

      document.addEventListener("mousemove", handleSwipeMove);
      document.addEventListener("mouseup", handleSwipeEnd);
      document.addEventListener("touchmove", handleSwipeMove);
      document.addEventListener("touchend", handleSwipeEnd);

      return () => {
        document.removeEventListener("mousemove", handleSwipeMove);
        document.removeEventListener("mouseup", handleSwipeEnd);
        document.removeEventListener("touchmove", handleSwipeMove);
        document.removeEventListener("touchend", handleSwipeEnd);
      };
    }, [swipeStart]);

    const handleDoubleClick = (e: React.MouseEvent) => {
      if (showDelete || isDragging.current) return;

      e.stopPropagation();
      e.preventDefault();

      onEdit(event);
    };

    const handleEventMouseDown = (e: React.MouseEvent) => {
      if (showDelete) return;

      handleDragStart(e);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      if (showDelete) return;

      const touch = e.touches[0];
      const touchData = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      setTouchStart(touchData);
      setLongPressProgress(0);

      const progressInterval = setInterval(() => {
        setLongPressProgress((prev) => {
          const newProgress = prev + 100 / 50;
          return Math.min(newProgress, 100);
        });
      }, 10);

      const timer = setTimeout(() => {
        clearInterval(progressInterval);
        setIsTouchDragging(true);
        setTouchStart(null);
        setLongPressProgress(0);
        const element = e.currentTarget as HTMLElement;
        element.style.opacity = "0.8";
        element.style.transform = "scale(1.02)";
        element.style.zIndex = "100";
        element.style.transition = "transform 0.2s ease-out";

        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 500);

      setLongPressTimer(timer);

      (timer as any).progressInterval = progressInterval;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isTouchDragging || !touchStart) return;

      e.preventDefault();
      const touch = e.touches[0];

      const deltaY = touch.clientY - touchStart.y;
      const minutesDiff = Math.round((deltaY / 48) * 60);
      const snappedMinutesDiff = Math.round(minutesDiff / 5) * 5;

      if (Math.abs(snappedMinutesDiff) > 0) {
        const originalStart = new Date(start);
        const originalEnd = new Date(end);
        const originalDuration =
          originalEnd.getTime() - originalStart.getTime();

        const newStart = new Date(
          originalStart.getTime() + snappedMinutesDiff * 60000
        );
        const newEnd = new Date(
          originalEnd.getTime() + snappedMinutesDiff * 60000
        );

        let finalStart = newStart;
        let finalEnd = newEnd;

        if (
          newStart < originalStart &&
          (newStart.getDate() < originalStart.getDate() ||
            newStart.getMonth() < originalStart.getMonth() ||
            newStart.getFullYear() < originalStart.getFullYear())
        ) {
          finalStart = new Date(originalStart);
          finalStart.setHours(23, 55, 0, 0);
          finalEnd = new Date(finalStart.getTime() + originalDuration);

          const endOfDay = new Date(originalStart);
          endOfDay.setHours(23, 59, 59, 999);
          if (finalEnd > endOfDay) {
            finalEnd = endOfDay;
            finalStart = new Date(finalEnd.getTime() - originalDuration);
          }
        } else if (
          newEnd > originalEnd &&
          (newEnd.getDate() > originalEnd.getDate() ||
            newEnd.getMonth() > originalEnd.getMonth() ||
            newEnd.getFullYear() > originalEnd.getFullYear())
        ) {
          finalStart = new Date(originalStart);
          finalStart.setHours(0, 0, 0, 0);
          finalEnd = new Date(finalStart.getTime() + originalDuration);

          const startOfDay = new Date(originalStart);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfNextDay = new Date(startOfDay);
          endOfNextDay.setDate(startOfDay.getDate() + 1);
          endOfNextDay.setMilliseconds(endOfNextDay.getMilliseconds() - 1);

          if (finalEnd > endOfNextDay) {
            finalEnd = new Date(finalStart);
            finalEnd.setHours(23, 59, 59, 999);
          }
        }

        onMove(event.id, finalStart.toISOString(), finalEnd.toISOString());
        setTouchStart({ ...touchStart, y: touch.clientY });
      }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        if ((longPressTimer as any).progressInterval) {
          clearInterval((longPressTimer as any).progressInterval);
        }
        setLongPressTimer(null);
      }

      const element = e.currentTarget as HTMLElement;
      element.style.opacity = "";
      element.style.transform = "";
      element.style.zIndex = "";
      element.style.transition = "";

      setIsTouchDragging(false);
      setTouchStart(null);
      setLongPressProgress(0);
    };

    const handleTouchCancel = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        if ((longPressTimer as any).progressInterval) {
          clearInterval((longPressTimer as any).progressInterval);
        }
        setLongPressTimer(null);
      }

      setIsTouchDragging(false);
      setTouchStart(null);
      setLongPressProgress(0);
    };

    const handleDelete = () => {
      onDelete(event.id);
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`absolute rounded border px-1 py-0.5 text-xs truncate cursor-move select-none event-block ${
              colorClasses[event.color]
            } ${isTouchDragging ? "shadow-lg scale-105" : ""}`}
            style={{
              height: `${heightInPixels}px`,
              top: `${(start.getMinutes() / 60) * 48}px`,
              left: `${position.left}%`,
              width: `${position.width}%`,
              zIndex: isDraggingId === event.id || isTouchDragging ? 50 : 10,
            }}
            onMouseDown={handleSwipeStart}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            {showDelete ? (
              <div className="flex items-center justify-center h-full">
                <button
                  onClick={handleDelete}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                >
                  Delete
                </button>
              </div>
            ) : (
              <>
                {longPressProgress > 0 && longPressProgress < 100 && (
                  <div className="absolute top-1 right-1 w-4 h-4">
                    <svg
                      className="w-4 h-4 transform -rotate-90"
                      viewBox="0 0 16 16"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={`${longPressProgress * 0.377} 3.77`}
                        className="opacity-60"
                      />
                    </svg>
                  </div>
                )}

                <div
                  className="h-2.5 w-full bg-current opacity-20 cursor-move flex items-center justify-center mb-0.5 rounded-t"
                  onMouseDown={handleEventMouseDown}
                >
                  <div className="w-8 h-0.5 bg-white rounded-full"></div>
                </div>

                <div
                  className="h-[calc(100%-0.75rem)] w-full relative"
                  onDoubleClick={handleDoubleClick}
                >
                  {event.isImportant && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10 shadow">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                  
                  {heightInPixels < 55 ? (
                    <div className="flex items-center justify-between text-[0.65rem]">
                      <span className="font-medium truncate flex-1">
                        {event.title}
                      </span>
                      <span className="whitespace-nowrap ml-1 opacity-80">
                        {format(start, "HH:mm")}-{format(end, "HH:mm")}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium truncate">{event.title}</div>
                      <div
                        className={`${
                          heightInPixels < 30
                            ? "flex justify-between text-[0.6rem]"
                            : ""
                        }`}
                      >
                        <span>{format(start, "HH:mm")}</span>
                        {heightInPixels < 30 ? <span>-</span> : " - "}
                        <span>{format(end, "HH:mm")}</span>
                      </div>
                    </>
                  )}
                </div>

                <div
                  className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-current opacity-50"
                  onMouseDown={handleResizeStart}
                />
              </>
            )}
          </div>
        </TooltipTrigger>
        {event.description && (
          <TooltipContent 
            side="right" 
            align="start"
            sideOffset={8}
            alignOffset={0}
            className="max-w-xs"
            collisionPadding={5}
          >
            <p className="font-medium">{event.title}</p>
            <p className="text-sm">{event.description}</p>
            <p className="text-xs opacity-75 mt-1">
              {format(start, "HH:mm")} - {format(end, "HH:mm")}
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }
);

const TimeSlot: React.FC<{ hour: number }> = ({ hour }) => {
  return (
    <div className="relative" style={{ height: "48px", minHeight: "48px" }}>
      <div className="absolute -top-3 right-1 flex h-6 items-center">
        <span className="text-[0.6rem] text-muted-foreground">
          {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
        </span>
      </div>

      {/* Minute indicators */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {/* 15 minutes indicator */}
        <div className="absolute top-1/4 w-2 border-t border-muted-foreground/30"></div>

        {/* 30 minutes indicator */}
        <div className="absolute top-1/2 w-2 border-t border-muted-foreground/30"></div>

        {/* 45 minutes indicator */}
        <div className="absolute top-3/4 w-2 border-t border-muted-foreground/30"></div>
      </div>
    </div>
  );
};

const CalendarDayView: React.FC<{
  selectedDate: Date;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  token?: string;
}> = ({ selectedDate, events, setEvents, token }) => {
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(
    null
  );
  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [tempEvent, setTempEvent] = React.useState<CalendarEvent | null>(null);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  // Refs to store the latest move/resize data for debouncing
  const moveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Update current time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const moveEvent = (id: string, newStartDate: string, newEndDate: string) => {
    // Use callback version to ensure we have the most current event data
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === id
          ? { ...event, startDate: newStartDate, endDate: newEndDate }
          : event
      )
    );
  };

  const resizeEvent = (id: string, newEndDate: string) => {
    // Use callback version to ensure we have the most current event data
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === id ? { ...event, endDate: newEndDate } : event
      )
    );
  };

  const deleteEvent = async (id: string) => {
    try {
      const success = await deleteTask(id, token);
      if (success) {
        setEvents((prevEvents) => prevEvents.filter((event) => event.id !== id));
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
  };

  const saveEvent = async (updatedEvent: CalendarEvent) => {
    // Immediately update the UI with the updated event for instant feedback
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
    
    try {
      console.log("Saving updated event:", updatedEvent);
      const result = await updateTask(updatedEvent, token);
      
      if (result) {
        // Update the UI with the saved event (in case there are any server-side changes)
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === updatedEvent.id ? result : event
          )
        );
        console.log("Event updated successfully:", result);
      } else {
        console.error("Failed to update event: No response from server");
        // Revert to the previous version if save failed
        setEvents((prevEvents) => {
          const previousEvent = prevEvents.find(e => e.id === updatedEvent.id);
          if (previousEvent) {
            return prevEvents.map((event) =>
              event.id === updatedEvent.id ? previousEvent : event
            );
          }
          return prevEvents;
        });
      }
    } catch (error) {
      console.error("Error updating event:", error);
      // Revert to the previous version if save failed
      setEvents((prevEvents) => {
        const previousEvent = prevEvents.find(e => e.id === updatedEvent.id);
        if (previousEvent) {
          return prevEvents.map((event) =>
            event.id === updatedEvent.id ? previousEvent : event
          );
        }
        return prevEvents;
      });
    }
    setEditingEvent(null);
  };

  const closeEditor = () => {
    setEditingEvent(null);
  };

  const dayEvents = getEventsForDay(selectedDate, events);

  const eventsOverlap = (event1: CalendarEvent, event2: CalendarEvent) => {
    const start1 = parseISO(event1.startDate);
    const end1 = parseISO(event1.endDate);
    const start2 = parseISO(event2.startDate);
    const end2 = parseISO(event2.endDate);

    return start1 < end2 && start2 < end1;
  };

  const getOverlappingGroups = (events: CalendarEvent[]) => {
    const groups: CalendarEvent[][] = [];
    const visited = new Set<string>();

    events.forEach((event) => {
      if (visited.has(event.id)) return;

      const group: CalendarEvent[] = [event];
      visited.add(event.id);

      const checkOverlaps = (currentEvent: CalendarEvent) => {
        events.forEach((otherEvent) => {
          if (
            !visited.has(otherEvent.id) &&
            eventsOverlap(currentEvent, otherEvent)
          ) {
            group.push(otherEvent);
            visited.add(otherEvent.id);
            checkOverlaps(otherEvent);
          }
        });
      };

      checkOverlaps(event);
      groups.push(group);
    });

    return groups;
  };

  const eventPositions: Record<string, { left: number; width: number }> = {};

  const overlappingGroups = getOverlappingGroups(dayEvents);

  overlappingGroups.forEach((group) => {
    group.sort(
      (a, b) =>
        parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
    );

    if (group.length === 1) {
      eventPositions[group[0].id] = { left: 0, width: 100 };
    } else {
      const width = 100 / group.length;
      group.forEach((event, index) => {
        eventPositions[event.id] = {
          left: index * width,
          width: width - (group.length > 1 ? 1 : 0),
        };
      });
    }
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const [draggingEventId, setDraggingEventId] = React.useState<string | null>(
    null
  );
  const [savingEventId, setSavingEventId] = React.useState<string | null>(
    null
  );

  const handleMoveEvent = (
    id: string,
    newStartDate: string,
    newEndDate: string
  ) => {
    setDraggingEventId(id);
    moveEvent(id, newStartDate, newEndDate);
    
    // Clear any existing timeout
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }
    
    // Set a new timeout to save the changes (reduced from 500ms to 200ms for faster response)
    moveTimeoutRef.current = setTimeout(async () => {
      await saveMovedEvent(id, newStartDate, newEndDate);
    }, 200); // Reduced timeout for faster response
  };

  // Separate function to handle the actual saving logic
  const saveMovedEvent = async (id: string, newStartDate: string, newEndDate: string) => {
    // Use the callback version of setEvents to get the most current event data
    setEvents(currentEvents => {
      const eventToUpdate = currentEvents.find(event => event.id === id);
      if (eventToUpdate) {
        // Check if this is a temporary event (not yet saved to backend)
        // Temporary events have string IDs generated by Math.random()
        // Backend-saved events have numeric IDs
        const isTemporaryEvent = isNaN(Number(eventToUpdate.id));
        if (isTemporaryEvent) {
          console.log("Skipping save for temporary event:", eventToUpdate.id);
          return currentEvents;
        }
        
        // Show saving indicator
        setSavingEventId(id);
        
        // Update the event with new start and end dates
        const updatedEvent = {
          ...eventToUpdate,
          startDate: newStartDate,
          endDate: newEndDate
        };
        
        // Save to backend asynchronously
        updateTask(updatedEvent, token).then(result => {
          if (result) {
            // Update the UI with the saved event
            setEvents(prevEvents =>
              prevEvents.map(event =>
                event.id === id ? result : event
              )
            );
            console.log("Event moved and saved successfully:", result);
          } else {
            console.error("Failed to save moved event");
          }
        }).catch(error => {
          console.error("Error saving moved event:", error);
        }).finally(() => {
          // Clear the dragging and saving states
          setDraggingEventId(null);
          setSavingEventId(null);
        });
        
        // Return the updated events for immediate UI feedback
        return currentEvents.map(event =>
          event.id === id ? updatedEvent : event
        );
      }
      return currentEvents;
    });
  };

  const handleResizeEvent = (id: string, newEndDate: string) => {
    setDraggingEventId(id);
    resizeEvent(id, newEndDate);
    
    // Clear any existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    // Set a new timeout to save the changes (reduced from 500ms to 200ms for faster response)
    resizeTimeoutRef.current = setTimeout(async () => {
      await saveResizedEvent(id, newEndDate);
    }, 200); // Reduced timeout for faster response
  };

  // Separate function to handle the actual saving logic for resize
  const saveResizedEvent = async (id: string, newEndDate: string) => {
    // Use the callback version of setEvents to get the most current event data
    setEvents(currentEvents => {
      const eventToUpdate = currentEvents.find(event => event.id === id);
      if (eventToUpdate) {
        // Check if this is a temporary event (not yet saved to backend)
        // Temporary events have string IDs generated by Math.random()
        // Backend-saved events have numeric IDs
        const isTemporaryEvent = isNaN(Number(eventToUpdate.id));
        if (isTemporaryEvent) {
          console.log("Skipping save for temporary event:", eventToUpdate.id);
          return currentEvents;
        }
        
        // Show saving indicator
        setSavingEventId(id);
        
        // Update the event with new end date
        const updatedEvent = {
          ...eventToUpdate,
          endDate: newEndDate
        };
        
        // Save to backend asynchronously
        updateTask(updatedEvent, token).then(result => {
          if (result) {
            // Update the UI with the saved event
            setEvents(prevEvents =>
              prevEvents.map(event =>
                event.id === id ? result : event
              )
            );
            console.log("Event resized and saved successfully:", result);
          } else {
            console.error("Failed to save resized event");
          }
        }).catch(error => {
          console.error("Error saving resized event:", error);
        }).finally(() => {
          // Clear the dragging and saving states
          setDraggingEventId(null);
          setSavingEventId(null);
        });
        
        // Return the updated events for immediate UI feedback
        return currentEvents.map(event =>
          event.id === id ? updatedEvent : event
        );
      }
      return currentEvents;
    });
  };

  const handleCreateEvent = async (newEvent: CalendarEvent) => {
    console.log("Creating new event:", newEvent);
    try {
      // Add the temporary event to the UI immediately
      setEvents((prev) => [...prev, newEvent]);
      
      // Remove id to let the backend generate one
      const { id, ...eventData } = newEvent;
      console.log("Event data being sent to API:", eventData);
      
      // Create the task in the database
      const createdTask = await createTask(eventData, token || undefined);
      
      if (createdTask) {
        // Update the UI with the newly created task (with the backend-generated ID)
        setEvents((prev) => 
          prev.map(event => 
            event.id === newEvent.id ? createdTask : event
          )
        );
        console.log("Event created successfully:", createdTask);
      } else {
        console.error("Failed to create event: No response from server");
        // If creation failed, remove the temporary event from the UI
        setEvents((prev) => prev.filter(event => event.id !== newEvent.id));
      }
    } catch (error) {
      console.error("Error creating event:", error);
      // If creation failed, remove the temporary event from the UI
      setEvents((prev) => prev.filter(event => event.id !== newEvent.id));
    }
    setCreatingEvent(false);
    setEditingEvent(null);
  };

  React.useEffect(() => {
    const handleMouseUp = () => {
      // Save any pending changes immediately when mouse is released
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = null;
        
        // If there was a pending move operation, save it immediately
        if (draggingEventId) {
          const movedEvent = events.find(event => event.id === draggingEventId);
          if (movedEvent) {
            // Use the current event data from state (which was updated during drag)
            saveMovedEvent(draggingEventId, movedEvent.startDate, movedEvent.endDate);
          }
        }
      }
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
        
        // If there was a pending resize operation, save it immediately
        if (draggingEventId) {
          const resizedEvent = events.find(event => event.id === draggingEventId);
          if (resizedEvent) {
            saveResizedEvent(draggingEventId, resizedEvent.endDate);
          }
        }
      }
      
      setDraggingEventId(null);
    };

    document.addEventListener("mouseup", handleMouseUp);
    
    // Cleanup function
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      
      // Clear timeouts on unmount
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [draggingEventId, events]); // Added dependencies to track current dragging state

  return (
    <div className="flex flex-col h-full">
      <TooltipProvider>
        <div className="flex flex-1 overflow-auto select-none">
          <div className="w-10 sm:w-12 flex-shrink-0 pt-1 pb-1">
            {hours.map((hour) => (
              <TimeSlot key={hour} hour={hour} />
            ))}
          </div>

          <div className="flex-1 border-l relative pt-1 pb-1">
            {/* Current time indicator */}
            {isSameDay(selectedDate, currentTime) && (
              <div 
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ 
                  top: `${(currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60) * 0.8}px` 
                }}
              >
                <div className="absolute -top-1.5 -left-3 w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="absolute -top-6 right-2 text-red-500 text-xs px-2 py-1 rounded font-mono">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
            
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b"
                style={{ height: "48px", minHeight: "48px" }}
                onDoubleClick={(e) => {
                  if (e.target === e.currentTarget) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minutes = Math.round((y / 48) * 60);

                    const startMinutes = Math.floor(minutes / 15) * 15;
                    const endMinutes = startMinutes + 60;

                    const newTempEvent: CalendarEvent = {
                      id: Math.random().toString(36).substr(2, 9),
                      title: "",
                      startDate: new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate(),
                        hour,
                        startMinutes
                      ).toISOString(),
                      endDate: new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate(),
                        hour + Math.floor(endMinutes / 60),
                        endMinutes % 60
                      ).toISOString(),
                      color: "blue",
                    };

                    console.log("Double-click created temp event:", newTempEvent);
                    setTempEvent(newTempEvent);
                    setCreatingEvent(true);
                  }
                }}
              >
                {dayEvents
                  .filter(
                    (event) => parseISO(event.startDate).getHours() === hour
                  )
                  .map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      onMove={handleMoveEvent}
                      onResize={handleResizeEvent}
                      onEdit={editEvent}
                      onDelete={deleteEvent}
                      position={
                        eventPositions[event.id] || { left: 0, width: 100 }
                      }
                      isDraggingId={draggingEventId}
                      isSavingId={savingEventId}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {editingEvent && !creatingEvent && (
        <EventEditor
          event={editingEvent}
          onSave={saveEvent}
          onCancel={closeEditor}
          open={!!editingEvent}
          onOpenChange={(open) => !open && closeEditor()}
          token={token || undefined}
        />
      )}

      {creatingEvent && (
        <Dialog open={creatingEvent} onOpenChange={setCreatingEvent}>
          <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <EventCreator
              selectedDate={selectedDate}
              onSave={handleCreateEvent}
              onCancel={() => {
                setCreatingEvent(false);
                setTempEvent(null);
              }}
              tempEvent={tempEvent}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const Calendar: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [isLoading, setIsLoading] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const [showSummary, setShowSummary] = React.useState(false);
  const [showChecklist, setShowChecklist] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  React.useEffect(() => {
    audioRef.current = new Audio("/alert.mp3");
    audioRef.current.preload = "auto";
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check for events starting at current time
  React.useEffect(() => {
    if (!soundEnabled) return;

    const checkForEvents = () => {
      const now = new Date();
      const currentTime = format(now, "HH:mm");
      
      const currentEvents = events.filter(event => {
        const eventStartDate = parseISO(event.startDate);
        const eventTime = format(eventStartDate, "HH:mm");
        return eventTime === currentTime && isSameDay(eventStartDate, now);
      });

      if (currentEvents.length > 0 && audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error("Error playing alert sound:", error);
        });
      }
    };

    // Check every minute
    const interval = setInterval(checkForEvents, 60000);
    // Also check immediately when sound is enabled
    checkForEvents();

    return () => clearInterval(interval);
  }, [events, soundEnabled]);

  // Function to save all events and refresh data from the database
  const saveAllAndRefresh = async () => {
    try {
      setIsLoading(true);
      // Fetch all events from the database
      const fetchedEvents = await fetchAllEvents(token || undefined);
      
      // Update the events state regardless of whether there are events or not
      setEvents(fetchedEvents);
      console.log("All events refreshed from database successfully", fetchedEvents);
      
      // Show a notification to the user
      alert("Calendar data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing events:", error);
      alert("Error refreshing calendar data. Please try again.");
    } finally {
      setIsLoading(false);
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
      // Add the temporary event to the UI immediately
      setEvents((prev) => [...prev, newEvent]);
      
      // Remove id to let the backend generate one
      const { id, ...eventData } = newEvent;
      console.log("Event data being sent to API:", eventData);
      
      // Create the task in the database
      const createdTask = await createTask(eventData, token || undefined);
      
      if (createdTask) {
        // Update the UI with the newly created task (with the backend-generated ID)
        setEvents((prev) => 
          prev.map(event => 
            event.id === newEvent.id ? createdTask : event
          )
        );
        console.log("Event created successfully:", createdTask);
      } else {
        console.error("Failed to create event: No response from server");
        // If creation failed, remove the temporary event from the UI
        setEvents((prev) => prev.filter(event => event.id !== newEvent.id));
      }
    } catch (error) {
      console.error("Error creating event:", error);
      // If creation failed, remove the temporary event from the UI
      setEvents((prev) => prev.filter(event => event.id !== newEvent.id));
    }
    setCreatingEvent(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId, token);
      if (success) {
        setEvents((prevEvents) => prevEvents.filter((event) => event.id !== taskId));
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

  return (
    <div className="container mx-auto py-2 px-2 sm:py-4 sm:px-4 md:px-6 max-w-7xl bg-background flex flex-col">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <div className="border rounded-md px-3 py-2 text-sm sm:text-base font-medium bg-background min-w-[120px] sm:min-w-[140px] text-center">
            {format(selectedDate, "yyyy/MM/dd")}
          </div>

          <div className="flex gap-1">
            <Button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              variant="outline"
              size="icon"
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setSelectedDate(new Date())}
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs sm:text-sm"
            >
              Today
            </Button>

            <Button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              variant="outline"
              size="icon"
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2 mr-2">
            <Checkbox
              id="checklist-toggle"
              checked={showChecklist}
              onCheckedChange={(checked) => setShowChecklist(checked as boolean)}
            />
            <label 
              htmlFor="checklist-toggle" 
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Checklist
            </label>
          </div>
          
          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>
          
          <Button
            onClick={() => setShowSummary(true)}
            variant="outline"
            size="sm"
            className="h-8 text-xs sm:text-sm px-2 sm:px-3"
          >
            <span className="hidden xs:inline">Summary</span>
            <span className="xs:hidden">Sum</span>
          </Button>
          
          <Button
            onClick={saveAllAndRefresh}
            variant="default"
            size="sm"
            className="h-8 text-xs sm:text-sm px-2 sm:px-4"
          >
            <span className="hidden xs:inline">Save & Refresh</span>
            <span className="xs:hidden">Refresh</span>
          </Button>
          
          <Button
            onClick={handleImport}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            <Upload className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            <Download className="w-4 h-4" />
          </Button>

          <Dialog open={creatingEvent} onOpenChange={setCreatingEvent}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-8 w-8" title="Add Event">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
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

      <div className="flex flex-1 gap-4 flex-col lg:flex-row">
        <div className="flex-1">
          <div className="border rounded-lg p-1 sm:p-2 md:p-4 h-auto min-h-[300px] mb-16 sm:mb-20">
            <CalendarDayView
              selectedDate={selectedDate}
              events={events}
              setEvents={setEvents}
              token={token || undefined}
            />
          </div>
        </div>
        
        {showChecklist && (
          <div className="w-full lg:w-80">
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Checklist</h2>
              <ChecklistComponent events={events} setEvents={setEvents} token={token} />
            </div>
          </div>
        )}
      </div>

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No tasks found
              </p>
            ) : (
              [...events]
                .sort((a, b) => 
                  parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
                )
                .map((event) => (
                  <div 
                    key={event.id} 
                    className="border rounded-md p-3 hover:bg-accent transition-colors relative group"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{event.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(parseISO(event.startDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(event.startDate), "HH:mm")} -{" "}
                        {format(parseISO(event.endDate), "HH:mm")}
                      </span>
                      <span className={`inline-block w-3 h-3 rounded-full bg-${event.color}-500`}></span>
                    </div>
                    
                    {/* Delete button for desktop - shown on hover at bottom right */}
                    <button
                      onClick={() => handleDeleteTask(event.id)}
                      className="absolute right-2 bottom-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      aria-label="Delete task"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Delete button for mobile - shown with swipe at bottom right */}
                    <div className="absolute right-0 bottom-0 top-auto w-16 bg-red-500 rounded-br-md rounded-tr-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 md:hidden">
                      <button
                        onClick={() => handleDeleteTask(event.id)}
                        className="text-white p-2"
                        aria-label="Delete task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
            )}
            <div className="pt-2 border-t">
              <p className="text-sm font-medium">
                Total tasks: {events.length}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;

