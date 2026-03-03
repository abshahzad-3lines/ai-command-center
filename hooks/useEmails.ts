'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EmailSummary, ApiResponse } from '@/types';

interface UseEmailsOptions {
  accessToken?: string | null;
  limit?: number;
  getAccessToken?: () => Promise<string | null>;
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

async function sendEmail(
  accessToken: string,
  to: string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[]
): Promise<void> {
  const response = await fetch('/api/emails/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, body, cc, bcc }),
  });

  const data: ApiResponse<{ sent: boolean }> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to send email');
  }
}

async function fetchEmailDetail(
  accessToken: string,
  emailId: string
): Promise<{ id: string; subject: string; from: { name: string; email: string }; body: string; preview: string; receivedAt: Date; isRead: boolean; hasAttachments: boolean }> {
  const response = await fetch(`/api/emails/${emailId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch email');
  }

  return data.data;
}

async function generateReply(
  accessToken: string,
  subject: string,
  senderName: string,
  senderEmail: string,
  emailBody: string,
  tone: 'formal' | 'casual' | 'professional'
): Promise<string> {
  const response = await fetch('/api/emails/generate-reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subject, senderName, senderEmail, emailBody, tone }),
  });

  const data = await response.json();

  if (!data.success || !data.data?.reply) {
    throw new Error(data.error || 'Failed to generate reply');
  }

  return data.data.reply;
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

export function useEmails({ accessToken, limit = 10, getAccessToken }: UseEmailsOptions) {
  const queryClient = useQueryClient();

  /**
   * Get a fresh access token — tries refreshing via getAccessToken callback,
   * falls back to the current accessToken prop.
   */
  const getFreshToken = async (): Promise<string> => {
    if (getAccessToken) {
      const fresh = await getAccessToken();
      if (fresh) return fresh;
    }
    if (accessToken) return accessToken;
    throw new Error('Not authenticated. Please sign in with your Microsoft account.');
  };

  const emailsQuery = useQuery({
    queryKey: ['emails', accessToken, limit],
    queryFn: async () => {
      const token = await getFreshToken();
      return fetchEmails(token, limit);
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const token = await getFreshToken();
      return deleteEmail(token, emailId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ emailId, actionType }: { emailId: string; actionType: string }) => {
      const token = await getFreshToken();
      return executeAction(token, emailId, actionType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async ({ to, subject, body, cc, bcc }: { to: string[]; subject: string; body: string; cc?: string[]; bcc?: string[] }) => {
      const token = await getFreshToken();
      return sendEmail(token, to, subject, body, cc, bcc);
    },
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
    sendEmail: (to: string[], subject: string, body: string, cc?: string[], bcc?: string[]) =>
      sendMutation.mutateAsync({ to, subject, body, cc, bcc }),
    fetchEmailDetail: async (emailId: string) => {
      const token = await getFreshToken();
      return fetchEmailDetail(token, emailId);
    },
    isSending: sendMutation.isPending,
    generateReply: async (
      subject: string,
      senderName: string,
      senderEmail: string,
      emailBody: string,
      tone: 'formal' | 'casual' | 'professional'
    ) => {
      const token = await getFreshToken();
      return generateReply(token, subject, senderName, senderEmail, emailBody, tone);
    },
  };
}
