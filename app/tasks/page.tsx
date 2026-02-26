'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { ChatWidget } from '@/components/modules/chat';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Calendar,
  Flag,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

const initialTasks: Task[] = [
  { id: '1', title: 'Review project proposal', completed: false, priority: 'high', dueDate: 'Today' },
  { id: '2', title: 'Send weekly report', completed: false, priority: 'medium', dueDate: 'Tomorrow' },
  { id: '3', title: 'Schedule team meeting', completed: true, priority: 'low', dueDate: 'Yesterday' },
  { id: '4', title: 'Update documentation', completed: false, priority: 'medium' },
  { id: '5', title: 'Code review for PR #123', completed: false, priority: 'high', dueDate: 'Today' },
];

export default function TasksPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState('');

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.trim(),
      completed: false,
      priority: 'medium',
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const priorityColors = {
    low: 'text-blue-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <DashboardShell
      user={
        user
          ? { name: user.name || user.username || 'User', email: user.username || '' }
          : undefined
      }
      onSignOut={logout}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground">
              {pendingCount} pending, {completedCount} completed
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-2xl border bg-card overflow-hidden flex flex-col">
          {/* Add Task Input */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 rounded-lg border bg-background px-4 py-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a new task..."
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button onClick={addTask} disabled={!newTask.trim()}>
                Add Task
              </Button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No tasks yet</h2>
                <p className="text-muted-foreground">Add your first task above.</p>
              </div>
            ) : (
              <div className="divide-y">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group',
                      task.completed && 'opacity-60'
                    )}
                  >
                    <button onClick={() => toggleTask(task.id)}>
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'font-medium',
                          task.completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {task.dueDate}
                        </div>
                      )}
                    </div>

                    <Flag className={cn('h-4 w-4', priorityColors[task.priority])} />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ChatWidget />
    </DashboardShell>
  );
}
