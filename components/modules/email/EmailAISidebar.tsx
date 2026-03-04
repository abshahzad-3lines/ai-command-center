'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, X, Reply, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmailContext {
  id: string;
  subject: string;
  from: { name: string; email: string };
  body: string;
}

interface SidebarMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type ReplyTone = 'formal' | 'casual' | 'professional';

interface EmailAISidebarProps {
  email: EmailContext;
  onClose: () => void;
  accessToken?: string | null;
  userId: string;
  // Reply integration
  replyDraft: string;
  onReplyDraftChange: (text: string) => void;
  onSendReply: () => void;
  isSending: boolean;
  onGenerateReply: (tone: ReplyTone) => void;
  isGeneratingReply: boolean;
  replyTone: ReplyTone | null;
}

const QUICK_ACTIONS = [
  { label: 'Summarize', prompt: 'Summarize this email concisely.' },
  { label: 'Draft Reply', prompt: 'Draft a professional reply to this email.' },
  { label: 'Action Items', prompt: 'Extract all action items from this email.' },
  { label: 'Key Info', prompt: 'Extract the key information (dates, names, amounts, deadlines) from this email.' },
];

export function EmailAISidebar({
  email,
  onClose,
  accessToken,
  userId,
  replyDraft,
  onReplyDraftChange,
  onSendReply,
  isSending,
  onGenerateReply,
  isGeneratingReply,
  replyTone,
}: EmailAISidebarProps) {
  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: SidebarMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const conversationHistory = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          message: text.trim(),
          accessToken,
          ephemeral: true,
          conversationHistory: conversationHistory.slice(0, -1),
          emailContext: {
            id: email.id,
            subject: email.subject,
            from: `${email.from.name} <${email.from.email}>`,
            body: email.body?.slice(0, 3000) || '',
          },
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (data.success && data.data?.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.data.response,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.error || "Sorry, I couldn't process that. Please try again.",
          },
        ]);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, there was an error. Please try again.',
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, userId, accessToken, email]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleUseAsReply = (text: string) => {
    onReplyDraftChange(text);
    toast.success('Applied to reply draft');
  };

  return (
    <div className="flex flex-col h-full w-[480px] shrink-0 border-l pl-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 pt-4 pb-3">
            <p className="text-sm text-muted-foreground text-center">
              Ask me anything about this email
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {msg.role === 'user' ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="flex flex-col gap-1 max-w-[85%]">
              <div
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleUseAsReply(msg.content)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Use as Reply
                </Button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="flex items-center gap-2 border-t pt-3 mt-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this email..."
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          size="icon"
          className="h-8 w-8 rounded-full shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Integrated Reply Section */}
      <div className="border-t pt-3 mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Reply</span>
          </div>
          <div className="flex items-center gap-1">
            {(['formal', 'casual', 'professional'] as const).map((tone) => (
              <Button
                key={tone}
                variant={replyTone === tone ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => onGenerateReply(tone)}
                disabled={isGeneratingReply}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {isGeneratingReply ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Generating {replyTone} reply...</span>
          </div>
        ) : (
          <textarea
            value={replyDraft}
            onChange={(e) => onReplyDraftChange(e.target.value)}
            placeholder="Click a tone above to generate, or type your reply..."
            className="w-full min-h-[100px] max-h-[180px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onSendReply}
            disabled={!replyDraft.trim() || isSending}
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
    </div>
  );
}
