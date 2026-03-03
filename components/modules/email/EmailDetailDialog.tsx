'use client';

import { useState } from 'react';
import { EmailAISidebar } from './EmailAISidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Trash2,
  Archive,
  Sparkles,
  Send,
  Reply,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Email } from '@/types';

type ReplyTone = 'formal' | 'casual' | 'professional';

interface EmailDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: Email | null;
  isLoading: boolean;
  generateReply: (
    subject: string,
    senderName: string,
    senderEmail: string,
    body: string,
    tone: ReplyTone
  ) => Promise<string>;
  sendEmail: (to: string[], subject: string, body: string) => Promise<void>;
  isSending: boolean;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  accessToken?: string | null;
  userId: string;
}

export function EmailDetailDialog({
  open,
  onOpenChange,
  email,
  isLoading,
  generateReply,
  sendEmail,
  isSending,
  onArchive,
  onDelete,
  accessToken,
  userId,
}: EmailDetailDialogProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReplyMode, setIsReplyMode] = useState(false);
  const [replyTone, setReplyTone] = useState<ReplyTone | null>(null);
  const [generatedReply, setGeneratedReply] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [replyEdited, setReplyEdited] = useState(false);

  const resetState = () => {
    setIsReplyMode(false);
    setReplyTone(null);
    setGeneratedReply('');
    setIsGeneratingReply(false);
    setReplyEdited(false);
    setIsSidebarOpen(false);
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetState();
  };

  const handleGenerateReply = async (tone: ReplyTone) => {
    if (!email) return;

    if (replyEdited && generatedReply && tone !== replyTone) {
      const confirmed = window.confirm('Switching tone will replace your edits. Continue?');
      if (!confirmed) return;
    }

    setReplyTone(tone);
    setIsGeneratingReply(true);
    setReplyEdited(false);

    try {
      const reply = await generateReply(
        email.subject,
        email.from.name,
        email.from.email,
        email.body || email.preview,
        tone
      );
      setGeneratedReply(reply);
    } catch {
      toast.error('Failed to generate reply');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!email || !generatedReply.trim()) return;

    try {
      await sendEmail(
        [email.from.email],
        `Re: ${email.subject}`,
        generatedReply
      );
      toast.success('Reply sent');
      resetState();
      onOpenChange(false);
    } catch {
      toast.error('Failed to send reply');
    }
  };

  const handleCancelReply = () => {
    setIsReplyMode(false);
    setGeneratedReply('');
    setReplyTone(null);
    setReplyEdited(false);
  };

  const handleApplyReply = (text: string) => {
    setGeneratedReply(text);
    setIsReplyMode(true);
    setReplyEdited(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'w-full max-h-[90vh] overflow-hidden flex flex-col transition-all',
          isSidebarOpen ? 'sm:max-w-7xl' : 'sm:max-w-5xl'
        )}
      >
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {isLoading ? 'Loading...' : email?.subject || '(No Subject)'}
          </DialogTitle>
          <DialogDescription>
            {email && `From: ${email.from.name} <${email.from.email}>`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : email ? (
          <div className="flex-1 min-h-0 flex flex-row gap-0">
            {/* Email content column */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Email body */}
              <div className={cn('py-4 overflow-y-auto', isReplyMode ? 'h-[35vh]' : 'h-[65vh]')}>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none overflow-hidden break-words [&_img]:!max-w-full [&_img]:h-auto [&_table]:!max-w-full [&_table]:!w-full [&_table]:table-fixed [&_td]:break-words [&_td]:overflow-hidden [&_th]:break-words [&_th]:overflow-hidden [&_pre]:!max-w-full [&_pre]:overflow-x-auto [&_div]:!max-w-full [&_span]:!max-w-full [&_p]:!max-w-full [&_*]:!box-border"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: email.body || email.preview }}
                />
              </div>

              {/* AI Reply Section */}
              {isReplyMode && (
                <div className="border-t pt-4 mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Reply</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['formal', 'casual', 'professional'] as const).map((tone) => (
                        <Button
                          key={tone}
                          variant={replyTone === tone ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-7 px-2.5"
                          onClick={() => handleGenerateReply(tone)}
                          disabled={isGeneratingReply}
                        >
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {isGeneratingReply ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-sm">Generating {replyTone} reply...</span>
                    </div>
                  ) : generatedReply ? (
                    <textarea
                      value={generatedReply}
                      onChange={(e) => {
                        setGeneratedReply(e.target.value);
                        setReplyEdited(true);
                      }}
                      className="w-full min-h-[120px] max-h-[200px] rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <span className="text-sm">Select a tone above to generate a reply</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelReply}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendReply}
                      disabled={!generatedReply.trim() || isSending}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Sidebar */}
            {isSidebarOpen && (
              <EmailAISidebar
                email={{
                  id: email.id,
                  subject: email.subject,
                  from: email.from,
                  body: email.body || email.preview,
                }}
                onApplyReply={handleApplyReply}
                onClose={() => setIsSidebarOpen(false)}
                accessToken={accessToken}
                userId={userId}
              />
            )}
          </div>
        ) : null}

        <DialogFooter className="flex gap-2">
          <Button
            variant={isSidebarOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Assistant
          </Button>
          {isReplyMode ? (
            <Button variant="outline" size="sm" onClick={handleCancelReply}>
              <X className="h-4 w-4 mr-2" />
              Cancel Reply
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReplyMode(true)}
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (email) {
                onArchive(email.id);
                onOpenChange(false);
              }
            }}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (email) {
                onDelete(email.id);
                onOpenChange(false);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
