'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout';
import { EmailCard, EmailDetailDialog } from '@/components/modules/email';
import { OdooAIPriorityCard, OdooActionConfirmDialog } from '@/components/modules/odoo';
import { ChatWidget } from '@/components/modules/chat';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEmails } from '@/hooks/useEmails';
import { useOdooRfps } from '@/hooks/useOdooRfps';
import { useOdooSales } from '@/hooks/useOdooSales';
import { useOdooInvoices } from '@/hooks/useOdooInvoices';
import { useOdooAIAnalysis } from '@/hooks/useOdooAIAnalysis';
import { toast } from 'sonner';
import { Loader2, Calendar, CheckSquare, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';
import type { Email } from '@/types';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user, login, logout, accessToken, getAccessToken, profileId } = useAuth();
  const [taskStats, setTaskStats] = useState({ pending: 0, dueToday: 0 });

  const {
    emails,
    isLoading: emailsLoading,
    error,
    refetch,
    deleteEmail,
    executeAction,
    fetchEmailDetail,
    sendEmail,
    generateReply,
    isSending,
  } = useEmails({ accessToken, limit: 10, getAccessToken });

  // Email detail dialog state
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Odoo action confirmation dialog state
  const [odooConfirm, setOdooConfirm] = useState<{
    title: string;
    description: string;
    execute: () => Promise<void>;
    aiReasoning?: string;
    steps?: string[];
    urgency?: 'immediate' | 'soon' | 'normal';
  } | null>(null);

  // Odoo data for AI Priority card
  const {
    rfps,
    refetch: refetchRfps,
    approveRfp,
    rejectRfp,
  } = useOdooRfps({ limit: 10 });

  const {
    orders,
    refetch: refetchOrders,
    confirmOrder,
  } = useOdooSales({ limit: 10 });

  const {
    invoices,
    refetch: refetchInvoices,
    registerPayment,
    sendReminder,
  } = useOdooInvoices({ limit: 10 });

  // AI analysis of Odoo data — generates priorities and predicted next actions
  const {
    rfps: aiRfps,
    orders: aiOrders,
    invoices: aiInvoices,
    isAnalyzing,
  } = useOdooAIAnalysis(rfps, orders, invoices);

  // Fetch real task counts
  useEffect(() => {
    if (!profileId) return;
    const fetchTaskStats = async () => {
      try {
        const response = await fetch('/api/tasks', {
          headers: { 'x-user-id': profileId },
        });
        const data = await response.json();
        if (data.success && data.data) {
          const tasks = data.data;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const pending = tasks.filter((t: { status: string }) => t.status === 'pending' || t.status === 'in_progress').length;
          const dueToday = tasks.filter((t: { due_date: string | null; status: string }) =>
            t.due_date &&
            new Date(t.due_date) >= today &&
            new Date(t.due_date) < tomorrow &&
            t.status !== 'completed' &&
            t.status !== 'cancelled'
          ).length;

          setTaskStats({ pending, dueToday });
        }
      } catch (error) {
        console.error('Failed to fetch task stats:', error);
      }
    };
    fetchTaskStats();
  }, [profileId]);

  const handleRefresh = async () => {
    await refetch();
    toast.success('Emails refreshed');
  };

  const handleAction = async (emailId: string, _actionType: string) => {
    // Open the email detail dialog so the user can review before taking action
    await handleEmailClick(emailId);
  };

  const handleDelete = async (emailId: string) => {
    try {
      await deleteEmail(emailId);
      toast.success('Email deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete email');
    }
  };

  const handleEmailClick = async (emailId: string) => {
    setIsDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const detail = await fetchEmailDetail(emailId);
      setSelectedEmail(detail as Email);
    } catch {
      toast.error('Failed to load email');
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleArchive = async (emailId: string) => {
    try {
      await executeAction(emailId, 'archive');
      toast.success('Email archived');
    } catch {
      toast.error('Failed to archive email');
    }
  };

  const handleConnect = async () => {
    try {
      await login();
      toast.success('Connected to Outlook!');
    } catch {
      toast.error('Failed to connect. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success('Signed out');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  // Odoo handlers
  const handleOdooRefresh = async () => {
    await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
    toast.success('Odoo data refreshed');
  };

  const handleOdooAction = (item: { type: string; id: number; actionLabel: string; actionType?: string; amount?: number; name?: string; entity?: string; aiSummary?: string; actionDescription?: string; urgency?: 'immediate' | 'soon' | 'normal' }) => {
    const actionType = item.actionType || item.actionLabel.toLowerCase().replace(/\s+/g, '_');
    const recordName = item.name || `#${item.id}`;
    const entity = item.entity || '';
    const entitySuffix = entity ? ` from ${entity}` : '';

    const buildConfirm = (
      title: string,
      description: string,
      execute: () => Promise<void>,
      steps: string[],
    ) => {
      setOdooConfirm({
        title,
        description,
        execute,
        aiReasoning: item.aiSummary || item.actionDescription,
        steps,
        urgency: item.urgency,
      });
    };

    switch (actionType) {
      case 'approve':
      case 'review_&_approve':
        buildConfirm(
          'Approve Purchase Request',
          `Approve ${recordName}${entitySuffix} in Odoo.`,
          async () => {
            await approveRfp(item.id);
            toast.success(`RFP #${item.id} approved`);
            await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
          },
          [
            `Validate purchase request ${recordName} in Odoo`,
            `Change status from "To Approve" to "Purchase Order"`,
            `Notify vendor ${entity || 'supplier'} that the order is confirmed`,
            'Refresh dashboard data to reflect the updated status',
          ],
        );
        break;
      case 'reject':
        buildConfirm(
          'Reject Purchase Request',
          `Reject ${recordName}${entitySuffix} in Odoo.`,
          async () => {
            await rejectRfp(item.id);
            toast.success(`RFP #${item.id} rejected`);
            await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
          },
          [
            `Cancel purchase request ${recordName} in Odoo`,
            `Change status to "Cancelled"`,
            `No notification will be sent to ${entity || 'the vendor'}`,
            'Refresh dashboard data to reflect the updated status',
          ],
        );
        break;
      case 'confirm':
      case 'confirm_order':
        buildConfirm(
          'Confirm Sales Order',
          `Confirm ${recordName}${entitySuffix} in Odoo.`,
          async () => {
            await confirmOrder(item.id);
            toast.success(`Order #${item.id} confirmed`);
            await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
          },
          [
            `Convert quotation ${recordName} into a confirmed sales order`,
            `Change status from "Quotation" to "Sales Order"`,
            `Lock pricing and quantities for ${entity || 'the customer'}`,
            'Refresh dashboard data to reflect the updated status',
          ],
        );
        break;
      case 'remind':
      case 'send_reminder':
        buildConfirm(
          'Send Payment Reminder',
          `Send a friendly payment reminder for ${recordName}${entitySuffix}.`,
          async () => {
            await sendReminder(item.id, 'friendly');
            toast.success(`Reminder sent for invoice #${item.id}`);
            await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
          },
          [
            `Generate a friendly payment reminder email for invoice ${recordName}`,
            `Send the reminder to ${entity || 'the customer'} via Odoo`,
            'Log the reminder activity on the invoice record',
            'Refresh dashboard data after sending',
          ],
        );
        break;
      case 'pay':
      case 'register_payment':
        if (item.amount) {
          buildConfirm(
            'Register Payment',
            `Register a payment of ${item.amount.toLocaleString()} for ${recordName}${entitySuffix}.`,
            async () => {
              await registerPayment(item.id, item.amount!);
              toast.success(`Payment registered for invoice #${item.id}`);
              await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
            },
            [
              `Create a payment record of ${item.amount.toLocaleString()} in Odoo`,
              `Apply the payment to invoice ${recordName}`,
              'Update invoice payment status (Paid or Partially Paid)',
              'Refresh dashboard data to reflect the updated balance',
            ],
          );
        } else {
          toast.info('Navigate to Odoo page to register payment with specific amount');
        }
        break;
      case 'follow_up':
      case 'escalate':
        toast.info(`Follow-up noted for ${item.type} #${item.id}. Use the Odoo page for detailed actions.`);
        break;
      default:
        buildConfirm(
          'Confirm Action',
          `Execute "${item.actionLabel}" on ${item.type} ${recordName}${entitySuffix}.`,
          async () => {
            toast.info(`Action "${item.actionLabel}" for ${item.type} #${item.id}`);
            await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
          },
          [
            `Execute "${item.actionLabel}" on ${item.type} ${recordName}`,
            'Update the record status in Odoo',
            'Refresh dashboard data',
          ],
        );
    }
  };

  // Show loading while auth initializes
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DashboardShell
      user={
        user
          ? {
              name: user.name || user.username || 'User',
              email: user.username || '',
            }
          : undefined
      }
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your AI-powered productivity command center
          </p>
        </div>

        {/* Quick Links Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Calendar Card */}
          <Link href="/calendar" className="block">
            <div className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Calendar</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Tasks Card */}
          <Link href="/tasks" className="block">
            <div className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckSquare className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Tasks</h3>
                  <p className="text-xs text-muted-foreground">{taskStats.pending} pending{taskStats.dueToday > 0 ? `, ${taskStats.dueToday} due today` : ''}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Odoo Quick Link */}
          <Link href="/odoo" className="block">
            <div className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                  <Building2 className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Odoo ERP</h3>
                  <p className="text-xs text-muted-foreground">
                    {rfps.filter(r => r.state === 'to approve').length + orders.filter(o => o.state === 'draft').length + invoices.filter(i => i.isOverdue).length} need action
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Main Content - Email & Odoo Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          {/* Email Card */}
          <EmailCard
            emails={emails}
            isLoading={emailsLoading}
            error={error}
            onRefresh={handleRefresh}
            onAction={handleAction}
            onDelete={handleDelete}
            onEmailClick={handleEmailClick}
            isConnected={isAuthenticated}
            onConnect={handleConnect}
          />

          {/* Odoo AI Priority Actions */}
          <OdooAIPriorityCard
            rfps={aiRfps}
            orders={aiOrders}
            invoices={aiInvoices}
            onRefresh={handleOdooRefresh}
            onAction={handleOdooAction}
            isLoading={isAnalyzing}
          />
        </div>

        {/* Bottom padding for chat widget */}
        <div className="h-20" />
      </div>

      {/* Email Detail Dialog */}
      <EmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        isLoading={isDetailLoading}
        generateReply={generateReply}
        sendEmail={sendEmail}
        isSending={isSending}
        onArchive={handleArchive}
        onDelete={handleDelete}
        accessToken={accessToken}
        userId={user?.localAccountId || 'anonymous'}
      />

      {/* Odoo Action Confirmation Dialog */}
      <OdooActionConfirmDialog
        open={!!odooConfirm}
        onOpenChange={(open) => { if (!open) setOdooConfirm(null); }}
        title={odooConfirm?.title || ''}
        description={odooConfirm?.description || ''}
        onConfirm={odooConfirm?.execute || (async () => {})}
        aiReasoning={odooConfirm?.aiReasoning}
        steps={odooConfirm?.steps}
        urgency={odooConfirm?.urgency}
      />

      {/* AI Chat Widget */}
      <ChatWidget />
    </DashboardShell>
  );
}
