// src/pages/calendar/Goals.tsx
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Play, Pause, Plus, Pencil } from 'lucide-react';
import { GoalDialog } from './GoalDialog';

export interface Goal {
  id: string;
  title: string;
  totalTime: number; // in seconds
  timeSpent: number; // in seconds
  isPaused: boolean;
  days: string[];
  color: string;
  description: string;
}

const GOALS_STORAGE_KEY = 'calendar_goals_v4';

export function Goals() {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = React.useState(false);
  const [expandedGoalId, setExpandedGoalId] = React.useState<string | null>(null);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);

  React.useEffect(() => {
    try {
      const savedGoals = localStorage.getItem(GOALS_STORAGE_KEY);
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('Error loading goals from localStorage:', error);
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving goals to localStorage:', error);
    }
  }, [goals]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toLocaleString('en-us', { weekday: 'short' });
      setGoals(prevGoals =>
        prevGoals.map(goal => {
          if (!goal.isPaused && goal.days.includes(today) && goal.timeSpent < goal.totalTime) {
            return { ...goal, timeSpent: goal.timeSpent + 1 };
          }
          return goal;
        })
      );
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const handleSaveGoal = (goalData: Partial<Goal> & { title: string; time: string; days: string[]; color: string; description: string; }) => {
    const totalTimeInSeconds = parseInt(goalData.time, 10) * 60;
    if (goalData.title.trim() && !isNaN(totalTimeInSeconds) && totalTimeInSeconds > 0) {
      if (goalData.id) { // Editing existing goal
        setGoals(goals.map(g => g.id === goalData.id ? { ...g, ...goalData, totalTime: totalTimeInSeconds } : g));
      } else { // Adding new goal
        const newGoal: Goal = {
          id: Date.now().toString(),
          title: goalData.title.trim(),
          totalTime: totalTimeInSeconds,
          timeSpent: 0,
          isPaused: false,
          days: goalData.days,
          color: goalData.color,
          description: goalData.description,
        };
        setGoals([...goals, newGoal]);
      }
    }
  };

  const handleAddClick = () => {
    setEditingGoal(null);
    setIsGoalDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, goal: Goal) => {
    e.stopPropagation();
    setEditingGoal(goal);
    setIsGoalDialogOpen(true);
  };

  const togglePause = (id: string) => {
    setGoals(goals.map(goal =>
      goal.id === id ? { ...goal, isPaused: !goal.isPaused } : goal
    ));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExpandedGoalId(expandedGoalId === id ? null : id);
  };

  return (
    <div className="mt-8 sm:mt-10">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium">Daily Goals</h3>
        <Button size="sm" onClick={handleAddClick}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>
      
      <ScrollArea className="h-32">
        <div className="space-y-1">
          {goals.map(goal => {
            const percentage = goal.totalTime > 0 ? (goal.timeSpent / goal.totalTime) * 100 : 0;
            const isExpanded = expandedGoalId === goal.id;
            
            return (
              <div
                key={goal.id}
                className={`border rounded-lg relative overflow-hidden transition-all duration-300 bg-card cursor-pointer ${isExpanded ? 'p-2' : 'py-0.5 px-2 mt-3 '}`}
                style={isExpanded ? { backgroundColor: `${goal.color}20` } : {}}
                onClick={() => toggleExpand(goal.id)}
              >
                {!isExpanded && (
                    <div
                        className="absolute top-0 left-0 h-full"
                        style={{ width: `${percentage}%`, backgroundColor: `${goal.color}E6`, transition: 'width 1s linear' }}
                    />
                )}
                <div className="relative">
                  <div className={`flex items-center justify-between ${isExpanded ? 'mb-2' : ''}`}>
                    <span className="font-medium text-xs">{goal.title}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); togglePause(goal.id);}}>
                        {goal.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </Button>
                      {isExpanded && (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleEditClick(e, goal)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); deleteGoal(goal.id);}}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span>{Math.floor(goal.timeSpent / 60)} min spent</span>
                        <span>{goal.totalTime / 60} min total</span>
                      </div>
                      {goal.description && <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>}
                      <div className="flex gap-1 mt-2">
                        {goal.days.map(day => (
                          <span key={day} className="text-xs px-2 py-0.5 rounded-full" style={{backgroundColor: `${goal.color}4D`}}>
                            {day}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <GoalDialog
        open={isGoalDialogOpen}
        onOpenChange={setIsGoalDialogOpen}
        onSave={handleSaveGoal}
        goal={editingGoal}
      />
    </div>
  );
}