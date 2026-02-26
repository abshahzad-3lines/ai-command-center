// API route: GET /api/tasks/[id] - get a single task
// API route: PATCH /api/tasks/[id] - update a task
// API route: DELETE /api/tasks/[id] - delete a task

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TasksService, type UpdateTaskInput } from '@/lib/services/tasks.service';
import type { ApiResponse } from '@/types';
import type { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Task>>> {
  try {
    const { id: taskId } = await context.params;
    const supabase = await createClient();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const tasksService = new TasksService(supabase, userId);
    const task = await tasksService.getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Task>>> {
  try {
    const { id: taskId } = await context.params;
    const supabase = await createClient();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tasksService = new TasksService(supabase, userId);

    const input: UpdateTaskInput = {};
    if (body.title !== undefined) input.title = body.title;
    if (body.description !== undefined) input.description = body.description;
    if (body.status !== undefined) input.status = body.status;
    if (body.priority !== undefined) input.priority = body.priority;
    if (body.dueDate !== undefined) input.dueDate = new Date(body.dueDate);
    if (body.tags !== undefined) input.tags = body.tags;

    const task = await tasksService.updateTask(taskId, input);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { id: taskId } = await context.params;
    const supabase = await createClient();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const tasksService = new TasksService(supabase, userId);
    const deleted = await tasksService.deleteTask(taskId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete task',
      },
      { status: 500 }
    );
  }
}
