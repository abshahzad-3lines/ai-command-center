'use client';

import { useState, useMemo } from 'react';
import { Mail, RefreshCw, AlertCircle, ExternalLink, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// ScrollArea removed — plain div with overflow-y-auto fits edge-to-edge
import { Skeleton } from '@/components/ui/skeleton';
import { EmailItem } from './EmailItem';
import { cn } from '@/lib/utils';
import type { EmailSummary, EmailSortOption } from '@/types';

interface EmailCardProps {
  emails: EmailSummary[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onAction: (emailId: string, actionType: string) => Promise<void>;
  onDelete: (emailId: string) => Promise<void>;
  onEmailClick?: (emailId: string) => void;
  isConnected?: boolean;
  onConnect?: () => void;
}

export function EmailCard({
  emails,
  isLoading,
  error,
  onRefresh,
  onAction,
  onDelete,
  onEmailClick,
  isConnected = false,
  onConnect,
}: EmailCardProps) {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<EmailSortOption>('time');

  // Sort emails based on selected option
  const sortedEmails = useMemo(() => {
    if (!emails) return [];

    const sorted = [...emails];
    if (sortBy === 'time') {
      sorted.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    } else if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    return sorted;
  }, [emails, sortBy]);

  const handleAction = async (emailId: string, actionType: string) => {
    setActionLoadingId(emailId);
    try {
      await onAction(emailId, actionType);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (emailId: string) => {
    setDeleteLoadingId(emailId);
    try {
      await onDelete(emailId);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <Card className="flex flex-col h-full min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>Latest emails with AI summaries</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
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
          <Link href="/email">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {/* Not Connected State */}
        {!isConnected && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Connect Your Email</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in with Microsoft to see your emails with AI-powered summaries
            </p>
            <Button onClick={onConnect}>Connect Outlook</Button>
          </div>
        )}

        {/* Error State */}
        {isConnected && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold mb-2">Failed to Load Emails</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={onRefresh}>
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isConnected && isLoading && !error && (
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

        {/* Email List */}
        {isConnected && !isLoading && !error && (
          <div className="h-[380px] overflow-y-auto min-w-0">
            {sortedEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Emails</h3>
                <p className="text-sm text-muted-foreground">
                  Your inbox is empty
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEmails.map((email) => (
                  <EmailItem
                    key={email.id}
                    email={email}
                    onAction={handleAction}
                    onDelete={handleDelete}
                    onClick={onEmailClick}
                    isActionLoading={actionLoadingId === email.id}
                    isDeleteLoading={deleteLoadingId === email.id}
                    showPriority={sortBy === 'priority'}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
