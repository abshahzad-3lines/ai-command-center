/**
 * API route for user settings
 * GET /api/settings - Fetch user settings
 * PATCH /api/settings - Update user settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService } from '@/lib/services/user.service';
import type { ApiResponse } from '@/types';
import type { Database } from '@/types/database';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UserSettings>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const userService = new UserService(supabase);
    const settings = await userService.getSettings(userId);

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UserSettings>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = await createClient();
    const userService = new UserService(supabase);
    const settings = await userService.updateSettings(userId, body);

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}
