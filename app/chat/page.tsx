'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardShell } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChatStore, type Message } from '@/stores/chatStore';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { messages, isTyping, addMessage, setTyping, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    const messageContent = input.trim();
    setInput('');
    setTyping(true);

    try {
      // Call the real AI chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.localAccountId || 'anonymous',
        },
        body: JSON.stringify({ message: messageContent }),
      });

      const data = await response.json();

      if (data.success && data.data?.response) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(),
        };
        addMessage(aiMessage);
      } else {
        // Handle error response
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.error || "Sorry, I couldn't process your request. Please try again.",
          timestamp: new Date(),
        };
        addMessage(errorMessage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, there was an error connecting to the AI. Please try again.",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardShell
      user={
        user
          ? {
              name: user.name || user.username || 'User',
              email: user.username || '',
            }
          : undefined
      }
      onSignOut={logout}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Chat</h1>
            <p className="text-muted-foreground">
              Chat with your AI assistant
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearMessages}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
          )}
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col rounded-2xl border bg-card overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything about your emails, schedule, or tasks. I&apos;m here to help you be more productive.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-4',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-5 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-60 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-5 py-4">
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]"></span>
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]"></span>
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-foreground/50"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <div className="flex-1 flex items-center gap-3 rounded-full border bg-background px-4 py-2">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
