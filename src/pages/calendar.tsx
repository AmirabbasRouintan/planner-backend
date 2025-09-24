  import * as React from "react";
  import { format, addDays, parseISO, isSameDay, startOfDay } from "date-fns";
  import { ChevronLeft, ChevronRight, Download, Upload } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";

  // Simple event type
  interface CalendarEvent {
    id: string;
    title: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    color: "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray";
  }

  // Mock data for events
  const mockEvents: CalendarEvent[] = [
    {
      id: "1",
      title: "Team Meeting",
      startDate: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
      endDate: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
      color: "blue"
    },
    {
      id: "2",
      title: "Lunch with Client",
      startDate: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
      endDate: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
      color: "green"
    },
    {
      id: "3",
      title: "Project Deadline",
      startDate: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
      endDate: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
      color: "red"
    }
  ];

  // Event editor form component
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
      
      // Check if event exists before proceeding
      if (!event) return;
      
      // Combine event date with new time values
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
        color
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
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Event creator form component
  const EventCreator: React.FC<{ 
    selectedDate: Date;
    onSave: (newEvent: CalendarEvent) => void;
    onCancel: () => void;
  }> = ({ selectedDate, onSave, onCancel }) => {
    const [title, setTitle] = React.useState("");
    const [startTime, setStartTime] = React.useState("09:00");
    const [endTime, setEndTime] = React.useState("10:00");
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
        id: Math.random().toString(36).substr(2, 9), // Generate a random ID
        title,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color: color as CalendarEvent["color"]
      };
      
      onSave(newEvent);
    };

    return (
      <>
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
                className="w-full border rounded px-3 py-2 text-sm bg-gray-800 text-white"
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
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
            >
              Create Event
            </Button>
          </div>
        </form>
      </>
    );
  };

  // Helper function to get events for a specific day
  const getEventsForDay = (date: Date, events: CalendarEvent[]): CalendarEvent[] => {
    const dayStart = startOfDay(date);
    return events.filter(event => {
      const eventStart = startOfDay(parseISO(event.startDate));
      return isSameDay(eventStart, dayStart);
    });
  };

  // Event block component with drag and resize functionality
  const EventBlock: React.FC<{ 
    event: CalendarEvent; 
    onMove: (id: string, newStartDate: string, newEndDate: string) => void;
    onResize: (id: string, newEndDate: string) => void;
    onEdit: (event: CalendarEvent) => void;
    onDelete: (id: string) => void; // Add delete handler
    position: { left: number; width: number }; // For positioning overlapping events
    isDraggingId: string | null; // Track which event is being dragged
  }> = React.memo(({ event, onMove, onResize, onEdit, onDelete, position, isDraggingId }) => {
    // Parse dates only once and ensure they update when event changes
    const start = React.useMemo(() => parseISO(event.startDate), [event.startDate]);
    const end = React.useMemo(() => parseISO(event.endDate), [event.endDate]);
    const durationInMinutes = React.useMemo(() => (end.getTime() - start.getTime()) / (1000 * 60), [start, end]);
    const heightInPixels = React.useMemo(() => (durationInMinutes / 60) * 48 - 4, [durationInMinutes]);

    // Use ref to track drag state for reliable access in event handlers
    const isDragging = React.useRef(false);

    const colorClasses = {
      blue: "bg-blue-100 border-blue-200 text-blue-800",
      green: "bg-green-100 border-green-200 text-green-800",
      red: "bg-red-100 border-red-200 text-red-800",
      yellow: "bg-yellow-100 border-yellow-200 text-yellow-800",
      purple: "bg-purple-100 border-purple-200 text-purple-800",
      orange: "bg-orange-100 border-orange-200 text-orange-800",
      gray: "bg-gray-100 border-gray-200 text-gray-800"
    };

    // Swipe detection state
    const [swipeStart, setSwipeStart] = React.useState<{ x: number; y: number } | null>(null);
    const [showDelete, setShowDelete] = React.useState(false);

    // Handle drag start
    const handleDragStart = (e: React.MouseEvent) => {
      // Don't start drag if we're showing the delete button
      if (showDelete) return;
      
      e.stopPropagation();
      
      // Prevent text selection during drag
      const body = document.body;
      body.classList.add('select-none');
      
      // Disable pointer events on all event blocks during drag
      const eventBlocks = document.querySelectorAll('.event-block');
      eventBlocks.forEach(block => block.classList.add('pointer-events-none'));
      
      // Set dragging state
      isDragging.current = true;
      
      const startY = e.clientY;
      const originalStart = new Date(start);
      const originalEnd = new Date(end);
      const originalDuration = originalEnd.getTime() - originalStart.getTime();
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        
        // Calculate the time difference
        const deltaY = moveEvent.clientY - startY;
        const minutesDiff = Math.round(deltaY / 48 * 60); // 48px = 1 hour
        
        // Snap to 5-minute intervals
        const snappedMinutesDiff = Math.round(minutesDiff / 5) * 5;
        
        // Create new dates based on the drag
        const newStart = new Date(originalStart.getTime() + snappedMinutesDiff * 60000);
        const newEnd = new Date(originalEnd.getTime() + snappedMinutesDiff * 60000);
        
        // Handle looping behavior when dragging beyond calendar boundaries
        let finalStart = newStart;
        let finalEnd = newEnd;
        
        // If dragged beyond the top (00:00), loop to the bottom (23:59)
        if (newStart < originalStart && (newStart.getDate() < originalStart.getDate() || 
          newStart.getMonth() < originalStart.getMonth() || 
          newStart.getFullYear() < originalStart.getFullYear())) {
        // Move to the same day but at the bottom of the time range (around 23:55)
        finalStart = new Date(originalStart);
        finalStart.setHours(23, 55, 0, 0);
        
        // Adjust end time to maintain the original duration
        finalEnd = new Date(finalStart.getTime() + originalDuration);
        
        // If the event extends past midnight, cap it at 23:59:59
        const endOfDay = new Date(originalStart);
        endOfDay.setHours(23, 59, 59, 999);
        if (finalEnd > endOfDay) {
          finalEnd = endOfDay;
          // Adjust start time to maintain duration
          finalStart = new Date(finalEnd.getTime() - originalDuration);
        }
      }
      // If dragged beyond the bottom (23:59), loop to the top (00:00)
      else if (newEnd > originalEnd && (newEnd.getDate() > originalEnd.getDate() || 
                newEnd.getMonth() > originalEnd.getMonth() || 
                newEnd.getFullYear() > originalEnd.getFullYear())) {
        // Move to the same day but at the top of the time range (00:00)
        finalStart = new Date(originalStart);
        finalStart.setHours(0, 0, 0, 0);
        
        // Adjust end time to maintain the original duration
        finalEnd = new Date(finalStart.getTime() + originalDuration);
        
        // If the event extends past midnight, cap it at the end of the day
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
      // Reset dragging flag to false
      isDragging.current = false;
        
      // Re-enable text selection
      const body = document.body;
      body.classList.remove('select-none');
        
      // Re-enable pointer events on all event blocks
      const eventBlocks = document.querySelectorAll('.event-block');
      eventBlocks.forEach(block => block.classList.remove('pointer-events-none'));
        
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
      
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
      // Don't start resize if we're showing the delete button
      if (showDelete) return;
      
      e.stopPropagation();
      
      const startY = e.clientY;
      const originalEnd = new Date(end);
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        
        // Calculate the time difference
        const deltaY = moveEvent.clientY - startY;
        const minutesDiff = Math.round(deltaY / 48 * 60); // 48px = 1 hour
        
        // Create new end date
        const newEnd = new Date(originalEnd.getTime() + minutesDiff * 60000);
        
        // Ensure the event has a minimum duration of 15 minutes
        if (newEnd > start) {
          onResize(event.id, newEnd.toISOString());
        }
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // Handle swipe start
    const handleSwipeStart = (e: React.MouseEvent) => {
      // Only start swipe detection on the main event area, not on resize handle
      if ((e.target as HTMLElement).classList.contains('cursor-se-resize')) {
        return;
      }
      
      setSwipeStart({ x: e.clientX, y: e.clientY });
      setShowDelete(false); // Reset delete state on new interaction
    };

    // Handle swipe move
    React.useEffect(() => {
      if (!swipeStart) return;

      const handleSwipeMove = (e: MouseEvent) => {
        const deltaX = e.clientX - swipeStart.x;
        const deltaY = e.clientY - swipeStart.y;
      
        // If horizontal swipe is detected (more horizontal than vertical movement)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
          if (deltaX < 0) {
            // Swiped left - show delete button
            setShowDelete(true);
          }
          setSwipeStart(null);
        }
      
        // If significant vertical movement, cancel swipe detection
        if (Math.abs(deltaY) > 10) {
          setSwipeStart(null);
        }
      };

      const handleSwipeEnd = () => {
        setSwipeStart(null);
      };

      document.addEventListener('mousemove', handleSwipeMove);
      document.addEventListener('mouseup', handleSwipeEnd);

      return () => {
        document.removeEventListener('mousemove', handleSwipeMove);
        document.removeEventListener('mouseup', handleSwipeEnd);
      };
    }, [swipeStart]);

    // Handle double click to edit
    const handleDoubleClick = (e: React.MouseEvent) => {
      // Don't edit if we're showing the delete button or dragging
      if (showDelete || isDragging.current) return;
      
      // Prevent event from bubbling up to parent elements
      e.stopPropagation();
      e.preventDefault();
      
      onEdit(event);
    };

    // Handle mouse down on the main event area
    const handleEventMouseDown = (e: React.MouseEvent) => {
      // Don't start drag if we're showing the delete button
      if (showDelete) return;
      
      // Check if this is a potential drag start
      handleDragStart(e);
    };

    // Handle delete
    const handleDelete = () => {
      onDelete(event.id);
    };

    return (
      <div 
        className={`absolute rounded border px-1 py-0.5 text-xs truncate cursor-move select-none event-block ${colorClasses[event.color]}`}
        style={{ 
          height: `${heightInPixels}px`,
          top: `${(start.getMinutes() / 60) * 48}px`,
          left: `${position.left}%`,
          width: `${position.width}%`,
          zIndex: isDraggingId === event.id ? 50 : 10 // Bring dragged event to front
        }}
        onMouseDown={handleSwipeStart}
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
            <div 
              onMouseDown={handleEventMouseDown}
              onDoubleClick={handleDoubleClick}
              className="h-full w-full"
            >
              <div className="font-medium truncate">{event.title}</div>
              <div>
                {format(start, "HH:mm")} - {format(end, "HH:mm")}
              </div>
            </div>
            {/* Resize handle */}
            <div 
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-current opacity-50"
              onMouseDown={handleResizeStart}
            />
          </>
        )}
      </div>
    );
  });

  // Time slot component
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

  // Calendar day view component
  const CalendarDayView: React.FC<{ 
    selectedDate: Date; 
    events: CalendarEvent[];
    setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  }> = ({ selectedDate, events, setEvents }) => {
    const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
    
    // Update event position
    const moveEvent = (id: string, newStartDate: string, newEndDate: string) => {
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === id 
            ? { ...event, startDate: newStartDate, endDate: newEndDate } 
            : event
        )
      );
    };

    // Resize event
    const resizeEvent = (id: string, newEndDate: string) => {
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === id 
            ? { ...event, endDate: newEndDate } 
            : event
        )
      );
    };

    // Delete event
    const deleteEvent = (id: string) => {
      setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
    };

    // Edit event
    const editEvent = (event: CalendarEvent) => {
      setEditingEvent(event);
    };

    // Save edited event
    const saveEvent = (updatedEvent: CalendarEvent) => {
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === updatedEvent.id ? updatedEvent : event
        )
      );
      setEditingEvent(null);
    };

    // Close editor
    const closeEditor = () => {
      setEditingEvent(null);
    };

    const dayEvents = getEventsForDay(selectedDate, events);

    // Function to check if two events overlap
    const eventsOverlap = (event1: CalendarEvent, event2: CalendarEvent) => {
      const start1 = parseISO(event1.startDate);
      const end1 = parseISO(event1.endDate);
      const start2 = parseISO(event2.startDate);
      const end2 = parseISO(event2.endDate);
      
      return start1 < end2 && start2 < end1;
    };

    // Function to find overlapping groups
    const getOverlappingGroups = (events: CalendarEvent[]) => {
      const groups: CalendarEvent[][] = [];
      const visited = new Set<string>();
      
      events.forEach(event => {
        if (visited.has(event.id)) return;
        
        const group: CalendarEvent[] = [event];
        visited.add(event.id);
        
        const checkOverlaps = (currentEvent: CalendarEvent) => {
          events.forEach(otherEvent => {
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

    // Calculate positions for overlapping events
    const eventPositions: Record<string, { left: number; width: number }> = {};
    
    // Get overlapping groups
    const overlappingGroups = getOverlappingGroups(dayEvents);
    
    // Process each group
    overlappingGroups.forEach(group => {
      // Sort events in group by start time
      group.sort((a, b) => 
        parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
      );
      
      if (group.length === 1) {
        // Single event takes full width
        eventPositions[group[0].id] = { left: 0, width: 100 };
      } else {
        // Multiple overlapping events split the width
        const width = 100 / group.length;
        group.forEach((event, index) => {
          eventPositions[event.id] = { 
            left: index * width, 
            width: width - (group.length > 1 ? 1 : 0) // Subtract 1 for spacing between events
          };
        });
      }
    });

    // Generate hours (12 AM to 11 PM)
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // State to track which event is being dragged
    const [draggingEventId, setDraggingEventId] = React.useState<string | null>(null);

    // Custom move event handler to track dragging event
    const handleMoveEvent = (id: string, newStartDate: string, newEndDate: string) => {
      setDraggingEventId(id);
      moveEvent(id, newStartDate, newEndDate);
    };

    // Custom resize event handler to track dragging event
    const handleResizeEvent = (id: string, newEndDate: string) => {
      setDraggingEventId(id);
      resizeEvent(id, newEndDate);
    };

    // Reset dragging event when mouse is released
    React.useEffect(() => {
      const handleMouseUp = () => {
        setDraggingEventId(null);
      };

      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, []);

    return (
      <div className="flex flex-col h-full">
        {/* Calendar grid */}
        <div className="flex flex-1 overflow-auto select-none">
          {/* Hours column */}
          <div className="w-12 flex-shrink-0 pt-1 pb-1">
            {hours.map((hour) => (
              <TimeSlot key={hour} hour={hour} />
            ))}
          </div>

          {/* Events column */}
          <div className="flex-1 border-l relative pt-1 pb-1">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b"
                style={{ height: "48px", minHeight: "48px" }}
              >
                {/* Render events for this hour */}
                {dayEvents
                  .filter(event => parseISO(event.startDate).getHours() === hour)
                  .map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      onMove={handleMoveEvent}
                      onResize={handleResizeEvent}
                      onEdit={editEvent}
                      onDelete={deleteEvent}
                      position={eventPositions[event.id] || { left: 0, width: 100 }}
                      isDraggingId={draggingEventId}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Event editor modal */}
        {editingEvent && (
          <EventEditor
            event={editingEvent}
            onSave={saveEvent}
            onCancel={closeEditor}
            open={!!editingEvent}
            onOpenChange={(open) => !open && closeEditor()}
          />
        )}
      </div>
    );
  };

  const Calendar: React.FC = () => {
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [creatingEvent, setCreatingEvent] = React.useState(false);
    const [events, setEvents] = React.useState<CalendarEvent[]>(mockEvents);
    
    // Create new event handler
    const handleCreateEvent = (newEvent: CalendarEvent) => {
      setEvents(prevEvents => [...prevEvents, newEvent]);
      setCreatingEvent(false);
    };
    
    // Export events handler
    const handleExport = () => {
      const dataStr = JSON.stringify(events, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `events-${format(selectedDate, "yyyy-MM-dd")}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    };
    
    // Import events handler
    const handleImport = () => {
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      inputElement.accept = '.json';
      
      inputElement.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const importedEvents = JSON.parse(e.target?.result as string);
              if (Array.isArray(importedEvents)) {
                setEvents(prevEvents => [...prevEvents, ...importedEvents]);
              }
            } catch (error) {
              console.error('Error parsing imported file:', error);
            }
          };
          reader.readAsText(file);
        }
      };
      
      inputElement.click();
    };

    return (
      <div className="container mx-auto py-4 px-2 sm:py-6 sm:px-4 md:px-6 max-w-7xl bg-background h-screen flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-secondary rounded-md px-4 py-2 text-base font-medium">
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
                <Button size="sm" className="h-8 px-2 text-sm">
                  Add Event
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
          <div className="border rounded-lg p-2 sm:p-4 h-[calc(100%-2rem)]">
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