'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

async function fetchNotifications(profileId: string): Promise<Notification[]> {
  const response = await fetch('/api/notifications', {
    headers: { 'x-user-id': profileId },
  });

  const data = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch notifications');
  }

  return data.data;
}

export function useNotifications() {
  const { profileId } = useAuth();

  const query = useQuery({
    queryKey: ['notifications', profileId],
    queryFn: () => fetchNotifications(profileId!),
    enabled: !!profileId,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 1,
  });

  return {
    notifications: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
