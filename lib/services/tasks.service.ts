// Tasks service - manages user tasks in Supabase

import type { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  tags?: string[];
}

export class TasksService {
  private supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>;
  private userId: string;

  constructor(
    supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
    userId: string
  ) {
    this.supabase = supabaseClient;
    this.userId = userId;
  }

  /**
   * Get all tasks for the user
   */
  async getTasks(filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    limit?: number;
  }): Promise<Task[]> {
    let query = this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', this.userId)
      .single();

    if (error) {
      console.error('Failed to get task:', error);
      return null;
    }

    return data;
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<Task | null> {
    const task: TaskInsert = {
      user_id: this.userId,
      title: input.title,
      description: input.description,
      priority: input.priority || 'medium',
      due_date: input.dueDate?.toISOString(),
      tags: input.tags || [],
      status: 'pending',
    };

    const { data, error } = await this.supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error('Failed to create task:', error);
      return null;
    }

    return data;
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task | null> {
    const updates: TaskUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.dueDate !== undefined) updates.due_date = input.dueDate.toISOString();
    if (input.tags !== undefined) updates.tags = input.tags;

    // Set completed_at when marking as completed
    if (input.status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (input.status) {
      updates.completed_at = null;
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update task:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Failed to delete task:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: string): Promise<Task | null> {
    return this.updateTask(taskId, { status: 'completed' });
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Failed to get tasks due today:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId)
      .lt('due_date', now.toISOString())
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Failed to get overdue tasks:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    const tasks = await this.getTasks();
    const now = new Date();

    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < now &&
          t.status !== 'completed' &&
          t.status !== 'cancelled'
      ).length,
    };
  }
}
