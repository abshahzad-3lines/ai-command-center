'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  UserCircle,
  X,
  Mail,
  CheckSquare,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface SearchResult {
  id: string;
  type: 'page' | 'email' | 'task';
  title: string;
  description?: string;
  href: string;
  icon: React.ElementType;
}

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onSignOut?: () => void;
}

const pages: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', description: 'Main dashboard', href: '/', icon: LayoutDashboard },
  { id: 'email', type: 'page', title: 'Email', description: 'Manage your inbox', href: '/email', icon: Mail },
  { id: 'calendar', type: 'page', title: 'Calendar', description: 'View your schedule', href: '/calendar', icon: Calendar },
  { id: 'tasks', type: 'page', title: 'Tasks', description: 'Manage your tasks', href: '/tasks', icon: CheckSquare },
  { id: 'chat', type: 'page', title: 'AI Chat', description: 'Chat with AI assistant', href: '/chat', icon: MessageSquare },
  { id: 'settings', type: 'page', title: 'Settings', description: 'Account settings', href: '/settings', icon: Settings },
  { id: 'profile', type: 'page', title: 'Profile', description: 'Edit your profile', href: '/settings/profile', icon: UserCircle },
  { id: 'security', type: 'page', title: 'Security', description: 'Security settings', href: '/settings/security', icon: Settings },
];

export function Header({ user, onSignOut }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Search results computed from query (using useMemo to avoid useEffect setState issues)
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New email',
      message: 'You have 3 unread emails',
      time: '5 min ago',
      read: false,
    },
    {
      id: '2',
      title: 'Task reminder',
      message: 'Review project proposal is due today',
      time: '1 hour ago',
      read: false,
    },
    {
      id: '3',
      title: 'Welcome!',
      message: 'Thanks for using AI Command Center',
      time: '2 hours ago',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Search results computed from query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search pages
    pages.forEach((page) => {
      if (
        page.title.toLowerCase().includes(query) ||
        page.description?.toLowerCase().includes(query)
      ) {
        results.push(page);
      }
    });

    // Add quick actions based on query
    if ('email'.includes(query) || 'mail'.includes(query) || 'inbox'.includes(query)) {
      if (!results.find((r) => r.id === 'email')) {
        results.push(pages.find((p) => p.id === 'email')!);
      }
    }

    if ('task'.includes(query) || 'todo'.includes(query)) {
      if (!results.find((r) => r.id === 'tasks')) {
        results.push(pages.find((p) => p.id === 'tasks')!);
      }
    }

    return results.slice(0, 6);
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setIsSearchFocused(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div ref={searchRef} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search... (⌘K)"
            className="h-9 w-64 rounded-lg border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {isSearchFocused && (searchQuery || true) && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border bg-background shadow-lg overflow-hidden z-50">
              {searchQuery && searchResults.length > 0 ? (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Results
                  </div>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted text-left"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <result.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No results found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Quick Navigation
                  </div>
                  {pages.slice(0, 5).map((page) => (
                    <button
                      key={page.id}
                      onClick={() => handleResultClick(page)}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted text-left"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <page.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{page.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {page.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end" forceMount>
            <div className="flex items-center justify-between px-4 py-2">
              <DropdownMenuLabel className="p-0 font-semibold">
                Notifications
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div
                      className={cn(
                        'mt-1.5 h-2 w-2 rounded-full shrink-0',
                        notification.read ? 'bg-transparent' : 'bg-primary'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.time}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => router.push('/settings')}
              >
                Notification Settings
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                <AvatarFallback>
                  {user?.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || 'Guest'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'Not signed in'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
              <UserCircle className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
