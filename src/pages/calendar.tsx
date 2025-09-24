  import * as React from "react";
  import { format, addDays, startOfWeek, parseISO, isSameDay, setHours, addHours, startOfDay } from "date-fns";
  import { ChevronLeft, ChevronRight, X, Download, Upload } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
    event: CalendarEvent; 
    onSave: (updatedEvent: CalendarEvent) => void;
    onCancel: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }> = ({ event, onSave, onCancel, open, onOpenChange }) => {
    const [title, setTitle] = React.useState(event.title);
    const [startTime, setStartTime] = React.useState(format(parseISO(event.startDate), "HH:mm"));
    const [endTime, setEndTime] = React.useState(format(parseISO(event.endDate), "HH:mm"));
    const [color, setColor] = React.useState(event.color);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
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
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value as any)}
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
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
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
  }> = React.memo(({ event, onMove, onResize, onEdit, onDelete, position }) => {
    // Parse dates only once and ensure they update when event changes
    const start = React.useMemo(() => parseISO(event.startDate), [event.startDate]);
    const end = React.useMemo(() => parseISO(event.endDate), [event.endDate]);
    const durationInMinutes = React.useMemo(() => (end.getTime() - start.getTime()) / (1000 * 60), [start, end]);
    const heightInPixels = React.useMemo(() => (durationInMinutes / 60) * 48 - 4, [durationInMinutes]);

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
      
      const startY = e.clientY;
      const originalStart = new Date(start);
      const originalEnd = new Date(end);
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        
        // Calculate the time difference
        const deltaY = moveEvent.clientY - startY;
        const minutesDiff = Math.round(deltaY / 48 * 60); // 48px = 1 hour
        
        // Create new dates
        const newStart = new Date(originalStart.getTime() + minutesDiff * 60000);
        const newEnd = new Date(originalEnd.getTime() + minutesDiff * 60000);
        
        onMove(event.id, newStart.toISOString(), newEnd.toISOString());
      };
      
      const handleMouseUp = () => {
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
    const handleDoubleClick = () => {
      // Don't edit if we're showing the delete button
      if (showDelete) return;
      
      onEdit(event);
    };

    // Handle delete
    const handleDelete = () => {
      onDelete(event.id);
    };

    return (
      <div 
        className={`absolute rounded border px-1 py-0.5 text-xs truncate cursor-move ${colorClasses[event.color]}`}
        style={{ 
          height: `${heightInPixels}px`,
          top: `${(start.getMinutes() / 60) * 48}px`,
          left: `${position.left}%`,
          width: `${position.width}%`
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
              onMouseDown={handleDragStart}
              onDoubleClick={handleDoubleClick}
              className="h-full w-full"
            >
              <div className="font-medium truncate">{event.title}</div>
              <div>
                {format(start, "h:mm a")} - {format(end, "h:mm a")}
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
            {format(new Date().setHours(hour, 0, 0, 0), "hh a")}
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
    setSelectedDate: (date: Date) => void;
    events: CalendarEvent[];
    setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  }> = ({ selectedDate, setSelectedDate, events, setEvents }) => {
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
    
    // Group events by hour and calculate positions for overlapping events
    const eventsByHour: Record<number, CalendarEvent[]> = {};
    const eventPositions: Record<string, { left: number; width: number }> = {};
    
    // Initialize eventsByHour for all 24 hours
    for (let i = 0; i < 24; i++) {
      eventsByHour[i] = [];
    }
    
    // Group events by their start hour
    dayEvents.forEach(event => {
      const startHour = parseISO(event.startDate).getHours();
      eventsByHour[startHour].push(event);
    });
    
    // Calculate positions for overlapping events
    Object.keys(eventsByHour).forEach(hourKey => {
      const hour = parseInt(hourKey);
      const hourEvents = eventsByHour[hour];
      
      // Sort events by start time
      hourEvents.sort((a, b) => 
        parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
      );
      
      // Calculate positions
      hourEvents.forEach((event, index) => {
        if (hourEvents.length === 1) {
          // Single event takes full width
          eventPositions[event.id] = { left: 4, width: 92 };
        } else {
          // Multiple events split the width
          const width = 92 / hourEvents.length;
          const left = 4 + (index * width);
          eventPositions[event.id] = { left, width };
        }
      });
    });
    
    // Generate hours (12 AM to 11 PM)
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full">
        {/* Calendar grid */}
        <div className="flex flex-1 overflow-auto">
          {/* Hours column */}
          <div className="w-12 flex-shrink-0">
            {hours.map(hour => (
              <TimeSlot key={hour} hour={hour} />
            ))}
          </div>
          
          {/* Events column */}
          <div className="flex-1 border-l relative">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="relative border-b" 
                style={{ height: "48px", minHeight: "48px" }}
              >
                {/* Render events for this hour */}
                {eventsByHour[hour].map(event => (
                  <EventBlock 
                    key={event.id} 
                    event={event} 
                    onMove={moveEvent}
                    onResize={resizeEvent}
                    onEdit={editEvent}
                    onDelete={deleteEvent}
                    position={eventPositions[event.id] || { left: 4, width: 92 }}
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
              setSelectedDate={setSelectedDate}
              events={events}
              setEvents={setEvents}
            />
          </div>
        </div>
      </div>
    );
  };

  export default Calendar;