'use client';

import { useState, useMemo } from 'react';
import { ShoppingCart, RefreshCw, AlertCircle, ExternalLink, Clock, Sparkles, Settings } from 'lucide-react';
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
import { OdooSalesItem } from './OdooSalesItem';
import { cn } from '@/lib/utils';
import type { OdooSalesOrderSummary } from '@/types/odoo';

type SortOption = 'time' | 'priority' | 'amount';

interface OdooSalesCardProps {
  orders: OdooSalesOrderSummary[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onConfirm: (id: number) => void | Promise<void>;
  onCancel: (id: number) => void | Promise<void>;
  isConfigured?: boolean;
  onConfigure?: () => void;
}

export function OdooSalesCard({
  orders,
  isLoading,
  error,
  onRefresh,
  onConfirm,
  onCancel,
  isConfigured = true,
  onConfigure,
}: OdooSalesCardProps) {
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'confirm' | 'cancel' | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('time');

  // Sort orders based on selected option
  const sortedOrders = useMemo(() => {
    if (!orders) return [];

    const sorted = [...orders];
    if (sortBy === 'time') {
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => {
        const aPriority = a.aiPriority || 'medium';
        const bPriority = b.aiPriority || 'medium';
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      });
    } else if (sortBy === 'amount') {
      sorted.sort((a, b) => b.amount - a.amount);
    }
    return sorted;
  }, [orders, sortBy]);

  const handleConfirm = async (id: number) => {
    setActionLoadingId(id);
    setActionType('confirm');
    try {
      await onConfirm(id);
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  const handleCancel = async (id: number) => {
    setActionLoadingId(id);
    setActionType('cancel');
    try {
      await onCancel(id);
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Sales Orders</CardTitle>
            <CardDescription>Orders with AI analysis</CardDescription>
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
          <Link href="/odoo/sales">
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
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Connect Odoo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure Odoo to see sales orders with AI-powered analysis
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
            <h3 className="font-semibold mb-2">Failed to Load Orders</h3>
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

        {/* Order List */}
        {isConfigured && !isLoading && !error && (
          <ScrollArea className="h-[500px] pr-4">
            {sortedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Sales Orders</h3>
                <p className="text-sm text-muted-foreground">
                  No orders found in Odoo
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOrders.map((order) => (
                  <OdooSalesItem
                    key={order.id}
                    order={order}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isConfirming={actionLoadingId === order.id && actionType === 'confirm'}
                    isCancelling={actionLoadingId === order.id && actionType === 'cancel'}
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
