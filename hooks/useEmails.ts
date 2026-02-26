'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EmailSummary, ApiResponse } from '@/types';

interface UseEmailsOptions {
  accessToken?: string | null;
  limit?: number;
}

async function fetchEmails(
  accessToken: string,
  limit: number
): Promise<EmailSummary[]> {
  const response = await fetch(`/api/emails?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data: ApiResponse<EmailSummary[]> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch emails');
  }

  return data.data;
}

async function deleteEmail(
  accessToken: string,
  emailId: string
): Promise<void> {
  const response = await fetch(`/api/emails/${emailId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data: ApiResponse<{ deleted: boolean }> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete email');
  }
}

async function executeAction(
  accessToken: string,
  emailId: string,
  actionType: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/emails/${emailId}/action`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ actionType }),
  });

  const data: ApiResponse<{ success: boolean; message: string }> =
    await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to execute action');
  }

  return data.data;
}

export function useEmails({ accessToken, limit = 10 }: UseEmailsOptions) {
  const queryClient = useQueryClient();

  const emailsQuery = useQuery({
    queryKey: ['emails', accessToken, limit],
    queryFn: () => fetchEmails(accessToken!, limit),
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const deleteMutation = useMutation({
    mutationFn: (emailId: string) => deleteEmail(accessToken!, emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ emailId, actionType }: { emailId: string; actionType: string }) =>
      executeAction(accessToken!, emailId, actionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  return {
    emails: emailsQuery.data || [],
    isLoading: emailsQuery.isLoading,
    error: emailsQuery.error?.message || null,
    refetch: emailsQuery.refetch,
    deleteEmail: deleteMutation.mutateAsync,
    executeAction: (emailId: string, actionType: string) =>
      actionMutation.mutateAsync({ emailId, actionType }),
  };
}
