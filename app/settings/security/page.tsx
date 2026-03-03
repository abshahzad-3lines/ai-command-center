'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { ChatWidget } from '@/components/modules/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Shield,
  Key,
  Monitor,
  LogOut,
  AlertTriangle,
  Check,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SecuritySettingsPage() {
  const { user, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOutAllDevices = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      toast.success('Signed out from all devices');
    } catch {
      toast.error('Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleManageMicrosoftAccount = () => {
    window.open('https://account.microsoft.com/security', '_blank');
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security</h1>
            <p className="text-muted-foreground">Manage your security settings</p>
          </div>
        </div>

        {/* Microsoft Account Security */}
        <div className="rounded-2xl border bg-card p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Microsoft Account Security</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your password and two-factor authentication are managed through your Microsoft account.
              </p>
              <Button variant="outline" onClick={handleManageMicrosoftAccount}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Microsoft Security
              </Button>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="rounded-2xl border bg-card p-6 mb-6">
          <h3 className="font-semibold mb-4">Security Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Microsoft Account</p>
                  <p className="text-sm text-muted-foreground">Connected and authenticated</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Managed by Microsoft</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleManageMicrosoftAccount}>
                Configure
              </Button>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="rounded-2xl border bg-card p-6 mb-6">
          <h3 className="font-semibold mb-4">Active Sessions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Current Device</p>
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user?.username || 'Unknown user'} • Active now
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-destructive/50 bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Sign out from all devices. You will need to sign in again on each device.
          </p>
          <Button
            variant="destructive"
            onClick={handleSignOutAllDevices}
            disabled={isSigningOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isSigningOut ? 'Signing out...' : 'Sign Out All Devices'}
          </Button>
        </div>
      </div>

      <ChatWidget />
    </DashboardShell>
  );
}
