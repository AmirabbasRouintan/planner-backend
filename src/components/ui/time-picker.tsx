import * as React from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (newValue: string) => void;
  className?: string;
  disabled?: boolean;
  use12Hour?: boolean;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  let hours = 9;
  let minutes = 0;
  
  if (match) {
    hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  }
  
  const isPM = hours >= 12;
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return { hours, minutes, hours12, isPM };
}

function formatTime(hours: number, minutes: number) {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

const CLOCK_SIZE = 280;
const CLOCK_RADIUS = CLOCK_SIZE / 2;
const HOUR_HAND_LENGTH = 80;
const MINUTE_HAND_LENGTH = 100;

function getClockPosition(value: number, max: number, radius: number) {
  const angle = (value * 360) / max - 90; // -90 to start at 12 o'clock
  const radian = (angle * Math.PI) / 180;
  const x = CLOCK_RADIUS + radius * Math.cos(radian);
  const y = CLOCK_RADIUS + radius * Math.sin(radian);
  return { x, y, angle: angle };
}

function getValueFromPosition(x: number, y: number, max: number) {
  const centerX = CLOCK_RADIUS;
  const centerY = CLOCK_RADIUS;
  const angle = Math.atan2(y - centerY, x - centerX);
  const degrees = (angle * 180) / Math.PI + 90;
  const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
  return Math.round((normalizedDegrees * max) / 360) % max;
}

export function TimePicker({ value, onChange, className, disabled, use12Hour = false }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'hours' | 'minutes'>('hours');
  const [isDragging, setIsDragging] = React.useState(false);
  const clockRef = React.useRef<HTMLDivElement>(null);
  
  const { hours, minutes, hours12, isPM } = React.useMemo(() => parseTime(value), [value]);

  const handleClockClick = React.useCallback((event: React.MouseEvent) => {
    if (!clockRef.current) return;
    
    const rect = clockRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (mode === 'hours') {
      if (use12Hour) {
        const hourValue = getValueFromPosition(x, y, 12);
        const newHour12 = hourValue === 0 ? 12 : hourValue;
        const newHour24 = newHour12 === 12 ? (isPM ? 12 : 0) : (isPM ? newHour12 + 12 : newHour12);
        onChange(formatTime(newHour24, minutes));
      } else {
        // 24-hour mode: map to 0-23
        const hourValue = getValueFromPosition(x, y, 24);
        onChange(formatTime(hourValue, minutes));
      }
      setMode('minutes');
    } else {
      const minuteValue = getValueFromPosition(x, y, 60);
      onChange(formatTime(hours, minuteValue));
    }
  }, [mode, hours, minutes, isPM, use12Hour, onChange]);

  const handleMouseDown = React.useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    handleClockClick(event);
  }, [handleClockClick]);

  const handleMouseMove = React.useCallback((event: React.MouseEvent) => {
    if (!isDragging) return;
    handleClockClick(event);
  }, [isDragging, handleClockClick]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const toggleAMPM = React.useCallback(() => {
    if (!use12Hour) return;
    const newHours = isPM ? hours - 12 : hours + 12;
    onChange(formatTime(Math.max(0, Math.min(23, newHours)), minutes));
  }, [hours, minutes, isPM, use12Hour, onChange]);

  const incrementMinute = React.useCallback(() => {
    const newMinutes = (minutes + 1) % 60;
    onChange(formatTime(hours, newMinutes));
  }, [hours, minutes, onChange]);

  const decrementMinute = React.useCallback(() => {
    const newMinutes = minutes === 0 ? 59 : minutes - 1;
    onChange(formatTime(hours, newMinutes));
  }, [hours, minutes, onChange]);

  const renderHourMarkers = () => {
    const markers = [];
    
    if (use12Hour) {
      // 12-hour format: show 1-12
      for (let i = 1; i <= 12; i++) {
        const position = getClockPosition(i, 12, 110);
        const isSelected = hours12 === i;
        
        markers.push(
          <div
            key={i}
            className={cn(
              "absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all",
              isSelected 
                ? "bg-primary text-primary-foreground shadow-md scale-110" 
                : "bg-background border-2 border-border hover:bg-accent hover:scale-105"
            )}
            style={{
              left: position.x - 16,
              top: position.y - 16,
            }}
            onClick={() => {
              const newHour24 = i === 12 ? (isPM ? 12 : 0) : (isPM ? i + 12 : i);
              onChange(formatTime(newHour24, minutes));
              setMode('minutes');
            }}
          >
            {i}
          </div>
        );
      }
    } else {
      // 24-hour format: show all 24 hours but display every 2 hours for readability
      for (let i = 0; i < 24; i += 1) {
        const position = getClockPosition(i, 24, 110);
        const isSelected = hours === i;
        const showLabel = i % 2 === 0; // Only show labels for even hours
        
        markers.push(
          <div
            key={i}
            className={cn(
              "absolute rounded-full flex items-center justify-center font-medium cursor-pointer transition-all",
              showLabel ? "w-8 h-8 text-xs" : "w-2 h-2",
              isSelected 
                ? "bg-primary text-primary-foreground shadow-md scale-110" 
                : showLabel 
                  ? "bg-background border border-border hover:bg-accent hover:scale-105"
                  : "bg-muted-foreground/30"
            )}
            style={{
              left: position.x - (showLabel ? 16 : 4),
              top: position.y - (showLabel ? 16 : 4),
            }}
            onClick={() => {
              onChange(formatTime(i, minutes));
              setMode('minutes');
            }}
          >
            {showLabel ? pad2(i) : ''}
          </div>
        );
      }
    }
    return markers;
  };

  const renderMinuteMarkers = () => {
    const markers = [];
    for (let i = 0; i < 60; i += 5) {
      const position = getClockPosition(i, 60, 110);
      const isSelected = Math.abs(minutes - i) < 3;
      
      markers.push(
        <div
          key={i}
          className={cn(
            "absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all",
            isSelected 
              ? "bg-primary text-primary-foreground shadow-md scale-110" 
              : "bg-background border border-border hover:bg-accent hover:scale-105"
          )}
          style={{
            left: position.x - 16,
            top: position.y - 16,
          }}
          onClick={() => {
            onChange(formatTime(hours, i));
          }}
        >
          {pad2(i)}
        </div>
      );
    }
    return markers;
  };

  
  const displayTime = use12Hour 
    ? `${pad2(hours12)}:${pad2(minutes)} ${isPM ? 'PM' : 'AM'}`
    : `${pad2(hours)}:${pad2(minutes)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span>{displayTime}</span>
          <Clock className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-bold tabular-nums">
              {displayTime}
            </div>
            <div className="flex gap-1">
              <Button
                variant={mode === 'hours' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('hours')}
              >
                Hours
              </Button>
              <Button
                variant={mode === 'minutes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('minutes')}
              >
                Minutes
              </Button>
            </div>
          </div>

          {/* Clock */}
          <div className="flex justify-center mb-4">
            <div
              ref={clockRef}
              className="relative bg-muted/20 rounded-full cursor-pointer select-none"
              style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Center dot */}
              <div
                className="absolute w-3 h-3 bg-primary rounded-full"
                style={{
                  left: CLOCK_RADIUS - 6,
                  top: CLOCK_RADIUS - 6,
                }}
              />
              
              {/* Hour/Minute markers */}
              {mode === 'hours' ? renderHourMarkers() : renderMinuteMarkers()}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            {mode === 'minutes' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decrementMinute}
                >
                  -1
                </Button>
                <span className="text-sm font-medium w-12 text-center">
                  {pad2(minutes)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={incrementMinute}
                >
                  +1
                </Button>
              </div>
            )}
            
            {use12Hour && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAMPM}
                className="ml-auto"
              >
                {isPM ? 'PM' : 'AM'}
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="ml-2"
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TimePicker;