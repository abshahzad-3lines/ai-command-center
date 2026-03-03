'use client';

import { DashboardShell } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { ChatWidget } from '@/components/modules/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import {
  User,
  Bell,
  Palette,
  Shield,
  Mail,
  Calendar,
  LogOut,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Monitor,
  LogIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SettingsItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href?: string;
  badge?: string;
  action?: () => void;
  actionLabel?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

export default function SettingsPage() {
  const { user, logout, isAuthenticated, login, profileId } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    desktop: true,
  });

  // Prevent hydration mismatch - this is a valid pattern for theme handling
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Load settings from DB
  useEffect(() => {
    if (!profileId) return;
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          headers: { 'x-user-id': profileId },
        });
        const data = await response.json();
        if (data.success && data.data) {
          setNotifications({
            email: data.data.notifications_email ?? true,
            push: data.data.notifications_push ?? false,
            desktop: data.data.notifications_desktop ?? true,
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, [profileId]);

  const handleSignOut = async () => {
    await logout();
    toast.success('Signed out successfully');
  };

  const handleConnect = async () => {
    try {
      await login();
    } catch {
      toast.error('Failed to connect');
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const newState = { ...prev, [key]: !prev[key] };
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${newState[key] ? 'enabled' : 'disabled'}`);

      // Persist to DB
      if (profileId) {
        const dbKey = `notifications_${key}` as const;
        fetch('/api/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': profileId,
          },
          body: JSON.stringify({ [dbKey]: newState[key] }),
        }).catch((err) => console.error('Failed to persist notification setting:', err));
      }

      return newState;
    });
  };

  const settingsSections: SettingsSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile',
          description: 'Manage your personal information',
          href: '/settings/profile',
        },
        {
          icon: Shield,
          label: 'Security',
          description: 'Password and security settings',
          href: '/settings/security',
        },
      ],
    },
    {
      title: 'Integrations',
      items: [
        {
          icon: Mail,
          label: 'Email',
          description: isAuthenticated ? 'Connected to Outlook' : 'Connect your email account',
          badge: isAuthenticated ? 'Connected' : undefined,
          action: isAuthenticated ? undefined : handleConnect,
          actionLabel: isAuthenticated ? undefined : 'Connect',
        },
        {
          icon: Calendar,
          label: 'Calendar',
          description: isAuthenticated ? 'Connected to Outlook' : 'Connect your calendar',
          badge: isAuthenticated ? 'Connected' : undefined,
          action: isAuthenticated ? undefined : handleConnect,
          actionLabel: isAuthenticated ? undefined : 'Connect',
        },
      ],
    },
  ];

  return (
    <DashboardShell
      user={
        user
          ? { name: user.name || user.username || 'User', email: user.username || '' }
          : undefined
      }
      onSignOut={logout}
    >
      <div className="max-w-3xl mx-auto pb-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* User Card */}
        {user ? (
          <div className="rounded-2xl border bg-card p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {user.name || user.username || 'User'}
                </h2>
                <p className="text-muted-foreground">{user.username}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-2xl">
                <User className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">Not signed in</h2>
                <p className="text-muted-foreground">Sign in to access all features</p>
              </div>
              <Button onClick={handleConnect}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          </div>
        )}

        {/* Theme Selection */}
        <div className="rounded-2xl border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5" />
            <h3 className="font-semibold">Appearance</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Choose your preferred theme
          </p>
          {mounted && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setTheme(value);
                    toast.success(`Theme set to ${label}`);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors cursor-pointer',
                    theme === value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  )}
                >
                  <Icon className={cn('h-5 w-5', theme === value && 'text-primary')} />
                  <span className="text-sm font-medium">{label}</span>
                  {theme === value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="space-y-4">
            {[
              { key: 'email', label: 'Email notifications', description: 'Receive updates via email' },
              { key: 'push', label: 'Push notifications', description: 'Receive push notifications on your device' },
              { key: 'desktop', label: 'Desktop notifications', description: 'Show desktop notifications' },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <button
                  onClick={() => toggleNotification(key as keyof typeof notifications)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
                    notifications[key as keyof typeof notifications]
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform',
                      notifications[key as keyof typeof notifications] && 'translate-x-5'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <div key={section.title} className="rounded-2xl border bg-card mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/50">
              <h3 className="font-semibold">{section.title}</h3>
            </div>
            <div className="divide-y">
              {section.items.map((item) => {
                const content = (
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-left w-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {item.actionLabel ? (
                      <Button variant="outline" size="sm" onClick={item.action}>
                        {item.actionLabel}
                      </Button>
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                );

                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href} className="block">
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={item.label} className="block w-full cursor-pointer" onClick={item.action} role="button" tabIndex={0}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Version Info */}
        <div className="text-center text-sm text-muted-foreground py-6">
          AI Command Center v0.1.0
        </div>
      </div>

      <ChatWidget />
    </DashboardShell>
  );
}
