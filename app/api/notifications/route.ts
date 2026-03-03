import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getOverdueTasks(supabase: SupabaseClient, userId: string): Promise<Notification[]> {
  const now = new Date().toISOString();
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', now)
    .not('due_date', 'is', null)
    .limit(10);

  if (!tasks) return [];

  return tasks.map((task) => ({
    id: `task-${task.id}`,
    title: 'Overdue task',
    message: task.title,
    time: task.due_date ? timeAgo(new Date(task.due_date)) : '',
    read: false,
  }));
}

async function getHighPriorityEmails(supabase: SupabaseClient, userId: string): Promise<Notification[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: emails } = await supabase
    .from('email_cache')
    .select('id, email_id, subject, sender_name, received_at')
    .eq('user_id', userId)
    .eq('ai_priority', 'high')
    .eq('is_read', false)
    .gte('received_at', oneDayAgo)
    .limit(10);

  if (!emails) return [];

  return emails.map((email) => ({
    id: `email-${email.email_id}`,
    title: 'High-priority email',
    message: email.subject || `From ${email.sender_name || 'Unknown'}`,
    time: email.received_at ? timeAgo(new Date(email.received_at)) : '',
    read: false,
  }));
}

async function getUpcomingEvents(supabase: SupabaseClient, userId: string): Promise<Notification[]> {
  const now = new Date();
  const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from('calendar_cache')
    .select('id, event_id, subject, start_time')
    .eq('user_id', userId)
    .gte('start_time', now.toISOString())
    .lte('start_time', thirtyMinLater)
    .eq('is_all_day', false)
    .limit(5);

  if (!events) return [];

  return events.map((event) => {
    const startTime = event.start_time ? new Date(event.start_time) : null;
    const timeStr = startTime
      ? startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';

    return {
      id: `cal-${event.event_id}`,
      title: 'Upcoming event',
      message: `${event.subject || 'Event'}${timeStr ? ` at ${timeStr}` : ''}`,
      time: startTime ? `In ${Math.max(1, Math.round((startTime.getTime() - now.getTime()) / 60000))}m` : '',
      read: false,
    };
  });
}

async function getOdooNotifications(supabase: SupabaseClient, userId: string): Promise<Notification[]> {
  const notifications: Notification[] = [];

  // RFPs needing approval — read from cache instead of Odoo API
  try {
    const { data: rfps } = await supabase
      .from('odoo_rfp_cache')
      .select('odoo_id, name, amount_total, date_order')
      .eq('user_id', userId)
      .eq('state', 'to approve')
      .limit(5);

    if (rfps) {
      for (const rfp of rfps) {
        const amount = rfp.amount_total || 0;
        notifications.push({
          id: `rfp-${rfp.odoo_id}`,
          title: 'RFP needs approval',
          message: `${rfp.name || 'Unknown RFP'} - ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          time: rfp.date_order ? timeAgo(new Date(rfp.date_order)) : '',
          read: false,
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch Odoo RFP notifications from cache:', e);
  }

  // Overdue invoices — read from cache instead of Odoo API
  try {
    const { data: invoices } = await supabase
      .from('odoo_invoices_cache')
      .select('odoo_id, name, amount_residual, invoice_date_due')
      .eq('user_id', userId)
      .eq('is_overdue', true)
      .neq('payment_state', 'paid')
      .order('invoice_date_due', { ascending: true })
      .limit(5);

    if (invoices) {
      for (const inv of invoices) {
        const amount = inv.amount_residual || 0;
        notifications.push({
          id: `inv-${inv.odoo_id}`,
          title: 'Overdue invoice',
          message: `${inv.name || 'Unknown'} - ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} due`,
          time: inv.invoice_date_due ? timeAgo(new Date(inv.invoice_date_due)) : '',
          read: false,
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch Odoo invoice notifications from cache:', e);
  }

  return notifications;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Notification[]>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Fetch all notification sources in parallel, each wrapped in try/catch
    const [tasks, emails, events, odoo] = await Promise.all([
      getOverdueTasks(supabase, userId).catch((e) => {
        console.error('Notification source failed (tasks):', e);
        return [] as Notification[];
      }),
      getHighPriorityEmails(supabase, userId).catch((e) => {
        console.error('Notification source failed (emails):', e);
        return [] as Notification[];
      }),
      getUpcomingEvents(supabase, userId).catch((e) => {
        console.error('Notification source failed (calendar):', e);
        return [] as Notification[];
      }),
      getOdooNotifications(supabase, userId).catch((e) => {
        console.error('Notification source failed (odoo):', e);
        return [] as Notification[];
      }),
    ]);

    const notifications = [...events, ...tasks, ...emails, ...odoo];

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}
