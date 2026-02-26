'use client';

import { DashboardShell } from '@/components/layout';
import { EmailCard } from '@/components/modules/email';
import { OdooAIPriorityCard } from '@/components/modules/odoo';
import { ChatWidget } from '@/components/modules/chat';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEmails } from '@/hooks/useEmails';
import { useOdooRfps } from '@/hooks/useOdooRfps';
import { useOdooSales } from '@/hooks/useOdooSales';
import { useOdooInvoices } from '@/hooks/useOdooInvoices';
import { toast } from 'sonner';
import { Loader2, Calendar, CheckSquare, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user, login, logout, accessToken } = useAuth();

  const {
    emails,
    isLoading: emailsLoading,
    error,
    refetch,
    deleteEmail,
    executeAction,
  } = useEmails({ accessToken, limit: 10 });

  // Odoo data for AI Priority card
  const {
    rfps,
    refetch: refetchRfps,
  } = useOdooRfps({ limit: 10 });

  const {
    orders,
    refetch: refetchOrders,
  } = useOdooSales({ limit: 10 });

  const {
    invoices,
    refetch: refetchInvoices,
  } = useOdooInvoices({ limit: 10 });

  const handleRefresh = async () => {
    await refetch();
    toast.success('Emails refreshed');
  };

  const handleAction = async (emailId: string, actionType: string) => {
    try {
      const result = await executeAction(emailId, actionType);
      toast.success(result.message || `Action "${actionType}" executed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute action');
    }
  };

  const handleDelete = async (emailId: string) => {
    try {
      await deleteEmail(emailId);
      toast.success('Email deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete email');
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

  const handleOdooAction = (item: { type: string; id: number; actionLabel: string }) => {
    // For now, show a toast - later this will trigger MCP actions
    toast.info(`AI Action: ${item.actionLabel} for ${item.type} #${item.id}`);
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
                  <p className="text-xs text-muted-foreground">5 pending, 2 due today</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Card */}
          <EmailCard
            emails={emails}
            isLoading={emailsLoading}
            error={error}
            onRefresh={handleRefresh}
            onAction={handleAction}
            onDelete={handleDelete}
            isConnected={isAuthenticated}
            onConnect={handleConnect}
          />

          {/* Odoo AI Priority Actions */}
          <OdooAIPriorityCard
            rfps={rfps}
            orders={orders}
            invoices={invoices}
            onRefresh={handleOdooRefresh}
            onAction={handleOdooAction}
          />
        </div>

        {/* Bottom padding for chat widget */}
        <div className="h-20" />
      </div>

      {/* AI Chat Widget */}
      <ChatWidget />
    </DashboardShell>
  );
}
