// Shared types for AI Command Center

export interface Email {
  id: string;
  subject: string;
  from: {
    name: string;
    email: string;
  };
  preview: string;
  body: string;
  receivedAt: Date;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  summary: string;
  receivedAt: Date;
  suggestedAction: SuggestedAction;
  priority: 'high' | 'medium' | 'low';
}

export type EmailSortOption = 'time' | 'priority';

export interface SuggestedAction {
  type: 'reply' | 'archive' | 'forward' | 'schedule' | 'flag' | 'none';
  label: string;
  description: string;
  draftContent?: string;
}

export interface AIAnalysisResult {
  summary: string;
  suggestedAction: SuggestedAction;
  priority: 'high' | 'medium' | 'low';
  categories: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Calendar types
export interface CalendarEvent {
  id: string;
  subject: string;
  body?: string;
  start: Date;
  end: Date;
  location?: string;
  isAllDay: boolean;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: {
    name: string;
    email: string;
    status: 'accepted' | 'declined' | 'tentative' | 'none';
  }[];
  webLink?: string;
  isOnline: boolean;
  onlineMeetingUrl?: string;
  categories?: string[];
  importance: 'low' | 'normal' | 'high';
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
}

export interface CalendarView {
  month: number;
  year: number;
}
