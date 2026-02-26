'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to complete, then redirect
    if (!isLoading) {
      if (isAuthenticated) {
        console.log('Auth callback: authenticated, redirecting to dashboard');
        router.push('/');
      } else {
        // If not authenticated after loading completes, something went wrong
        console.log('Auth callback: not authenticated, redirecting to home');
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">
        {isLoading ? 'Completing sign in...' : 'Redirecting...'}
      </p>
    </div>
  );
}
