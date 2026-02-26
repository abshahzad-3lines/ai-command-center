'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatStore, type Message } from '@/stores/chatStore';

export function ChatWidget() {
  const { messages, isTyping, addMessage, setTyping, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setTyping(true);
    setIsExpanded(true);

    // Mock AI response with delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Hello! I'm your AI assistant. I'm here to help you manage your emails, schedule, and tasks. This is a placeholder response - AI integration coming soon!",
        timestamp: new Date(),
      };
      addMessage(aiMessage);
      setTyping(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  const handleClearChat = () => {
    clearMessages();
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl px-4 pb-6 pointer-events-auto">
        {/* Messages Container */}
        {isExpanded && messages.length > 0 && (
          <div className="mb-3 overflow-hidden rounded-2xl border bg-background shadow-2xl">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleClearChat}
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(false)}
                  title="Minimize"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="max-h-[350px] overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="relative">
          {/* Expand button when minimized and has messages */}
          {!isExpanded && messages.length > 0 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Bot className="h-3 w-3" />
              {messages.length} messages
            </button>
          )}

          <div className="flex items-center gap-2 rounded-full border bg-background shadow-lg px-4 py-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI anything..."
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            />
            {input.trim() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setInput('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
