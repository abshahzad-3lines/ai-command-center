'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (taskDate.getTime() === today.getTime()) return 'Today';
  if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (taskDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString();
}

export default function TasksPage() {
  const { user, profileId, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': profileId || user?.localAccountId || 'anonymous',
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks', { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, user?.localAccountId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? data.data : t))
        );
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? task : t))
      );
    }
  };

  const deleteTask = async (taskId: string) => {
    const prev = tasks;
    setTasks((t) => t.filter((task) => task.id !== taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!data.success) {
        setTasks(prev);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      setTasks(prev);
    }
  };

  const addTask = async () => {
    if (!newTask.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTask.trim(),
          priority: 'medium',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTasks((prev) => [data.data, ...prev]);
        setNewTask('');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const priorityColors: Record<string, string> = {
    low: 'text-blue-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;

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
              <Button onClick={addTask} disabled={!newTask.trim() || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Task'}
              </Button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
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
                      task.status === 'completed' && 'opacity-60'
                    )}
                  >
                    <button onClick={() => toggleTask(task)}>
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'font-medium',
                          task.status === 'completed' && 'line-through text-muted-foreground'
                        )}
                      >
                        {task.title}
                      </p>
                      {task.due_date && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDueDate(task.due_date)}
                        </div>
                      )}
                    </div>

                    <Flag className={cn('h-4 w-4', priorityColors[task.priority || 'medium'])} />

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
