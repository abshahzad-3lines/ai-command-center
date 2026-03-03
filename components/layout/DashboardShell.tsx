'use client';

import { useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useNotifications } from '@/hooks/useNotifications';

interface DashboardShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onSignOut?: () => void;
  notifications?: {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }[];
}

export function DashboardShell({ children, user, onSignOut, notifications: externalNotifications }: DashboardShellProps) {
  const { notifications: liveNotifications } = useNotifications();

  const notifications = useMemo(() => {
    const combined = [...liveNotifications, ...(externalNotifications || [])];
    // Deduplicate by id
    const seen = new Set<string>();
    return combined.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [liveNotifications, externalNotifications]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header user={user} onSignOut={onSignOut} notifications={notifications} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
