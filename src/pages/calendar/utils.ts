import { startOfDay, isSameDay, parseISO } from "date-fns";
import type { CalendarEvent } from "./types";

export const getEventsForDay = (
  date: Date,
  events: CalendarEvent[]
): CalendarEvent[] => {
  const dayStart = startOfDay(date);
  return events.filter((event) => {
    const eventStart = startOfDay(parseISO(event.startDate));
    return isSameDay(eventStart, dayStart);
  });
};