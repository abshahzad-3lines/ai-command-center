/**
 * @fileoverview Odoo Action Log Service
 * Tracks all Odoo actions for audit trail and history
 */

import { createClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert } from '@/types/database';

export type OdooActionLog = Tables<'odoo_action_logs'>;
export type OdooActionLogInsert = TablesInsert<'odoo_action_logs'>;

export interface ActionLogEntry {
  toolName: string;
  modelName?: string;
  recordId?: number;
  recordName?: string;
  inputArgs?: Record<string, unknown>;
  result?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  actorEmail?: string; // The email/username of the person performing the action
}

/**
 * Log an Odoo action to the database
 * @param userId - Optional Supabase user UUID (can be null for anonymous users)
 * @param entry - Action log entry with details
 */
export async function logOdooAction(
  userId: string | null,
  entry: ActionLogEntry
): Promise<OdooActionLog | null> {
  try {
    const supabase = await createClient();

    // Check if userId is a valid UUID
    const isValidUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    const insertData: OdooActionLogInsert = {
      user_id: isValidUuid ? userId : null,
      actor_email: entry.actorEmail || null,
      tool_name: entry.toolName,
      model_name: entry.modelName || null,
      record_id: entry.recordId || null,
      record_name: entry.recordName || null,
      input_args: entry.inputArgs ? JSON.parse(JSON.stringify(entry.inputArgs)) : null,
      result: entry.result ? JSON.parse(JSON.stringify(entry.result)) : null,
      success: entry.success,
      error_message: entry.errorMessage || null,
      executed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('odoo_action_logs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Failed to log Odoo action:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error logging Odoo action:', error);
    return null;
  }
}

/**
 * Get action history for a user
 */
export async function getActionHistory(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    toolName?: string;
    modelName?: string;
    success?: boolean;
  }
): Promise<OdooActionLog[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('odoo_action_logs')
      .select('*')
      .eq('user_id', userId)
      .order('executed_at', { ascending: false });

    if (options?.toolName) {
      query = query.eq('tool_name', options.toolName);
    }

    if (options?.modelName) {
      query = query.eq('model_name', options.modelName);
    }

    if (options?.success !== undefined) {
      query = query.eq('success', options.success);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch action history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching action history:', error);
    return [];
  }
}

/**
 * Get action statistics for a user
 */
export async function getActionStats(
  userId: string
): Promise<{
  total: number;
  successful: number;
  failed: number;
  byTool: Record<string, number>;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('odoo_action_logs')
      .select('tool_name, success')
      .eq('user_id', userId);

    if (error || !data) {
      return { total: 0, successful: 0, failed: 0, byTool: {} };
    }

    const stats = {
      total: data.length,
      successful: data.filter((a) => a.success).length,
      failed: data.filter((a) => !a.success).length,
      byTool: {} as Record<string, number>,
    };

    data.forEach((action) => {
      stats.byTool[action.tool_name] = (stats.byTool[action.tool_name] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching action stats:', error);
    return { total: 0, successful: 0, failed: 0, byTool: {} };
  }
}

/**
 * Format action for display
 */
export function formatActionDescription(action: OdooActionLog): string {
  const toolDescriptions: Record<string, string> = {
    approve_purchase_order: 'Approved purchase order',
    reject_purchase_order: 'Rejected purchase order',
    confirm_sales_order: 'Confirmed sales order',
    cancel_sales_order: 'Cancelled sales order',
    register_invoice_payment: 'Registered invoice payment',
    send_payment_reminder: 'Sent payment reminder',
    search_purchase_orders: 'Searched purchase orders',
    search_sales_orders: 'Searched sales orders',
    search_invoices: 'Searched invoices',
    get_purchase_order: 'Viewed purchase order',
    get_sales_order: 'Viewed sales order',
    get_invoice: 'Viewed invoice',
  };

  const description = toolDescriptions[action.tool_name] || action.tool_name;
  const recordInfo = action.record_name ? ` "${action.record_name}"` : '';
  const status = action.success ? '' : ' (Failed)';

  return `${description}${recordInfo}${status}`;
}
