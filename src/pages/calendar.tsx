import * as React from "react";
import { format, addDays, parseISO, isSameDay, startOfDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Plus,
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

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray";
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Meeting",
    startDate: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    endDate: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    color: "blue",
  },
  {
    id: "2",
    title: "Lunch with Client",
    startDate: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
    endDate: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    color: "green",
  },
  {
    id: "3",
    title: "Project Deadline",
    startDate: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
    endDate: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    color: "red",
  },
];

const EventEditor: React.FC<{
  event: CalendarEvent | null;
  onSave: (updatedEvent: CalendarEvent) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ event, onSave, onCancel, open, onOpenChange }) => {
  const [title, setTitle] = React.useState(event?.title || "");
  const [startTime, setStartTime] = React.useState(
    event ? format(parseISO(event.startDate), "HH:mm") : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    event ? format(parseISO(event.endDate), "HH:mm") : "10:00"
  );
  const [color, setColor] = React.useState<CalendarEvent["color"]>(
    event?.color || "blue"
  );

  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setStartTime(format(parseISO(event.startDate), "HH:mm"));
      setEndTime(format(parseISO(event.endDate), "HH:mm"));
      setColor(event.color);
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startDate = new Date(parseISO(event.startDate));
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(parseISO(event.endDate));
    endDate.setHours(endHours, endMinutes, 0, 0);

    onSave({
      ...event,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
              <label className="block text-sm font-medium mb-1">
                Start Time
              </label>
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
                onChange={(e) =>
                  setColor(e.target.value as CalendarEvent["color"])
                }
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
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EventCreator: React.FC<{
  selectedDate: Date;
  onSave: (newEvent: CalendarEvent) => void;
  onCancel: () => void;
  tempEvent?: CalendarEvent | null;
}> = ({ selectedDate, onSave, onCancel, tempEvent }) => {
  const [title, setTitle] = React.useState("");
  const [startTime, setStartTime] = React.useState(
    tempEvent ? format(parseISO(tempEvent.startDate), "HH:mm") : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    tempEvent ? format(parseISO(tempEvent.endDate), "HH:mm") : "10:00"
  );
  const [color, setColor] = React.useState("blue");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Combine selected date with time values
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startDate = new Date(selectedDate);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(selectedDate);
    endDate.setHours(endHours, endMinutes, 0, 0);

    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: color as CalendarEvent["color"],
    };

    onSave(newEvent);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Event</DialogTitle>
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
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Create Event</Button>
        </div>
      </form>
    </DialogContent>
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
}> = React.memo(
  ({ event, onMove, onResize, onEdit, onDelete, position, isDraggingId }) => {
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
              className="h-[calc(100%-0.75rem)] w-full"
              onDoubleClick={handleDoubleClick}
            >
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
}> = ({ selectedDate, events, setEvents }) => {
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(
    null
  );
  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [tempEvent, setTempEvent] = React.useState<CalendarEvent | null>(null);

  const moveEvent = (id: string, newStartDate: string, newEndDate: string) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === id
          ? { ...event, startDate: newStartDate, endDate: newEndDate }
          : event
      )
    );
  };

  const resizeEvent = (id: string, newEndDate: string) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === id ? { ...event, endDate: newEndDate } : event
      )
    );
  };

  const deleteEvent = (id: string) => {
    setEvents((prevEvents) => prevEvents.filter((event) => event.id !== id));
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
  };

  const saveEvent = (updatedEvent: CalendarEvent) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
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

  const handleMoveEvent = (
    id: string,
    newStartDate: string,
    newEndDate: string
  ) => {
    setDraggingEventId(id);
    moveEvent(id, newStartDate, newEndDate);
  };

  const handleResizeEvent = (id: string, newEndDate: string) => {
    setDraggingEventId(id);
    resizeEvent(id, newEndDate);
  };

  const handleCreateEvent = (newEvent: CalendarEvent) => {
    setEvents((prevEvents) => [...prevEvents, newEvent]);
    setCreatingEvent(false);
    setEditingEvent(null);
  };

  React.useEffect(() => {
    const handleMouseUp = () => {
      setDraggingEventId(null);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-auto select-none">
        <div className="w-12 flex-shrink-0 pt-1 pb-1">
          {hours.map((hour) => (
            <TimeSlot key={hour} hour={hour} />
          ))}
        </div>

        <div className="flex-1 border-l relative pt-1 pb-1">
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
                    id: "temp",
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
                  />
                ))}
            </div>
          ))}
        </div>
      </div>

      {editingEvent && !creatingEvent && (
        <EventEditor
          event={editingEvent}
          onSave={saveEvent}
          onCancel={closeEditor}
          open={!!editingEvent}
          onOpenChange={(open) => !open && closeEditor()}
        />
      )}

      {creatingEvent && (
        <Dialog open={creatingEvent} onOpenChange={setCreatingEvent}>
          <DialogContent>
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
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [events, setEvents] = React.useState<CalendarEvent[]>(mockEvents);

  const handleCreateEvent = (newEvent: CalendarEvent) => {
    setEvents((prevEvents) => [...prevEvents, newEvent]);
    setCreatingEvent(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const exportFileDefaultName = `events-${format(
      selectedDate,
      "yyyy-MM-dd"
    )}.json`;

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
    <div className="container mx-auto py-4 px-2 sm:py-6 sm:px-4 md:px-6 max-w-7xl bg-background flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="border rounded-md px-4 py-2 text-base font-medium bg-background">
            {format(selectedDate, "yyyy/MM/dd")}
          </div>

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
            className="h-8 px-2 text-sm"
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

        <div className="flex items-center gap-1">
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
            <DialogContent>
              <EventCreator
                selectedDate={selectedDate}
                onSave={handleCreateEvent}
                onCancel={() => setCreatingEvent(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1">
        <div className="border rounded-lg p-2 sm:p-4 h-auto min-h-[300px] mb-20">
          <CalendarDayView
            selectedDate={selectedDate}
            events={events}
            setEvents={setEvents}
          />
        </div>
      </div>
    </div>
  );
};

export default Calendar;
