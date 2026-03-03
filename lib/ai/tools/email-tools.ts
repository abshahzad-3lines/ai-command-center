/**
 * AI tool definitions for email operations via Outlook/Microsoft Graph
 */

import type { ClaudeTool } from '@/lib/adapters/ai/claude.adapter';

export const emailTools: ClaudeTool[] = [
  {
    name: 'search_emails',
    description:
      'Search the user\'s Outlook inbox for emails. Returns a list of emails with subject, sender, preview, and received date. ' +
      'Use this when the user asks about their emails, inbox, or messages.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of emails to return. Default: 10. Example: 5',
        },
      },
    },
  },
  {
    name: 'send_email',
    description:
      'Send a new email from the user\'s Outlook account. This is a WRITE action. ' +
      'Use this when the user asks to compose, send, or write an email to someone.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of recipient email addresses. Example: ["john@example.com"]',
        },
        subject: {
          type: 'string',
          description: 'The email subject line. Example: "Meeting Follow-up"',
        },
        body: {
          type: 'string',
          description: 'The email body text. Example: "Hi John, just following up on our meeting..."',
        },
        cc: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional CC recipients. Example: ["manager@example.com"]',
        },
        bcc: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional BCC recipients.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'reply_to_email',
    description:
      'Reply to an existing email. This is a WRITE action. ' +
      'Use this when the user asks to reply to a specific email. You need the email ID.',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email to reply to.',
        },
        body: {
          type: 'string',
          description: 'The reply message text.',
        },
      },
      required: ['email_id', 'body'],
    },
  },
];
