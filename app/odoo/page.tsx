'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { DashboardShell } from '@/components/layout';
import { ChatWidget } from '@/components/modules/chat';
import { OdooActionConfirmDialog } from '@/components/modules/odoo';
import { useAuth } from '@/components/providers/AuthProvider';
import { useOdooRfps } from '@/hooks/useOdooRfps';
import { useOdooSales } from '@/hooks/useOdooSales';
import { useOdooInvoices } from '@/hooks/useOdooInvoices';
import { useOdooAIAnalysis } from '@/hooks/useOdooAIAnalysis';
import { toast } from 'sonner';
import { Loader2, Building2, FileText, ShoppingCart, Receipt, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
    </CardHeader>
    <CardContent className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded bg-muted" />
      ))}
    </CardContent>
  </Card>
);

const OdooRfpCard = dynamic(
  () => import('@/components/modules/odoo/OdooRfpCard').then((m) => m.OdooRfpCard),
  { loading: () => <CardSkeleton /> }
);

const OdooSalesCard = dynamic(
  () => import('@/components/modules/odoo/OdooSalesCard').then((m) => m.OdooSalesCard),
  { loading: () => <CardSkeleton /> }
);

const OdooInvoicesCard = dynamic(
  () => import('@/components/modules/odoo/OdooInvoicesCard').then((m) => m.OdooInvoicesCard),
  { loading: () => <CardSkeleton /> }
);

export default function OdooPage() {
  const { isLoading: authLoading, user, logout } = useAuth();

  // RFPs
  const {
    rfps,
    isLoading: rfpsLoading,
    error: rfpsError,
    forceRefresh: forceRefreshRfps,
    approveRfp,
    rejectRfp,
  } = useOdooRfps({ limit: 20 });

  // Sales Orders
  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
    forceRefresh: forceRefreshOrders,
    confirmOrder,
    cancelOrder,
  } = useOdooSales({ limit: 20 });

  // Invoices
  const {
    invoices,
    isLoading: invoicesLoading,
    error: invoicesError,
    forceRefresh: forceRefreshInvoices,
    registerPayment,
    sendReminder,
  } = useOdooInvoices({ limit: 20 });

  // AI analysis of Odoo data — generates priorities and predicted next actions
  const {
    rfps: aiRfps,
    orders: aiOrders,
    invoices: aiInvoices,
    isAnalyzing,
  } = useOdooAIAnalysis(rfps, orders, invoices);

  // Confirmation dialog state
  const [actionConfirm, setActionConfirm] = useState<{
    title: string;
    description: string;
    execute: () => Promise<void>;
  } | null>(null);

  const confirmAction = (title: string, description: string, execute: () => Promise<void>) => {
    setActionConfirm({ title, description, execute });
  };

  // Handlers
  const handleSignOut = async () => {
    try {
      await logout();
      toast.success('Signed out');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  // RFP handlers
  const handleRfpRefresh = async () => {
    await forceRefreshRfps();
    toast.success('Purchase requests refreshed');
  };

  const handleApproveRfp = (id: number) => {
    const rfp = aiRfps.find(r => r.id === id);
    confirmAction(
      'Approve Purchase Request',
      `This will approve ${rfp?.name || `RFP #${id}`}${rfp?.vendor ? ` from ${rfp.vendor}` : ''}. The order will move to "Purchase Order" status in Odoo.`,
      async () => {
        try {
          await approveRfp(id);
          toast.success('Purchase request approved');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to approve');
        }
      }
    );
  };

  const handleRejectRfp = (id: number, reason?: string) => {
    const rfp = aiRfps.find(r => r.id === id);
    confirmAction(
      'Reject Purchase Request',
      `This will reject ${rfp?.name || `RFP #${id}`}${rfp?.vendor ? ` from ${rfp.vendor}` : ''}. The order will be cancelled in Odoo.${reason ? ` Reason: ${reason}` : ''}`,
      async () => {
        try {
          await rejectRfp(id, reason);
          toast.success('Purchase request rejected');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to reject');
        }
      }
    );
  };

  // Sales handlers
  const handleSalesRefresh = async () => {
    await forceRefreshOrders();
    toast.success('Sales orders refreshed');
  };

  const handleConfirmOrder = (id: number) => {
    const order = aiOrders.find(o => o.id === id);
    confirmAction(
      'Confirm Sales Order',
      `This will confirm ${order?.name || `Order #${id}`}${order?.customer ? ` for ${order.customer}` : ''}. The quotation will become a confirmed sales order in Odoo.`,
      async () => {
        try {
          await confirmOrder(id);
          toast.success('Sales order confirmed');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to confirm order');
        }
      }
    );
  };

  const handleCancelOrder = (id: number) => {
    const order = aiOrders.find(o => o.id === id);
    confirmAction(
      'Cancel Sales Order',
      `This will cancel ${order?.name || `Order #${id}`}${order?.customer ? ` for ${order.customer}` : ''}. This action may not be reversible.`,
      async () => {
        try {
          await cancelOrder(id);
          toast.success('Sales order cancelled');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
        }
      }
    );
  };

  // Invoice handlers
  const handleInvoicesRefresh = async () => {
    await forceRefreshInvoices();
    toast.success('Invoices refreshed');
  };

  const handleRegisterPayment = (id: number, amount: number) => {
    const invoice = aiInvoices.find(i => i.id === id);
    confirmAction(
      'Register Payment',
      `This will register a payment of ${amount.toLocaleString()} for ${invoice?.name || `Invoice #${id}`}${invoice?.partner ? ` from ${invoice.partner}` : ''} in Odoo.`,
      async () => {
        try {
          await registerPayment(id, amount);
          toast.success('Payment registered');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to register payment');
        }
      }
    );
  };

  const handleSendReminder = (id: number, type: 'friendly' | 'formal' | 'final_notice') => {
    const invoice = aiInvoices.find(i => i.id === id);
    const typeLabel = type === 'friendly' ? 'friendly' : type === 'formal' ? 'formal' : 'final notice';
    confirmAction(
      'Send Payment Reminder',
      `This will send a ${typeLabel} payment reminder for ${invoice?.name || `Invoice #${id}`}${invoice?.partner ? ` to ${invoice.partner}` : ''} via Odoo.`,
      async () => {
        try {
          await sendReminder(id, type);
          toast.success('Payment reminder sent');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to send reminder');
        }
      }
    );
  };

  // Refresh all — force fetch from Odoo, bypass cache
  const handleRefreshAll = async () => {
    await Promise.all([forceRefreshRfps(), forceRefreshOrders(), forceRefreshInvoices()]);
    toast.success('All Odoo data refreshed');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate stats (use AI-enriched data for priority counts)
  const pendingApprovals = aiRfps.filter((r) => r.state === 'to approve').length;
  const draftOrders = aiOrders.filter((o) => o.state === 'draft').length;
  const overdueInvoices = aiInvoices.filter((i) => i.isOverdue).length;
  const totalSalesAmount = aiOrders.reduce((sum, o) => sum + o.amount, 0);
  const highPriorityCount = [
    ...aiRfps.filter((r) => r.aiPriority === 'high'),
    ...aiOrders.filter((o) => o.aiPriority === 'high'),
    ...aiInvoices.filter((i) => i.aiPriority === 'high'),
  ].length;

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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Building2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Odoo ERP</h1>
                <p className="text-muted-foreground">
                  Manage purchase requests, sales orders, and invoices with AI assistance
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Refresh All
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                {rfps.length} total RFPs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftOrders}</div>
              <p className="text-xs text-muted-foreground">
                {orders.length} total orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {invoices.length} total invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI High Priority</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className={cn('text-2xl font-bold', highPriorityCount > 0 && 'text-purple-600')}>
                {isAnalyzing ? '...' : highPriorityCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAnalyzing ? 'AI analyzing...' : 'Items needing immediate attention'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase Requests Card */}
          <OdooRfpCard
            rfps={aiRfps}
            isLoading={rfpsLoading || isAnalyzing}
            error={rfpsError}
            onRefresh={handleRfpRefresh}
            onApprove={handleApproveRfp}
            onReject={handleRejectRfp}
            isConfigured={true}
          />

          {/* Sales Orders Card */}
          <OdooSalesCard
            orders={aiOrders}
            isLoading={ordersLoading || isAnalyzing}
            error={ordersError}
            onRefresh={handleSalesRefresh}
            onConfirm={handleConfirmOrder}
            onCancel={handleCancelOrder}
            isConfigured={true}
          />
        </div>

        {/* Invoices Card - Full Width */}
        <OdooInvoicesCard
          invoices={aiInvoices}
          isLoading={invoicesLoading || isAnalyzing}
          error={invoicesError}
          onRefresh={handleInvoicesRefresh}
          onRegisterPayment={handleRegisterPayment}
          onSendReminder={handleSendReminder}
          isConfigured={true}
        />

        {/* Bottom padding for chat widget */}
        <div className="h-20" />
      </div>

      {/* Action Confirmation Dialog */}
      <OdooActionConfirmDialog
        open={!!actionConfirm}
        onOpenChange={(open) => { if (!open) setActionConfirm(null); }}
        title={actionConfirm?.title || ''}
        description={actionConfirm?.description || ''}
        onConfirm={actionConfirm?.execute || (async () => {})}
      />

      {/* AI Chat Widget */}
      <ChatWidget />
    </DashboardShell>
  );
}
