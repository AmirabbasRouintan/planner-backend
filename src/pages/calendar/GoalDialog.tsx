
import * as React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlockPicker } from 'react-color';
import type { Goal } from './Goals';

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: Partial<Goal> & { title: string; time: string; days: string[]; color: string; description: string; }) => void;
  goal?: Goal | null;
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const colorfulPalette = [
  '#D9E3F0', '#F47373', '#697689', '#37D67A', '#2CCCE4', '#555555',
  '#dce775', '#ff8a65', '#ba68c8', '#4fc3f7', '#a1887f', '#e0e0e0'
];

export function GoalDialog({ open, onOpenChange, onSave, goal }: GoalDialogProps) {
  const [title, setTitle] = React.useState('');
  const [time, setTime] = React.useState('');
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [color, setColor] = React.useState(colorfulPalette[0]);
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setTime(String(goal.totalTime / 60));
      setSelectedDays(goal.days);
      setColor(goal.color);
      setDescription(goal.description);
    } else {
      setTitle('');
      setTime('');
      setSelectedDays([]);
      setColor(colorfulPalette[0]);
      setDescription('');
    }
  }, [goal, open]);

  const handleDayClick = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    onSave({ id: goal?.id, title, time, days: selectedDays, color, description });
    onOpenChange(false);
  };

  const dialogTitle = goal ? "Edit Daily Goal" : "Add New Daily Goal";
  const dialogDescription = goal ? "Edit the details of your existing goal." : "Set a new goal you want to track daily.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-title">Goal</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Learn React"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-time">Time to spend (minutes)</Label>
            <Input
              id="goal-time"
              type="number"
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="e.g., 30"
            />
          </div>
          <div className="space-y-2">
            <Label>Days of the week</Label>
            <div className="flex gap-2">
              {weekDays.map(day => (
                <Button
                  key={day}
                  variant={selectedDays.includes(day) ? "default" : "outline"}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <BlockPicker
              colors={colorfulPalette}
              color={color}
              onChangeComplete={c => setColor(c.hex)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-description">Description</Label>
            <Textarea
              id="goal-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short description of the goal."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{goal ? "Save Changes" : "Add Goal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
