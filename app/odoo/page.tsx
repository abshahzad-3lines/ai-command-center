'use client';

import { DashboardShell } from '@/components/layout';
import { OdooRfpCard, OdooSalesCard, OdooInvoicesCard } from '@/components/modules/odoo';
import { ChatWidget } from '@/components/modules/chat';
import { useAuth } from '@/components/providers/AuthProvider';
import { useOdooRfps } from '@/hooks/useOdooRfps';
import { useOdooSales } from '@/hooks/useOdooSales';
import { useOdooInvoices } from '@/hooks/useOdooInvoices';
import { toast } from 'sonner';
import { Loader2, Building2, FileText, ShoppingCart, Receipt, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OdooPage() {
  const { isLoading: authLoading, user, logout } = useAuth();

  // RFPs
  const {
    rfps,
    isLoading: rfpsLoading,
    error: rfpsError,
    refetch: refetchRfps,
    approveRfp,
    rejectRfp,
  } = useOdooRfps({ limit: 20 });

  // Sales Orders
  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
    confirmOrder,
    cancelOrder,
  } = useOdooSales({ limit: 20 });

  // Invoices
  const {
    invoices,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
    registerPayment,
    sendReminder,
  } = useOdooInvoices({ limit: 20 });

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
    await refetchRfps();
    toast.success('Purchase requests refreshed');
  };

  const handleApproveRfp = async (id: number) => {
    try {
      await approveRfp(id);
      toast.success('Purchase request approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleRejectRfp = async (id: number, reason?: string) => {
    try {
      await rejectRfp(id, reason);
      toast.success('Purchase request rejected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  // Sales handlers
  const handleSalesRefresh = async () => {
    await refetchOrders();
    toast.success('Sales orders refreshed');
  };

  const handleConfirmOrder = async (id: number) => {
    try {
      await confirmOrder(id);
      toast.success('Sales order confirmed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm order');
    }
  };

  const handleCancelOrder = async (id: number) => {
    try {
      await cancelOrder(id);
      toast.success('Sales order cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  // Invoice handlers
  const handleInvoicesRefresh = async () => {
    await refetchInvoices();
    toast.success('Invoices refreshed');
  };

  const handleRegisterPayment = async (id: number, amount: number) => {
    try {
      await registerPayment(id, amount);
      toast.success('Payment registered');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register payment');
    }
  };

  const handleSendReminder = async (id: number, type: 'friendly' | 'formal' | 'final_notice') => {
    try {
      await sendReminder(id, type);
      toast.success('Payment reminder sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminder');
    }
  };

  // Refresh all
  const handleRefreshAll = async () => {
    await Promise.all([refetchRfps(), refetchOrders(), refetchInvoices()]);
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

  // Calculate stats
  const pendingApprovals = rfps.filter((r) => r.state === 'to approve').length;
  const draftOrders = orders.filter((o) => o.state === 'draft').length;
  const overdueInvoices = invoices.filter((i) => i.isOverdue).length;
  const totalSalesAmount = orders.reduce((sum, o) => sum + o.amount, 0);

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
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'SAR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(totalSalesAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {orders.length} orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase Requests Card */}
          <OdooRfpCard
            rfps={rfps}
            isLoading={rfpsLoading}
            error={rfpsError}
            onRefresh={handleRfpRefresh}
            onApprove={handleApproveRfp}
            onReject={handleRejectRfp}
            isConfigured={true}
          />

          {/* Sales Orders Card */}
          <OdooSalesCard
            orders={orders}
            isLoading={ordersLoading}
            error={ordersError}
            onRefresh={handleSalesRefresh}
            onConfirm={handleConfirmOrder}
            onCancel={handleCancelOrder}
            isConfigured={true}
          />
        </div>

        {/* Invoices Card - Full Width */}
        <OdooInvoicesCard
          invoices={invoices}
          isLoading={invoicesLoading}
          error={invoicesError}
          onRefresh={handleInvoicesRefresh}
          onRegisterPayment={handleRegisterPayment}
          onSendReminder={handleSendReminder}
          isConfigured={true}
        />

        {/* Bottom padding for chat widget */}
        <div className="h-20" />
      </div>

      {/* AI Chat Widget */}
      <ChatWidget />
    </DashboardShell>
  );
}
