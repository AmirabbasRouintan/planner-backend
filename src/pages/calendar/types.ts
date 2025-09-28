export type CalendarColor = "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  color: CalendarColor;
  isImportant?: boolean;
}

export const initialEvents: CalendarEvent[] = [];