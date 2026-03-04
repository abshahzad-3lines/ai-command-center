'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [replyTone, setReplyTone] = useState<ReplyTone | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-resize iframe to fit email content
  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;
    iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !email?.body) return;

    const handleLoad = () => {
      resizeIframe();
      const images = iframe.contentDocument?.querySelectorAll('img');
      images?.forEach((img) => {
        if (!img.complete) img.addEventListener('load', resizeIframe);
      });
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [email?.body, resizeIframe]);

  const resetState = () => {
    setReplyTone(null);
    setReplyDraft('');
    setIsGeneratingReply(false);
    setIsSidebarOpen(false);
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetState();
  };

  const handleGenerateReply = async (tone: ReplyTone) => {
    if (!email) return;

    setReplyTone(tone);
    setIsGeneratingReply(true);

    try {
      const reply = await generateReply(
        email.subject,
        email.from.name,
        email.from.email,
        email.body || email.preview,
        tone
      );
      setReplyDraft(reply);
    } catch {
      toast.error('Failed to generate reply');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!email || !replyDraft.trim()) return;

    try {
      await sendEmail(
        [email.from.email],
        `Re: ${email.subject}`,
        replyDraft
      );
      toast.success('Reply sent');
      resetState();
      onOpenChange(false);
    } catch {
      toast.error('Failed to send reply');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'w-full max-h-[90vh] overflow-hidden flex flex-col transition-all',
          isSidebarOpen ? 'sm:max-w-[90vw]' : 'sm:max-w-5xl'
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
              {/* Email body — rendered in an iframe so HTML email styles are isolated */}
              <div className="py-4 overflow-y-auto h-[65vh]">
                <iframe
                  ref={iframeRef}
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;word-break:break-word;overflow-wrap:anywhere}img{max-width:100%!important;height:auto}table{max-width:100%!important}pre{max-width:100%;overflow-x:auto}a{color:#2563eb}@media(prefers-color-scheme:dark){body{color:#e5e5e5;background:#0a0a0a}a{color:#60a5fa}}</style></head><body>${email.body || email.preview}</body></html>`}
                  className="w-full border-0 min-h-[200px]"
                  sandbox="allow-same-origin"
                  title="Email content"
                />
              </div>
            </div>

            {/* AI Sidebar with integrated reply */}
            {isSidebarOpen && (
              <EmailAISidebar
                email={{
                  id: email.id,
                  subject: email.subject,
                  from: email.from,
                  body: email.body || email.preview,
                }}
                onClose={() => setIsSidebarOpen(false)}
                accessToken={accessToken}
                userId={userId}
                replyDraft={replyDraft}
                onReplyDraftChange={setReplyDraft}
                onSendReply={handleSendReply}
                isSending={isSending}
                onGenerateReply={handleGenerateReply}
                isGeneratingReply={isGeneratingReply}
                replyTone={replyTone}
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
            {isSidebarOpen ? 'Hide AI Assistant' : 'AI Assistant & Reply'}
          </Button>
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
