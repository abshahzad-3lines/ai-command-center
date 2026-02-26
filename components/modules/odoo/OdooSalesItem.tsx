'use client';

import { format } from 'date-fns';
import { Check, X, Sparkles, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { OdooSalesOrderSummary } from '@/types/odoo';

interface OdooSalesItemProps {
  order: OdooSalesOrderSummary;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  isConfirming?: boolean;
  isCancelling?: boolean;
  showPriority?: boolean;
}

const priorityColors = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const priorityBadgeColors = {
  high: 'bg-red-500/10 text-red-600 border-red-200',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  low: 'bg-green-500/10 text-green-600 border-green-200',
};

const priorityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const stateColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  sale: 'bg-green-100 text-green-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancel: 'bg-red-100 text-red-700',
};

const invoiceStatusColors: Record<string, string> = {
  upselling: 'bg-purple-100 text-purple-700',
  invoiced: 'bg-green-100 text-green-700',
  'to invoice': 'bg-orange-100 text-orange-700',
  no: 'bg-slate-100 text-slate-700',
};

const actionTypeColors: Record<string, string> = {
  confirm: 'bg-green-100 text-green-800 hover:bg-green-200',
  follow_up: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  respond: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  none: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
};

export function OdooSalesItem({
  order,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
  showPriority = false,
}: OdooSalesItemProps) {
  const formattedDate = format(new Date(order.date), 'MMM d, yyyy');
  const priority = order.aiPriority || 'medium';
  const suggestedAction = order.aiSuggestedAction;

  const canConfirm = order.state === 'draft' || order.state === 'sent';
  const canCancel = order.state === 'draft' || order.state === 'sent' || order.state === 'sale';

  return (
    <div className="group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
      {/* Priority Indicator */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <div
          className={cn('h-2 w-2 rounded-full', priorityColors[priority])}
          title={`${priorityLabels[priority]} priority`}
        />
      </div>

      {/* Order Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{order.name}</span>
          {showPriority && (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', priorityBadgeColors[priority])}
            >
              {priorityLabels[priority]}
            </Badge>
          )}
          <Badge className={cn('text-[10px] px-1.5 py-0', stateColors[order.state] || stateColors.draft)}>
            {order.stateLabel}
          </Badge>
          <Badge className={cn('text-[10px] px-1.5 py-0', invoiceStatusColors[order.invoiceStatus] || invoiceStatusColors.no)}>
            {order.invoiceStatusLabel}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">{formattedDate}</span>
        </div>

        {/* Customer & Amount */}
        <div className="flex items-center gap-2 mb-1">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm truncate">{order.customer}</span>
          <span className="text-sm font-semibold ml-auto">
            {order.currencySymbol}{order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* AI Summary */}
        {order.aiSummary && (
          <p className="text-sm text-muted-foreground line-clamp-2">{order.aiSummary}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* AI Suggested Action */}
        {suggestedAction && suggestedAction.type !== 'none' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className={cn('h-8 gap-1.5', actionTypeColors[suggestedAction.type] || actionTypeColors.none)}
                onClick={() => {
                  if (suggestedAction.type === 'confirm') onConfirm(order.id);
                }}
                disabled={isConfirming || isCancelling}
              >
                {(isConfirming || isCancelling) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {suggestedAction.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="max-w-xs text-sm">{suggestedAction.description || 'Review this order'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Quick Actions */}
        {canConfirm && suggestedAction?.type !== 'confirm' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-100"
                onClick={() => onConfirm(order.id)}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Confirm Order</TooltipContent>
          </Tooltip>
        )}

        {canCancel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-100"
                onClick={() => onCancel(order.id)}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel Order</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
