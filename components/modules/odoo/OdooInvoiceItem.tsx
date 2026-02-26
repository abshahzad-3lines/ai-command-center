'use client';

import { format } from 'date-fns';
import { CreditCard, Bell, Sparkles, Loader2, Building2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { OdooInvoiceSummary } from '@/types/odoo';

interface OdooInvoiceItemProps {
  invoice: OdooInvoiceSummary;
  onRegisterPayment: (id: number) => void;
  onSendReminder: (id: number) => void;
  isRegisteringPayment?: boolean;
  isSendingReminder?: boolean;
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

const paymentStateColors: Record<string, string> = {
  not_paid: 'bg-red-100 text-red-700',
  in_payment: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-orange-100 text-orange-700',
  reversed: 'bg-slate-100 text-slate-700',
  invoicing_legacy: 'bg-slate-100 text-slate-700',
};

const actionTypeColors: Record<string, string> = {
  pay: 'bg-green-100 text-green-800 hover:bg-green-200',
  remind: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  follow_up: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  none: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
};

export function OdooInvoiceItem({
  invoice,
  onRegisterPayment,
  onSendReminder,
  isRegisteringPayment,
  isSendingReminder,
  showPriority = false,
}: OdooInvoiceItemProps) {
  const formattedDate = format(new Date(invoice.invoiceDate), 'MMM d, yyyy');
  const formattedDueDate = format(new Date(invoice.dueDate), 'MMM d, yyyy');
  const priority = invoice.aiPriority || 'medium';
  const suggestedAction = invoice.aiSuggestedAction;

  const canRegisterPayment = invoice.paymentState !== 'paid' && invoice.amountDue > 0;
  const canSendReminder = invoice.paymentState !== 'paid' && invoice.state === 'posted';

  return (
    <div className="group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
      {/* Priority Indicator */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <div
          className={cn('h-2 w-2 rounded-full', priorityColors[priority])}
          title={`${priorityLabels[priority]} priority`}
        />
      </div>

      {/* Invoice Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{invoice.name}</span>
          {showPriority && (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', priorityBadgeColors[priority])}
            >
              {priorityLabels[priority]}
            </Badge>
          )}
          <Badge className={cn('text-[10px] px-1.5 py-0', paymentStateColors[invoice.paymentState] || paymentStateColors.not_paid)}>
            {invoice.paymentStateLabel}
          </Badge>
          {invoice.isOverdue && (
            <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {invoice.daysOverdue}d overdue
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{formattedDate}</span>
        </div>

        {/* Partner & Amount */}
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm truncate">{invoice.partner}</span>
          <div className="ml-auto text-right">
            <span className="text-sm font-semibold">
              {invoice.currencySymbol}{invoice.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {invoice.amountDue !== invoice.amount && (
              <span className="text-xs text-muted-foreground ml-1">
                / {invoice.currencySymbol}{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        {/* Due Date & AI Summary */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Due: {formattedDueDate}</span>
        </div>
        {invoice.aiSummary && (
          <p className="text-sm text-muted-foreground line-clamp-2">{invoice.aiSummary}</p>
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
                  if (suggestedAction.type === 'pay') onRegisterPayment(invoice.id);
                  else if (suggestedAction.type === 'remind') onSendReminder(invoice.id);
                }}
                disabled={isRegisteringPayment || isSendingReminder}
              >
                {(isRegisteringPayment || isSendingReminder) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {suggestedAction.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="max-w-xs text-sm">{suggestedAction.description || 'Review this invoice'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Quick Actions */}
        {canRegisterPayment && suggestedAction?.type !== 'pay' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-100"
                onClick={() => onRegisterPayment(invoice.id)}
                disabled={isRegisteringPayment}
              >
                {isRegisteringPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Register Payment</TooltipContent>
          </Tooltip>
        )}

        {canSendReminder && suggestedAction?.type !== 'remind' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-orange-600 hover:bg-orange-100"
                onClick={() => onSendReminder(invoice.id)}
                disabled={isSendingReminder}
              >
                {isSendingReminder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send Reminder</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
