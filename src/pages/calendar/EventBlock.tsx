// EventBlock.tsx - Component for rendering and managing individual calendar events
import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import type { CalendarEvent } from "./types";

interface Props {
  event: CalendarEvent;
  onMove: (id: string, newStartDate: string, newEndDate: string) => void;
  onResize: (id: string, newEndDate: string) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  position: { left: number; width: number };
  isDraggingId: string | null;
  }

const EventBlock: React.FC<Props> = React.memo(
  ({
    event,
    onMove,
    onResize,
    onEdit,
    onDelete,
    position,
    isDraggingId,
    }) => {
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
    const longPressTimerRef = React.useRef<number | null>(null);
    const progressIntervalRef = React.useRef<number | null>(null);
    const [isTouchDragging, setIsTouchDragging] = React.useState(false);
    const [longPressProgress, setLongPressProgress] = React.useState(0);
    const blockRef = React.useRef<HTMLDivElement | null>(null);

    const colorClasses = {
      blue: "bg-blue-100 border-blue-200 text-blue-800",
      green: "bg-green-100 border-green-200 text-green-800",
      red: "bg-red-100 border-red-200 text-red-800",
      yellow: "bg-yellow-100 border-yellow-200 text-yellow-800",
      purple: "bg-purple-100 border-purple-200 text-purple-800",
      orange: "bg-orange-100 border-orange-200 text-orange-800",
      gray: "bg-gray-100 border-gray-200 text-gray-800"
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
      setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() });
      setLongPressProgress(0);

      // Start visual progress for long-press
      progressIntervalRef.current = window.setInterval(() => {
        setLongPressProgress((prev) => Math.min(prev + 100 / 50, 100));
      }, 10);

      // Long-press activation after 500ms
      longPressTimerRef.current = window.setTimeout(() => {
        if (progressIntervalRef.current !== null) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setIsTouchDragging(true);
        setTouchStart(null);
        setLongPressProgress(0);

        const element = blockRef.current;
        if (element) {
          element.style.opacity = "0.8";
          element.style.transform = "scale(1.02)";
          element.style.zIndex = "100";
          element.style.transition = "transform 0.2s ease-out";
        }

        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 500);
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

    const handleTouchEnd = () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const element = blockRef.current;
      if (element) {
        element.style.opacity = "";
        element.style.transform = "";
        element.style.zIndex = "";
        element.style.transition = "";
      }

      setIsTouchDragging(false);
      setTouchStart(null);
      setLongPressProgress(0);
    };

    const handleTouchCancel = () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const element = blockRef.current;
      if (element) {
        element.style.opacity = "";
        element.style.transform = "";
        element.style.zIndex = "";
        element.style.transition = "";
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
            ref={blockRef}
            className={`absolute rounded-sm border px-0.5 py-0.5 text-xs truncate cursor-move select-none event-block ${
              colorClasses[event.color]
            } ${isTouchDragging ? "shadow-lg scale-105" : ""}`}
            style={{
              height: `${heightInPixels}px`,
              top: `${(start.getMinutes() / 60) * 48}px`,
              left: `${position.left}%`,
              width: `${position.width}%`,
              zIndex: isDraggingId === event.id || isTouchDragging ? 50 : 10,
              transition: 'all 0.2s ease-in-out'
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
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

export default EventBlock;
