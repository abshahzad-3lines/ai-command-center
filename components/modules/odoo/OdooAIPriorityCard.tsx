/**
 * @fileoverview AI-prioritized combined view of Odoo action items
 * Displays urgent items from RFPs, Sales Orders, and Invoices in a single card
 */
'use client';

import { useMemo } from 'react';
import { Sparkles, RefreshCw, ExternalLink, FileText, ShoppingCart, Receipt, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { OdooRfpSummary, OdooSalesOrderSummary, OdooInvoiceSummary } from '@/types/odoo';

/**
 * Unified priority item structure combining data from different Odoo record types
 */
interface PriorityItem {
  id: number;
  type: 'rfp' | 'sales' | 'invoice';
  name: string;
  entity: string; // vendor/customer/partner name
  amount: number;
  currency: string;
  currencySymbol: string;
  aiSummary?: string;
  aiPriority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionDescription: string;
  urgency: 'immediate' | 'soon' | 'normal';
  date: Date;
  extra?: string; // e.g., "5 days overdue"
}

/**
 * Props for the OdooAIPriorityCard component
 */
interface OdooAIPriorityCardProps {
  rfps: OdooRfpSummary[];
  orders: OdooSalesOrderSummary[];
  invoices: OdooInvoiceSummary[];
  onRefresh: () => void;
  isLoading?: boolean;
  onAction?: (item: PriorityItem) => void;
}

const typeConfig = {
  rfp: {
    icon: FileText,
    label: 'Purchase',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  sales: {
    icon: ShoppingCart,
    label: 'Sales',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  invoice: {
    icon: Receipt,
    label: 'Invoice',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
};

const urgencyConfig = {
  immediate: {
    label: 'Urgent',
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
  soon: {
    label: 'Soon',
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  normal: {
    label: 'Normal',
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  },
};

/**
 * OdooAIPriorityCard - Combined AI-prioritized action card for the dashboard
 *
 * This component aggregates items from RFPs, Sales Orders, and Invoices,
 * sorts them by urgency and AI-assigned priority, and displays the top 8
 * items that need immediate attention.
 *
 * Features:
 * - Combines items from 3 Odoo record types
 * - Sorts by urgency (immediate > soon > normal) then by AI priority
 * - Shows visual indicators for urgency and record type
 * - Highlights overdue invoices with days overdue
 *
 * @param props - Component props
 * @returns The rendered priority action card
 *
 * @example
 * ```tsx
 * <OdooAIPriorityCard
 *   rfps={rfps}
 *   orders={orders}
 *   invoices={invoices}
 *   onRefresh={handleRefresh}
 *   onAction={handleAction}
 * />
 * ```
 */
export function OdooAIPriorityCard({
  rfps,
  orders,
  invoices,
  onRefresh,
  isLoading,
  onAction,
}: OdooAIPriorityCardProps) {
  // Combine and prioritize all items
  const priorityItems = useMemo(() => {
    const items: PriorityItem[] = [];

    // Add RFPs that need approval
    rfps.forEach((rfp) => {
      if (rfp.state === 'to approve' || (rfp.aiSuggestedAction && rfp.aiPriority !== 'low')) {
        items.push({
          id: rfp.id,
          type: 'rfp',
          name: rfp.name,
          entity: rfp.vendor,
          amount: rfp.amount,
          currency: rfp.currency,
          currencySymbol: rfp.currencySymbol,
          aiSummary: rfp.aiSummary,
          aiPriority: rfp.aiPriority || 'medium',
          actionLabel: rfp.aiSuggestedAction?.label || 'Review',
          actionDescription: rfp.aiSuggestedAction?.description || 'Review this purchase request',
          urgency: rfp.aiSuggestedAction?.urgency || 'normal',
          date: rfp.date,
        });
      }
    });

    // Add Sales orders that need action
    orders.forEach((order) => {
      if (order.state === 'draft' || order.invoiceStatus === 'to invoice' || (order.aiSuggestedAction && order.aiPriority !== 'low')) {
        items.push({
          id: order.id,
          type: 'sales',
          name: order.name,
          entity: order.customer,
          amount: order.amount,
          currency: order.currency,
          currencySymbol: order.currencySymbol,
          aiSummary: order.aiSummary,
          aiPriority: order.aiPriority || 'medium',
          actionLabel: order.aiSuggestedAction?.label || 'Review',
          actionDescription: order.aiSuggestedAction?.description || 'Review this sales order',
          urgency: order.aiSuggestedAction?.urgency || 'normal',
          date: order.date,
        });
      }
    });

    // Add Invoices that are overdue or need attention
    invoices.forEach((invoice) => {
      if (invoice.isOverdue || invoice.state === 'draft' || (invoice.aiSuggestedAction && invoice.aiPriority !== 'low')) {
        items.push({
          id: invoice.id,
          type: 'invoice',
          name: invoice.name,
          entity: invoice.partner,
          amount: invoice.amountDue,
          currency: invoice.currency,
          currencySymbol: invoice.currencySymbol,
          aiSummary: invoice.aiSummary,
          aiPriority: invoice.isOverdue ? 'high' : (invoice.aiPriority || 'medium'),
          actionLabel: invoice.aiSuggestedAction?.label || 'Review',
          actionDescription: invoice.aiSuggestedAction?.description || 'Review this invoice',
          urgency: invoice.isOverdue ? 'immediate' : (invoice.aiSuggestedAction?.urgency || 'normal'),
          date: invoice.invoiceDate,
          extra: invoice.isOverdue ? `${invoice.daysOverdue} days overdue` : undefined,
        });
      }
    });

    // Sort by urgency and priority
    const urgencyOrder = { immediate: 0, soon: 1, normal: 2 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    items.sort((a, b) => {
      // First by urgency
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;

      // Then by priority
      const priorityDiff = priorityOrder[a.aiPriority] - priorityOrder[b.aiPriority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by date (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return items.slice(0, 8); // Show top 8 priority items
  }, [rfps, orders, invoices]);

  const urgentCount = priorityItems.filter((i) => i.urgency === 'immediate').length;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Odoo Actions
              {urgentCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {urgentCount} urgent
                </Badge>
              )}
            </CardTitle>
            <CardDescription>AI-prioritized items needing attention</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/odoo">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <ScrollArea className="h-[380px] pr-4">
          {priorityItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">All Caught Up!</h3>
              <p className="text-sm text-muted-foreground">
                No urgent items requiring your attention
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {priorityItems.map((item) => {
                const config = typeConfig[item.type];
                const urgency = urgencyConfig[item.urgency];
                const Icon = config.icon;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={cn(
                      'group rounded-lg border p-3 transition-colors hover:bg-muted/50',
                      item.urgency === 'immediate' && 'border-red-500/30 bg-red-500/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', config.bgColor)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{item.name}</span>
                          <Badge variant="outline" className={cn('text-xs shrink-0', urgency.className)}>
                            {urgency.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span className="truncate">{item.entity}</span>
                          <span>•</span>
                          <span className="font-medium">
                            {item.currencySymbol} {item.amount.toLocaleString()}
                          </span>
                          {item.extra && (
                            <>
                              <span>•</span>
                              <span className="text-red-500 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {item.extra}
                              </span>
                            </>
                          )}
                        </div>

                        {item.aiSummary && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {item.aiSummary}
                          </p>
                        )}

                        {/* Action Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onAction?.(item)}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          {item.actionLabel}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
