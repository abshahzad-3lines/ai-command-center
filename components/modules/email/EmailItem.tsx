'use client';

import { format } from 'date-fns';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EmailSummary } from '@/types';

interface EmailItemProps {
  email: EmailSummary;
  onAction: (emailId: string, actionType: string) => void;
  onDelete: (emailId: string) => void;
  onClick?: (emailId: string) => void;
  isActionLoading?: boolean;
  isDeleteLoading?: boolean;
  showPriority?: boolean;
}

const actionTypeColors: Record<string, string> = {
  reply: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  archive: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  forward: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  schedule: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  flag: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  none: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
};

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

export function EmailItem({
  email,
  onAction,
  onDelete,
  onClick,
  isActionLoading,
  isDeleteLoading,
  showPriority = false,
}: EmailItemProps) {
  const formattedDate = format(new Date(email.receivedAt), 'MMM d, h:mm a');
  const actionColor = actionTypeColors[email.suggestedAction.type] || actionTypeColors.none;

  return (
    <div
      className={cn(
        'group rounded-lg border p-3 transition-colors hover:bg-accent/50 min-w-0 overflow-hidden',
        onClick && 'cursor-pointer'
      )}
      onClick={() => onClick?.(email.id)}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* Priority Indicator */}
        <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
          <div
            className={cn('h-2 w-2 rounded-full', priorityColors[email.priority])}
            title={`${priorityLabels[email.priority]} priority`}
          />
        </div>

        {/* Email Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <span className="font-medium text-sm truncate">{email.from}</span>
            {showPriority && (
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 shrink-0', priorityBadgeColors[email.priority])}
              >
                {priorityLabels[email.priority]}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto shrink-0">{formattedDate}</span>
          </div>

          {/* Subject */}
          <h4 className="font-semibold text-sm mb-1 truncate">{email.subject}</h4>

          {/* AI Summary */}
          <p className="text-sm text-muted-foreground line-clamp-2">{email.summary}</p>

          {/* Actions - inline below content */}
          <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn('h-7 gap-1 text-xs', actionColor)}
                  onClick={() => onClick?.(email.id)}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {email.suggestedAction.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="max-w-xs text-sm">Open email to review and take action</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(email.id)}
                  disabled={isDeleteLoading}
                >
                  {isDeleteLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete email</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
