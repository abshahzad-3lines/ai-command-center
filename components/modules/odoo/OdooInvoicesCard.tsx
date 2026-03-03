'use client';

import { useState, useMemo } from 'react';
import { Receipt, RefreshCw, AlertCircle, ExternalLink, Clock, Sparkles, Settings, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { OdooInvoiceItem } from './OdooInvoiceItem';
import { cn } from '@/lib/utils';
import type { OdooInvoiceSummary } from '@/types/odoo';

type SortOption = 'time' | 'priority' | 'amount' | 'overdue';

interface OdooInvoicesCardProps {
  invoices: OdooInvoiceSummary[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onRegisterPayment: (id: number, amount: number) => void | Promise<void>;
  onSendReminder: (id: number, type: 'friendly' | 'formal' | 'final_notice') => void | Promise<void>;
  isConfigured?: boolean;
  onConfigure?: () => void;
}

export function OdooInvoicesCard({
  invoices,
  isLoading,
  error,
  onRefresh,
  onRegisterPayment,
  onSendReminder,
  isConfigured = true,
  onConfigure,
}: OdooInvoicesCardProps) {
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'payment' | 'reminder' | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('time');

  // Count overdue invoices
  const overdueCount = useMemo(() => {
    return invoices.filter((inv) => inv.isOverdue).length;
  }, [invoices]);

  // Sort invoices based on selected option
  const sortedInvoices = useMemo(() => {
    if (!invoices) return [];

    const sorted = [...invoices];
    if (sortBy === 'time') {
      sorted.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    } else if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => {
        const aPriority = a.aiPriority || 'medium';
        const bPriority = b.aiPriority || 'medium';
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      });
    } else if (sortBy === 'amount') {
      sorted.sort((a, b) => b.amountDue - a.amountDue);
    } else if (sortBy === 'overdue') {
      sorted.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return b.daysOverdue - a.daysOverdue;
      });
    }
    return sorted;
  }, [invoices, sortBy]);

  const handleRegisterPayment = async (id: number) => {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return;

    setActionLoadingId(id);
    setActionType('payment');
    try {
      await onRegisterPayment(id, invoice.amountDue);
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  const handleSendReminder = async (id: number) => {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return;

    setActionLoadingId(id);
    setActionType('reminder');
    try {
      // Determine reminder type based on how overdue
      let reminderType: 'friendly' | 'formal' | 'final_notice' = 'friendly';
      if (invoice.daysOverdue > 60) {
        reminderType = 'final_notice';
      } else if (invoice.daysOverdue > 30) {
        reminderType = 'formal';
      }
      await onSendReminder(id, reminderType);
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Invoices</CardTitle>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {overdueCount} overdue
                </Badge>
              )}
            </div>
            <CardDescription>Invoices with AI analysis</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && (
            <>
              {/* Sort Controls */}
              <div className="flex items-center rounded-md border bg-background p-0.5">
                <button
                  onClick={() => setSortBy('time')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer',
                    sortBy === 'time'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  Time
                </button>
                <button
                  onClick={() => setSortBy('priority')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer',
                    sortBy === 'priority'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  AI
                </button>
                {overdueCount > 0 && (
                  <button
                    onClick={() => setSortBy('overdue')}
                    className={cn(
                      'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer',
                      sortBy === 'overdue'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Due
                  </button>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </>
          )}
          <Link href="/odoo/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {/* Not Configured State */}
        {!isConfigured && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Connect Odoo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure Odoo to see invoices with AI-powered analysis
            </p>
            <Button onClick={onConfigure}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Odoo
            </Button>
          </div>
        )}

        {/* Error State */}
        {isConfigured && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold mb-2">Failed to Load Invoices</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={onRefresh}>
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isConfigured && isLoading && !error && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Invoice List */}
        {isConfigured && !isLoading && !error && (
          <ScrollArea className="h-[500px] pr-4">
            {sortedInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Invoices</h3>
                <p className="text-sm text-muted-foreground">
                  No invoices found in Odoo
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedInvoices.map((invoice) => (
                  <OdooInvoiceItem
                    key={invoice.id}
                    invoice={invoice}
                    onRegisterPayment={handleRegisterPayment}
                    onSendReminder={handleSendReminder}
                    isRegisteringPayment={actionLoadingId === invoice.id && actionType === 'payment'}
                    isSendingReminder={actionLoadingId === invoice.id && actionType === 'reminder'}
                    showPriority={sortBy === 'priority'}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
