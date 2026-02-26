'use client';

import { useState, useMemo } from 'react';
import { DashboardShell } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEmails } from '@/hooks/useEmails';
import { ChatWidget } from '@/components/modules/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  RefreshCw,
  Trash2,
  Archive,
  Star,
  MailOpen,
  AlertCircle,
  LogIn,
  Clock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { EmailSortOption } from '@/types';

export default function EmailPage() {
  const { isAuthenticated, user, login, logout, accessToken } = useAuth();
  const { emails, isLoading, error, refetch, deleteEmail } = useEmails({
    accessToken,
    limit: 20,
  });
  const [sortBy, setSortBy] = useState<EmailSortOption>('time');

  // Sort emails based on selected option
  const sortedEmails = useMemo(() => {
    if (!emails) return [];

    const sorted = [...emails];
    if (sortBy === 'time') {
      // Sort by time (newest first)
      sorted.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    } else if (sortBy === 'priority') {
      // Sort by priority (high -> medium -> low)
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    return sorted;
  }, [emails, sortBy]);

  const handleRefresh = async () => {
    await refetch();
    toast.success('Emails refreshed');
  };

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  const priorityLabels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  const handleDelete = async (emailId: string) => {
    try {
      await deleteEmail(emailId);
      toast.success('Email deleted');
    } catch {
      toast.error('Failed to delete email');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return new Date(date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return new Date(date).toLocaleDateString([], { weekday: 'short' });
    } else {
      return new Date(date).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <DashboardShell
      user={
        user
          ? { name: user.name || user.username || 'User', email: user.username || '' }
          : undefined
      }
      onSignOut={logout}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email</h1>
            <p className="text-muted-foreground">Manage your inbox</p>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                {/* Sort Controls */}
                <div className="flex items-center rounded-lg border bg-background p-1">
                  <button
                    onClick={() => setSortBy('time')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      sortBy === 'time'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    Time
                  </button>
                  <button
                    onClick={() => setSortBy('priority')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      sortBy === 'priority'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Priority
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-2xl border bg-card overflow-hidden">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connect your email</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Connect your Outlook account to view and manage your emails.
              </p>
              <Button onClick={login}>
                <LogIn className="h-4 w-4 mr-2" />
                Connect Outlook
              </Button>
            </div>
          ) : isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error loading emails</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh}>Try Again</Button>
            </div>
          ) : sortedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <MailOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No emails</h2>
              <p className="text-muted-foreground">Your inbox is empty.</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y">
                {sortedEmails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors group"
                  >
                    {/* Priority indicator */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {email.from.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          priorityColors[email.priority]
                        )}
                        title={`${priorityLabels[email.priority]} priority`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {email.from.split('<')[0].trim()}
                        </span>
                        {sortBy === 'priority' && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              email.priority === 'high' && 'bg-red-500/10 text-red-600',
                              email.priority === 'medium' && 'bg-yellow-500/10 text-yellow-600',
                              email.priority === 'low' && 'bg-green-500/10 text-green-600'
                            )}
                          >
                            {priorityLabels[email.priority]}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDate(email.receivedAt)}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm truncate mb-1">
                        {email.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {email.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(email.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <ChatWidget />
    </DashboardShell>
  );
}
