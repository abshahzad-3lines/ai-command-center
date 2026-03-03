/**
 * POST /api/auth/ensure-profile
 * Ensures a Supabase profile exists for the Microsoft-authenticated user.
 * Creates one if it doesn't exist, returns the existing one if it does.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';
import crypto from 'crypto';

interface EnsureProfileRequest {
  microsoftId: string;
  email?: string;
  name?: string;
}

interface ProfileResponse {
  id: string;
  email: string | null;
  full_name: string | null;
  microsoft_id: string | null;
}

/**
 * Generate a deterministic UUID v5 from a Microsoft account ID.
 * Uses a fixed namespace so the same Microsoft ID always maps to the same UUID.
 */
function microsoftIdToUuid(microsoftId: string): string {
  // UUID v5 namespace (custom, fixed for this app)
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace UUID
  const hash = crypto.createHash('sha1')
    .update(Buffer.from(namespace.replace(/-/g, ''), 'hex'))
    .update(microsoftId)
    .digest('hex');

  // Format as UUID v5
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16), // version 5
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20), // variant
    hash.substring(20, 32),
  ].join('-');
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ProfileResponse>>> {
  try {
    const body: EnsureProfileRequest = await request.json();

    if (!body.microsoftId) {
      return NextResponse.json(
        { success: false, error: 'microsoftId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const profileId = microsoftIdToUuid(body.microsoftId);

    // Try to find existing profile by microsoft_id
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, email, full_name, microsoft_id')
      .eq('microsoft_id', body.microsoftId)
      .single();

    if (existing) {
      // Update name/email if changed
      if (
        (body.email && body.email !== existing.email) ||
        (body.name && body.name !== existing.full_name)
      ) {
        await supabase
          .from('profiles')
          .update({
            email: body.email || existing.email,
            full_name: body.name || existing.full_name,
          })
          .eq('id', existing.id);
      }

      return NextResponse.json({
        success: true,
        data: existing as ProfileResponse,
      });
    }

    // Create new profile
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        microsoft_id: body.microsoftId,
        email: body.email || null,
        full_name: body.name || null,
      })
      .select('id, email, full_name, microsoft_id')
      .single();

    if (error) {
      // Handle race condition — profile may have been created concurrently
      if (error.code === '23505') {
        const { data: raceProfile } = await supabase
          .from('profiles')
          .select('id, email, full_name, microsoft_id')
          .eq('microsoft_id', body.microsoftId)
          .single();

        if (raceProfile) {
          return NextResponse.json({
            success: true,
            data: raceProfile as ProfileResponse,
          });
        }
      }

      console.error('Failed to create profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    // Create default user_settings row for the new profile
    await supabase
      .from('user_settings')
      .upsert({
        user_id: profileId,
        theme: 'system',
        notifications_email: true,
        notifications_push: false,
        notifications_desktop: true,
        email_connected: false,
        calendar_connected: false,
      }, { onConflict: 'user_id' });

    return NextResponse.json({
      success: true,
      data: created as ProfileResponse,
    });
  } catch (error) {
    console.error('Ensure profile error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      },
      { status: 500 }
    );
  }
}
