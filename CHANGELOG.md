# AI Command Center - Development Log

## Session 3 - March 2, 2026

### Bug Fixes
- Fixed nested `<button>` inside `<button>` in `OdooRfpItem.tsx` — changed outer to `<div>` with `role="button"` to fix DOM nesting violation
- Added `stopPropagation()` to action buttons in Odoo item components to prevent row click from firing when clicking approve/reject/confirm buttons
- Fixed runtime console warnings from invalid HTML nesting across Odoo dashboard components

### Runtime Testing
- Verified all Odoo dashboard cards render with live data from Odoo JSON-RPC
- Confirmed AI chat with tool calling works end-to-end (Claude → tool-executor → Odoo/Email/Calendar/Tasks)
- Tested email compose and send flow through AI chat
- Validated `next build` compiles without errors

### Documentation
- Full rewrite of `README.md` with architecture diagrams, all 23 tools, API reference, database schema
- Updated `CHANGELOG.md` with Session 2 and Session 3 entries
- Updated `AI_FEATURES_TODO.md` — moved all implemented features to Done
- Updated `docs/ODOO_INTEGRATION.md` with correct tool counts and migration files

---

## Session 2 - March 1-2, 2026

### 1. Claude AI Integration (Replaced OpenAI)
- Created `lib/adapters/ai/claude.adapter.ts` — full Claude adapter with `chatWithTools()`, `continueWithToolResults()`, `analyzeEmail()`, `generateReply()`
- Switched `AI_PROVIDER` from `openai` to `anthropic` in configuration
- Added `@anthropic-ai/sdk` dependency
- Chat now uses Claude with full tool calling support (23 tools)

### 2. Email Enhancements
- **Email compose/send** — `app/api/emails/send/route.ts` for sending new emails
- **Email reply** — `reply_to_email` tool via AI chat
- **Email detail view** — `app/api/emails/[id]/route.ts` supports GET for full email content
- **Email deletion** — DELETE method on single email endpoint
- **Email tools** — `lib/ai/tools/email-tools.ts` with `search_emails`, `send_email`, `reply_to_email`
- Updated `lib/adapters/email/outlook.adapter.ts` with `sendEmail()` method (To/CC/BCC)
- Updated `lib/adapters/email/types.ts` with `sendEmail` in EmailAdapter interface
- Updated `hooks/useEmails.ts` with delete mutation and action execution
- Updated `app/email/page.tsx` with compose dialog, email detail panel, proper data flow

### 3. Calendar Enhancements
- **Calendar tools** — `lib/ai/tools/calendar-tools.ts` with `search_calendar_events`, `create_calendar_event`
- **Calendar API** — `app/api/calendar/route.ts` (GET list, POST create), `app/api/calendar/[id]/route.ts` (GET single)
- **Calendar adapter** — `lib/adapters/calendar/outlook.adapter.ts` for Microsoft Graph calendar
- Updated `app/calendar/page.tsx` with real calendar data, event creation, edit/delete support

### 4. Task Management (Backend)
- **Task tools** — `lib/ai/tools/task-tools.ts` with `search_tasks`, `create_task`, `complete_task`
- **Task API** — `app/api/tasks/route.ts` (GET/POST), `app/api/tasks/[id]/route.ts` (GET/POST)
- **Task service** — `lib/services/tasks.service.ts` with full CRUD operations
- Wired `app/tasks/page.tsx` to backend — tasks now persist in Supabase
- AI can create, search, and complete tasks via chat

### 5. Settings & Profile Persistence
- **Settings API** — `app/api/settings/route.ts` for saving user preferences
- Updated `app/settings/page.tsx` — settings persist to `user_settings` table
- Updated `app/settings/profile/page.tsx` — profile changes save to `profiles` table
- Updated `app/settings/security/page.tsx` — displays security info from Supabase auth

### 6. Dashboard & Layout Updates
- Updated `app/page.tsx` — dashboard shows real data from Odoo, emails, calendar, tasks
- Updated `components/layout/DashboardShell.tsx` — improved layout grid
- Updated `components/layout/Header.tsx` — user menu shows real profile data
- Updated `components/modules/chat/ChatWidget.tsx` — connected to Claude API with tool calling
- Chat widget sends `accessToken` for email/calendar operations

### 7. Tool Executor & Infrastructure
- **Tool executor** — `lib/ai/tool-executor.ts` routes tool calls to 4 service categories:
  - Odoo tools → `OdooService` → `OdooAdapter` → JSON-RPC
  - Email tools → `OutlookAdapter` → Microsoft Graph
  - Calendar tools → `OutlookCalendarAdapter` → Microsoft Graph
  - Task tools → `TasksService` → Supabase
- **Audit logging** — All Odoo WRITE tools logged to `odoo_action_logs` with `actor_email`
- Updated `app/api/chat/route.ts` — passes `accessToken` and `userId` to tool executor
- Renamed `odoo_mcp_actions` table to `odoo_action_logs` (migration `20260302000001`)

### 8. Odoo Adapter Improvements
- Updated `lib/adapters/odoo/odoo.adapter.ts` — added `searchRecords()` and `getRecord()` for generic Odoo queries
- Added `cancel_sales_order` support for both `order_id` and `order_name` parameters
- Improved error handling and response formatting across all Odoo tools

### 9. Auth & Database Fixes
- **Profile fix** — `app/api/auth/ensure-profile/route.ts` creates profile on Microsoft OAuth login
- Migration `20260302000002_fix_profiles_for_microsoft_auth.sql` — fixes profiles table for external OAuth
- Migration `20260302000003_drop_profiles_auth_fk.sql` — drops FK constraint to `auth.users` for Microsoft-only auth
- Migration `20260301000002_fix_chat_rls.sql` — fixes RLS policies for chat messages
- Migration `20260301000003_fix_chat_messages_nullable.sql` — makes `metadata` column nullable

### Files Modified/Created (Session 2)
```
# New files
app/api/emails/send/route.ts
app/api/settings/route.ts
lib/ai/tools/email-tools.ts
lib/ai/tools/calendar-tools.ts
lib/ai/tools/task-tools.ts
supabase/migrations/20260301000001_add_actor_email_to_actions.sql
supabase/migrations/20260301000002_fix_chat_rls.sql
supabase/migrations/20260301000003_fix_chat_messages_nullable.sql
supabase/migrations/20260302000001_rename_mcp_actions_table.sql
supabase/migrations/20260302000002_fix_profiles_for_microsoft_auth.sql
supabase/migrations/20260302000003_drop_profiles_auth_fk.sql

# Modified files
app/api/auth/ensure-profile/route.ts
app/api/chat/route.ts
app/api/emails/[id]/route.ts
app/calendar/page.tsx
app/chat/page.tsx
app/email/page.tsx
app/page.tsx
app/settings/page.tsx
app/settings/profile/page.tsx
app/settings/security/page.tsx
components/layout/DashboardShell.tsx
components/layout/Header.tsx
components/modules/chat/ChatWidget.tsx
hooks/useEmails.ts
lib/adapters/email/outlook.adapter.ts
lib/adapters/email/types.ts
lib/adapters/odoo/odoo.adapter.ts
lib/ai/tool-executor.ts
```

---

## Session 1 - February 25, 2026

### Project Initialization
- Created project at `/Users/3lines/Desktop/ai-command-center`
- Initialized Next.js 16 with TypeScript, Tailwind CSS, App Router
- Installed and configured shadcn/ui component library
- Added core dependencies: React Query, Microsoft Graph, MSAL, OpenAI, Lucide, date-fns

### Architecture Established
- **Adapter Pattern** for swappable services (email providers, AI providers)
- **Service Layer** for business logic separation
- **Module-based Components** for easy feature expansion

### Files Created

#### Types & Configuration
- `types/index.ts` — Shared TypeScript interfaces (Email, EmailSummary, SuggestedAction, etc.)
- `config/index.ts` — App configuration (Microsoft, AI, local AI settings)
- `.env.example` — Environment variable template

#### Email Adapter (`lib/adapters/email/`)
- `types.ts` — EmailAdapter interface definition
- `outlook.adapter.ts` — Microsoft Graph API implementation (fetchEmails, getEmail, deleteEmail, sendReply, archiveEmail, markAsRead)
- `index.ts` — Adapter factory

#### AI Adapter (`lib/adapters/ai/`)
- `types.ts` — AIAdapter interface definition
- `openai.adapter.ts` — OpenAI implementation (analyzeEmail, generateReply, analyzeEmails)
- `index.ts` — Adapter factory

#### Services (`lib/services/`)
- `email.service.ts` — Email business logic (getEmailsWithSummaries, executeAction, deleteEmail)

#### API Routes
- `app/api/emails/route.ts` — GET /api/emails
- `app/api/emails/[id]/route.ts` — DELETE /api/emails/:id
- `app/api/emails/[id]/action/route.ts` — POST email actions

#### Layout Components
- `components/layout/Sidebar.tsx` — Navigation sidebar
- `components/layout/Header.tsx` — Top header with search, notifications, user menu
- `components/layout/DashboardShell.tsx` — Main layout wrapper

#### Email Module
- `components/modules/email/EmailCard.tsx` — Dashboard email card
- `components/modules/email/EmailItem.tsx` — Single email row

#### Providers & Hooks
- `components/providers/QueryProvider.tsx` — React Query setup
- `hooks/useEmails.ts` — Email data fetching hook

#### Main App
- `app/layout.tsx` — Root layout with providers
- `app/page.tsx` — Dashboard page

### Microsoft OAuth Implemented
- `lib/auth/msal-config.ts` — MSAL configuration
- `components/providers/AuthProvider.tsx` — Auth context with login/logout
- `app/auth/callback/page.tsx` — OAuth callback handler

### Odoo ERP Integration
- `lib/adapters/odoo/jsonrpc-client.ts` — Low-level JSON-RPC HTTP client
- `lib/adapters/odoo/odoo.adapter.ts` — Business logic adapter (POs, SOs, invoices)
- `lib/adapters/odoo/types.ts` — OdooAdapter interface
- `lib/odoo/tools.ts` — 15 AI tool definitions for Odoo
- `lib/odoo/odoo.service.ts` — High-level Odoo service
- `lib/ai/tool-executor.ts` — Maps AI tool calls to Odoo service methods
- `lib/services/odoo-action-log.service.ts` — Audit trail logging
- Dashboard components: OdooRfpCard, OdooSalesCard, OdooInvoicesCard, OdooAIPriorityCard

### Supabase Integration
- `lib/supabase/server.ts` — Server-side client
- `lib/supabase/client.ts` — Browser client
- `lib/services/chat.service.ts` — Chat message persistence
- `supabase/migrations/20260226000001_initial_schema.sql` — Core tables
- `supabase/migrations/20260226000002_odoo_cache_tables.sql` — Odoo cache + audit log

### Current State (End of Session 1)
- Project structure complete
- UI components working
- Email adapter ready for Microsoft Graph
- AI adapter ready (OpenAI configured, Claude adapter placeholder)
- Odoo integration with 15 AI tools
- Supabase database with RLS policies
- Microsoft OAuth implemented

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19 + Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + RLS) |
| AI | Claude (Anthropic SDK) |
| ERP | Odoo via JSON-RPC |
| Email/Calendar | Microsoft Graph API |
| Server State | React Query (TanStack) |
| Client State | Zustand |
| Auth | MSAL (Microsoft) + Supabase Auth |
| Icons | Lucide React |
| Notifications | Sonner |
