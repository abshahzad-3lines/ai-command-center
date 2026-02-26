'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onSignOut?: () => void;
}

export function DashboardShell({ children, user, onSignOut }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onSignOut={onSignOut} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
