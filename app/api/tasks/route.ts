// API route: GET /api/tasks - fetch tasks
// API route: POST /api/tasks - create a task

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TasksService, type CreateTaskInput } from '@/lib/services/tasks.service';
import type { ApiResponse } from '@/types';
import type { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Task[]>>> {
  try {
    const supabase = await createClient();

    // Get user from X-User-Id header (from MSAL auth)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const tasksService = new TasksService(supabase, userId);

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
    const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const tasks = await tasksService.getTasks({
      status: status || undefined,
      priority: priority || undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Task>>> {
  try {
    const supabase = await createClient();

    // Get user from X-User-Id header
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tasksService = new TasksService(supabase, userId);

    const input: CreateTaskInput = {
      title: body.title,
      description: body.description,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      tags: body.tags,
    };

    const task = await tasksService.createTask(input);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Failed to create task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
      },
      { status: 500 }
    );
  }
}
