'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { ChatWidget } from '@/components/modules/chat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
  const { user, logout, profileId } = useAuth();
  const [name, setName] = useState(user?.name || user?.username || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!profileId) {
      toast.error('No profile linked. Please sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profileId,
        },
        body: JSON.stringify({ full_name: name }),
      });

      // Also update the profile name directly
      await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microsoftId: user?.localAccountId,
          email: user?.username,
          name: name,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(data.error || 'Failed to save profile');
      }
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">Manage your personal information</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="rounded-2xl border bg-card p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold">
              {name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <Button variant="outline" size="sm">
                Change Avatar
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your name"
            />
          </div>

          {/* Email Field (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={user?.username || ''}
              disabled
              className="w-full rounded-lg border bg-muted px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email is managed by your Microsoft account
            </p>
          </div>

          {/* Account ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Account ID</label>
            <input
              type="text"
              value={user?.localAccountId || user?.homeAccountId || 'N/A'}
              disabled
              className="w-full rounded-lg border bg-muted px-4 py-2 text-sm text-muted-foreground cursor-not-allowed font-mono text-xs"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ChatWidget />
    </DashboardShell>
  );
}
