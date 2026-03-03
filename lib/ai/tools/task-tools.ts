/**
 * AI tool definitions for task management via Supabase
 */

import type { ClaudeTool } from '@/lib/adapters/ai/claude.adapter';

export const taskTools: ClaudeTool[] = [
  {
    name: 'search_tasks',
    description:
      'Search the user\'s tasks. Returns tasks with title, description, status, priority, and due date. ' +
      'Use this when the user asks about their tasks, to-do list, or what they need to do.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Filter by task status. If omitted, returns all tasks.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Filter by priority level. If omitted, returns all priorities.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return. Default: 20.',
        },
      },
    },
  },
  {
    name: 'create_task',
    description:
      'Create a new task for the user. This is a WRITE action. ' +
      'Use this when the user asks to add, create, or make a new task or to-do item.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The task title. Example: "Review quarterly report"',
        },
        description: {
          type: 'string',
          description: 'Optional task description with details.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority level. Default: "medium".',
        },
        due_date: {
          type: 'string',
          description: 'Optional due date in ISO format (YYYY-MM-DD). Example: "2026-03-10"',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for categorization. Example: ["work", "urgent"]',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_task',
    description:
      'Mark a task as completed. This is a WRITE action. ' +
      'Use this when the user says they finished a task or want to mark it done.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to complete.',
        },
      },
      required: ['task_id'],
    },
  },
];
