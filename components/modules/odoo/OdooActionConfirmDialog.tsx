'use client';

import { useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface OdooActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  /** AI reasoning for why this action is suggested */
  aiReasoning?: string;
  /** Ordered list of steps the action will execute */
  steps?: string[];
  /** Urgency level for visual treatment */
  urgency?: 'immediate' | 'soon' | 'normal';
}

export function OdooActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  aiReasoning,
  steps,
  urgency,
}: OdooActionConfirmDialogProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleConfirm = async () => {
    setIsRunning(true);
    try {
      await onConfirm();
    } finally {
      setIsRunning(false);
      onOpenChange(false);
    }
  };

  const urgencyConfig = {
    immediate: { label: 'Urgent', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    soon: { label: 'Soon', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    normal: { label: 'Normal', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isRunning) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{title}</DialogTitle>
            {urgency && (
              <Badge variant="outline" className={cn('text-xs', urgencyConfig[urgency].className)}>
                {urgencyConfig[urgency].label}
              </Badge>
            )}
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* AI Reasoning Section */}
          {aiReasoning && (
            <div className="rounded-lg border bg-purple-500/5 border-purple-500/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                  Why AI suggests this
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {aiReasoning}
              </p>
            </div>
          )}

          {/* Steps Section */}
          {steps && steps.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-sm font-semibold">
                  Steps this action will take
                </span>
              </div>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Warning for destructive actions */}
          {(title.toLowerCase().includes('reject') || title.toLowerCase().includes('cancel')) && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                This action may not be reversible. Please review carefully before confirming.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRunning}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Executing...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
