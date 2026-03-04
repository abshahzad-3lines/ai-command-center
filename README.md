# AI Command Center

A unified business operations dashboard that integrates **Claude AI** with **Odoo ERP**, **Microsoft 365** (Outlook, Calendar), and task management. Manage purchase orders, sales orders, invoices, emails, calendar events, and tasks through natural language chat or dedicated dashboard views.

<!-- badges -->
<!-- ![Build](https://img.shields.io/badge/build-passing-brightgreen) -->
<!-- ![License](https://img.shields.io/badge/license-MIT-blue) -->

---

## Features

### AI Chat
- Natural language interface powered by Claude (Anthropic SDK)
- 24 AI tools across Odoo, Email, Calendar, Tasks, and Reports
- Multi-step tool calling with up to 5 iterations per request
- Persistent chat history stored in Supabase
- Context-aware responses with conversation memory

### Odoo ERP Integration
- **Purchase Orders** — Search, view details, approve, reject
- **Sales Orders** — Search, view, find by name, confirm, cancel
- **Invoices** — Search, view, register payments, send reminders
- **Generic Queries** — Search any Odoo model (contacts, products, employees, CRM leads, etc.)
- Dashboard cards with real-time data from Odoo
- Full audit trail of all write actions logged to Supabase

### Email (Microsoft Outlook)
- Fetch inbox emails via Microsoft Graph API
- View email details with subject, sender, preview
- Send new emails and reply to existing ones via AI chat
- Delete and manage emails
- Email compose with To/CC/BCC support

### Calendar (Microsoft Outlook)
- View calendar events with date range filtering
- Create new events with subject, time, location
- All-day event support
- AI can search and create events via chat

### Task Management
- Create, view, update, and complete tasks
- Priority levels (low, medium, high)
- Status tracking (pending, in_progress, completed, cancelled)
- Due dates and tags
- AI can manage tasks via chat

### Reports
- 7 on-demand business reports generated from Odoo ERP data
- **Sales Summary** — Revenue, order counts by status, top customers
- **Invoice Aging** — Overdue invoices in 0-30, 31-60, 61-90, 90+ day buckets
- **Purchase Overview** — Spending by status, top vendors
- **Revenue by Customer** — Revenue per customer from confirmed sales
- **Product Performance** — Top products by quantity and revenue
- **Accounts Receivable** — Outstanding balance per customer
- **Master Report** — All-in-one comprehensive report combining all 6 types
- Date range filtering with presets (last 30 days, this quarter, custom, etc.)
- Interactive charts (bar, pie) and data tables
- PDF export support
- AI can generate reports via chat

### Settings & Profile
- User profile management (name, email, timezone)
- Theme switching (light, dark, system)
- Notification preferences (email, push, desktop)
- Integration connection status display
- Settings persisted to Supabase

### Authentication
- Microsoft OAuth via MSAL (browser-based)
- Supabase Auth for session management
- Automatic profile creation on first login
- Token-based access to Microsoft Graph API

---

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.6 | React framework (App Router) |
| `react` / `react-dom` | 19.2.3 | UI library |
| `@anthropic-ai/sdk` | ^0.78.0 | Claude AI integration |
| `@supabase/supabase-js` | ^2.97.0 | Database + Auth client |
| `@supabase/ssr` | ^0.8.0 | Server-side Supabase |
| `@azure/msal-browser` | ^5.3.0 | Microsoft OAuth (browser) |
| `@azure/msal-react` | ^5.0.5 | Microsoft OAuth (React hooks) |
| `@microsoft/microsoft-graph-client` | ^3.0.7 | Outlook / Calendar API |
| `@tanstack/react-query` | ^5.90.21 | Server state management |
| `zustand` | ^5.0.11 | Client state management |
| `tailwindcss` | ^4 | Utility-first CSS |
| `radix-ui` | ^1.4.3 | Headless UI primitives |
| `shadcn` | ^3.8.5 | Component library (dev CLI) |
| `lucide-react` | ^0.575.0 | Icons |
| `date-fns` | ^4.1.0 | Date utilities |
| `next-themes` | ^0.4.6 | Theme switching |
| `sonner` | ^2.0.7 | Toast notifications |
| `class-variance-authority` | ^0.7.1 | Component variants |
| `clsx` / `tailwind-merge` | latest | Class name utilities |
| `typescript` | ^5 | Type safety |
| `eslint` / `eslint-config-next` | ^9 / 16.1.6 | Linting |

---

## Architecture

### Auth Flow

```
Browser
  │
  ├─ MSAL login → Microsoft OAuth → access_token (for Graph API)
  │
  └─ Supabase signInWithOAuth → session (for DB + RLS)
      │
      └─ on_auth_user_created trigger → creates profile + default settings
```

### AI Chat Pipeline

```
User message
  │
  ▼
POST /api/chat
  │
  ├─ Load chat history from Supabase
  ├─ Send to Claude with 24 tool definitions
  │
  ▼
Claude decides tool calls (or responds directly)
  │
  ▼
tool-executor.ts routes by tool type:
  ├─ Odoo tools    → OdooService → OdooAdapter → JSON-RPC → Odoo server
  ├─ Email tools   → OutlookAdapter → Microsoft Graph API
  ├─ Calendar tools → OutlookCalendarAdapter → Microsoft Graph API
  ├─ Task tools    → TasksService → Supabase
  └─ Report tools  → ReportService → OdooService → Odoo server
  │
  ▼
Results returned to Claude → formatted response → saved to DB → streamed to UI
  │
  └─ Loop up to 5 iterations for multi-step tasks
```

### Data Flow

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                   │
│  Components → Hooks (React Query / Zustand) → API calls │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 API Routes (Next.js)                     │
│  /api/chat  /api/odoo/*  /api/emails/*  /api/calendar/* │
│  /api/tasks/*  /api/reports/*  /api/auth/*  /api/settings │
└──────┬──────────┬──────────┬──────────┬────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌───▼──────┐
  │ Claude │ │  Odoo  │ │ MS   │ │ Supabase │
  │  API   │ │ JSON-  │ │Graph │ │ Postgres │
  │        │ │  RPC   │ │ API  │ │  + RLS   │
  └────────┘ └────────┘ └──────┘ └──────────┘
```

---

## Project Structure

```
ai-command-center/
├── app/                                    # Next.js App Router
│   ├── page.tsx                           # Dashboard (home)
│   ├── chat/page.tsx                      # AI chat interface
│   ├── email/page.tsx                     # Email dashboard
│   ├── calendar/page.tsx                  # Calendar view
│   ├── tasks/page.tsx                     # Task management
│   ├── odoo/page.tsx                      # Odoo ERP dashboard
│   ├── reports/page.tsx                   # Reports dashboard
│   ├── settings/
│   │   ├── page.tsx                       # Settings home
│   │   ├── profile/page.tsx              # Profile settings
│   │   └── security/page.tsx             # Security settings
│   ├── auth/
│   │   └── callback/page.tsx             # Microsoft OAuth callback
│   └── api/
│       ├── chat/route.ts                 # AI chat (POST/GET/DELETE)
│       ├── auth/ensure-profile/route.ts  # Profile creation
│       ├── settings/route.ts             # Save user settings
│       ├── emails/
│       │   ├── route.ts                  # List emails (GET)
│       │   ├── send/route.ts             # Send email (POST)
│       │   └── [id]/
│       │       ├── route.ts              # Get/Delete email
│       │       └── action/route.ts       # Email actions
│       ├── calendar/
│       │   ├── route.ts                  # List/Create events
│       │   └── [id]/route.ts            # Get single event
│       ├── tasks/
│       │   ├── route.ts                  # List/Create tasks
│       │   └── [id]/route.ts            # Get/Update task
│       ├── reports/
│           │   └── generate/route.ts      # Generate report (POST)
│       └── odoo/
│           ├── rfps/
│           │   ├── route.ts              # List purchase orders
│           │   └── [id]/
│           │       ├── route.ts          # Get PO details
│           │       └── action/route.ts   # Approve/Reject PO
│           ├── sales/
│           │   ├── route.ts              # List sales orders
│           │   └── [id]/route.ts        # Get/Action on SO
│           ├── invoices/
│           │   ├── route.ts              # List invoices
│           │   └── [id]/route.ts        # Get/Action on invoice
│           ├── tools/execute/route.ts    # Generic Odoo tool execution
│           └── actions/route.ts          # Audit log viewer
│
├── components/
│   ├── layout/
│   │   ├── DashboardShell.tsx            # Main grid layout
│   │   ├── Header.tsx                    # Top bar (search, user menu)
│   │   ├── Sidebar.tsx                   # Left nav
│   │   └── index.ts
│   ├── modules/
│   │   ├── chat/ChatWidget.tsx           # Floating chat widget
│   │   ├── email/
│   │   │   ├── EmailCard.tsx             # Email dashboard card
│   │   │   └── EmailItem.tsx             # Single email row
│   │   ├── reports/
│   │   │   ├── ReportCard.tsx            # Report type card
│   │   │   └── ReportResultDialog.tsx    # Report results viewer
│   │   └── odoo/
│   │       ├── OdooRfpCard.tsx           # Purchase orders card
│   │       ├── OdooRfpItem.tsx           # Single PO row
│   │       ├── OdooSalesCard.tsx         # Sales orders card
│   │       ├── OdooSalesItem.tsx         # Single SO row
│   │       ├── OdooInvoicesCard.tsx      # Invoices card
│   │       ├── OdooInvoiceItem.tsx       # Single invoice row
│   │       └── OdooAIPriorityCard.tsx    # AI priority actions
│   ├── providers/
│   │   ├── AuthProvider.tsx              # Microsoft OAuth + Supabase
│   │   ├── QueryProvider.tsx             # React Query setup
│   │   └── ThemeProvider.tsx             # Theme switching
│   └── ui/                               # shadcn/ui components (15+)
│
├── hooks/
│   ├── useEmails.ts                      # Email fetching + mutations
│   ├── useOdooRfps.ts                   # Purchase orders hook
│   ├── useOdooSales.ts                  # Sales orders hook
│   ├── useOdooInvoices.ts              # Invoices hook
│   ├── useOdooTools.ts                  # Generic Odoo tool execution
│   └── useCalendar.ts                   # Calendar events hook
│
├── lib/
│   ├── adapters/
│   │   ├── ai/
│   │   │   ├── claude.adapter.ts        # Claude AI (primary provider)
│   │   │   ├── openai.adapter.ts        # OpenAI (legacy, disabled)
│   │   │   ├── types.ts                 # AIAdapter interface
│   │   │   └── index.ts                 # Factory
│   │   ├── email/
│   │   │   ├── outlook.adapter.ts       # Microsoft Graph email
│   │   │   ├── types.ts                 # EmailAdapter interface
│   │   │   └── index.ts
│   │   ├── calendar/
│   │   │   ├── outlook.adapter.ts       # Microsoft Graph calendar
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── odoo/
│   │       ├── jsonrpc-client.ts        # Low-level JSON-RPC HTTP
│   │       ├── odoo.adapter.ts          # Business logic adapter
│   │       ├── types.ts                 # OdooAdapter interface
│   │       └── index.ts
│   ├── ai/
│   │   ├── tool-executor.ts             # Routes tool calls to services
│   │   └── tools/
│   │       ├── email-tools.ts           # 3 email tool definitions
│   │       ├── calendar-tools.ts        # 2 calendar tool definitions
│   │       ├── task-tools.ts            # 3 task tool definitions
│   │       └── report-tools.ts          # 1 report tool definition
│   ├── odoo/
│   │   ├── tools.ts                     # 15 Odoo tool definitions
│   │   ├── odoo.service.ts              # High-level Odoo service
│   │   └── index.ts
│   ├── services/
│   │   ├── chat.service.ts              # Chat persistence
│   │   ├── email.service.ts             # Email business logic
│   │   ├── email-cache.service.ts       # Email caching
│   │   ├── calendar-cache.service.ts    # Calendar caching
│   │   ├── report.service.ts             # Report generation (7 types)
│   │   ├── odoo.service.ts              # Odoo dashboard API
│   │   ├── odoo-action-log.service.ts   # Audit trail logging
│   │   ├── tasks.service.ts             # Task management
│   │   └── user.service.ts              # User profile management
│   ├── supabase/
│   │   ├── server.ts                    # Server-side client
│   │   ├── client.ts                    # Browser client
│   │   └── index.ts
│   ├── auth/
│   │   └── msal-config.ts              # Microsoft OAuth config
│   └── utils.ts                         # Utility functions
│
├── stores/
│   └── chatStore.ts                     # Zustand chat state
│
├── types/
│   ├── index.ts                         # Shared types (Email, etc.)
│   ├── odoo.ts                          # Odoo TypeScript types
│   ├── database.ts                      # Supabase generated types
│   └── api.ts                           # API response types
│
├── config/
│   └── index.ts                         # App configuration
│
├── supabase/
│   └── migrations/                      # 8 SQL migration files
│
├── scripts/
│   └── setup-supabase.sh               # Supabase setup script
│
├── public/                              # Static assets
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.example                         # Environment template
├── CHANGELOG.md
├── AI_FEATURES_TODO.md
└── docs/
    └── ODOO_INTEGRATION.md             # Odoo integration guide
```

---

## AI Tools Reference

### Odoo ERP Tools (15)

| Tool | Type | Description |
|------|------|-------------|
| `search_purchase_orders` | READ | Search/filter purchase orders by state |
| `get_purchase_order` | READ | Get full PO details by ID |
| `approve_purchase_order` | WRITE | Approve a PO (must be "to approve") |
| `reject_purchase_order` | WRITE | Reject/cancel a PO with optional reason |
| `search_sales_orders` | READ | Search/filter sales orders by state |
| `get_sales_order` | READ | Get full SO details by ID |
| `find_sales_order_by_name` | READ | Find SO by display name (e.g. "SO-3L-03055") |
| `confirm_sales_order` | WRITE | Confirm a draft/sent SO |
| `cancel_sales_order` | WRITE | Cancel an SO (by ID or name) |
| `search_invoices` | READ | Search invoices by state and type |
| `get_invoice` | READ | Get full invoice details by ID |
| `register_invoice_payment` | WRITE | Record payment against an invoice |
| `send_payment_reminder` | WRITE | Send friendly/formal/final reminder |
| `search_odoo_records` | READ | Search any Odoo model with domain filters |
| `get_odoo_record` | READ | Get any record from any model by ID |

### Email Tools (3)

| Tool | Type | Description |
|------|------|-------------|
| `search_emails` | READ | Search Outlook inbox |
| `send_email` | WRITE | Send a new email (to, subject, body, cc, bcc) |
| `reply_to_email` | WRITE | Reply to an existing email |

### Calendar Tools (2)

| Tool | Type | Description |
|------|------|-------------|
| `search_calendar_events` | READ | Get events in a date range |
| `create_calendar_event` | WRITE | Create a new calendar event |

### Task Tools (3)

| Tool | Type | Description |
|------|------|-------------|
| `search_tasks` | READ | List tasks with status/priority filters |
| `create_task` | WRITE | Create a new task with priority, due date, tags |
| `complete_task` | WRITE | Mark a task as completed |

### Report Tools (1)

| Tool | Type | Description |
|------|------|-------------|
| `generate_report` | READ | Generate a business report (sales_summary, invoice_aging, purchase_overview, revenue_by_customer, product_performance, accounts_receivable, master_report) with optional date range |

---

## API Reference

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, get AI response with tool calling |
| GET | `/api/chat` | Fetch chat history |
| DELETE | `/api/chat` | Clear chat history |

### Odoo

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/odoo/rfps` | List purchase orders |
| GET | `/api/odoo/rfps/:id` | Get purchase order details |
| POST | `/api/odoo/rfps/:id/action` | Approve/Reject purchase order |
| GET | `/api/odoo/sales` | List sales orders |
| GET/POST | `/api/odoo/sales/:id` | Get or action on sales order |
| GET | `/api/odoo/invoices` | List invoices |
| GET/POST | `/api/odoo/invoices/:id` | Get or action on invoice |
| POST | `/api/odoo/tools/execute` | Execute any Odoo tool by name |
| GET | `/api/odoo/actions` | View action audit log |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/generate` | Generate a report by type with optional date range |

### Email

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails` | Fetch emails from Outlook |
| GET | `/api/emails/:id` | Get single email |
| DELETE | `/api/emails/:id` | Delete email |
| POST | `/api/emails/:id/action` | Execute action (reply, etc.) |
| POST | `/api/emails/send` | Send new email |

### Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar` | List calendar events |
| GET | `/api/calendar/:id` | Get single event |
| POST | `/api/calendar` | Create calendar event |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task details |
| POST | `/api/tasks/:id` | Update task |

### Auth & Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/ensure-profile` | Create/update profile on login |
| POST | `/api/settings` | Save user settings |

---

## Database Schema

All tables use Supabase PostgreSQL with Row Level Security (RLS) enabled.

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles (extends auth.users) | `id`, `email`, `full_name`, `avatar_url`, `timezone` |
| `user_settings` | User preferences | `user_id`, `theme`, `notifications_email`, `notifications_push`, `notifications_desktop`, `email_connected`, `calendar_connected` |
| `chat_messages` | AI chat history | `user_id`, `role` (user/assistant/system), `content`, `metadata` |
| `tasks` | Task management | `user_id`, `title`, `description`, `status`, `priority`, `due_date`, `completed_at`, `tags` |
| `email_cache` | Cached email metadata + AI analysis | `user_id`, `email_id`, `provider`, `subject`, `sender_name`, `sender_email`, `ai_summary`, `ai_priority` |
| `calendar_cache` | Cached calendar events | `user_id`, `event_id`, `provider`, `subject`, `start_time`, `end_time`, `location`, `attendees` |

### Odoo Cache Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `odoo_rfp_cache` | Cached purchase orders | `user_id`, `odoo_id`, `name`, `vendor_name`, `state`, `amount_total`, `ai_summary`, `ai_priority` |
| `odoo_sales_cache` | Cached sales orders | `user_id`, `odoo_id`, `name`, `customer_name`, `state`, `invoice_status`, `amount_total` |
| `odoo_invoices_cache` | Cached invoices | `user_id`, `odoo_id`, `name`, `partner_name`, `state`, `payment_state`, `amount_total`, `amount_residual`, `is_overdue` |
| `odoo_action_logs` | Audit trail of tool executions | `user_id`, `tool_name`, `model_name`, `record_id`, `record_name`, `input_args`, `result`, `success`, `actor_email` |

### Migrations

```
supabase/migrations/
├── 20260226000001_initial_schema.sql              # Core tables + RLS + triggers
├── 20260226000002_odoo_cache_tables.sql           # Odoo cache + audit log
├── 20260301000001_add_actor_email_to_actions.sql  # Add actor_email column
├── 20260301000002_fix_chat_rls.sql                # Fix chat RLS policies
├── 20260301000003_fix_chat_messages_nullable.sql  # Make metadata nullable
├── 20260302000001_rename_mcp_actions_table.sql    # Rename to odoo_action_logs
├── 20260302000002_fix_profiles_for_microsoft_auth.sql  # Fix profiles for OAuth
└── 20260302000003_drop_profiles_auth_fk.sql       # Drop FK constraint for external auth
```

---

## Environment Variables

Create a `.env.local` file with:

```env
# ===== Supabase (Required) =====
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ===== AI Provider (Required) =====
AI_PROVIDER=anthropic                         # Primary provider
ANTHROPIC_API_KEY=sk-ant-api03-...            # Anthropic API key
ANTHROPIC_MODEL=claude-sonnet-4-20250514      # Claude model

# ===== Microsoft OAuth (Required for Email/Calendar) =====
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret    # Optional for SPA flow
MICROSOFT_TENANT_ID=common                    # "common" for multi-tenant
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback

# ===== Odoo ERP (Required for Odoo features) =====
ODOO_URL=https://your-odoo-instance.com       # Odoo instance URL
ODOO_DATABASE=your-database-name              # Odoo database name
ODOO_USERNAME=user@example.com                # Odoo login username
ODOO_PASSWORD=your-password                   # Odoo login password

# ===== App =====
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key               # Generate with: openssl rand -base64 32

# ===== Legacy (Not used) =====
# OPENAI_API_KEY=sk-proj-...
# OPENAI_MODEL=gpt-4o-mini
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** or **yarn**
- **Supabase** project ([supabase.com](https://supabase.com))
- **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))
- **Azure App Registration** (for Outlook/Calendar)
- **Odoo ERP instance** (for ERP features)

### 1. Clone and Install

```bash
git clone <repo-url>
cd ai-command-center
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see Environment Variables above).

### 3. Azure App Registration (for Email/Calendar)

1. Go to [Azure Portal](https://portal.azure.com) > **App Registrations** > **New registration**
2. Set redirect URI: `http://localhost:3000/auth/callback` (type: SPA)
3. Add API permissions:
   - `User.Read`
   - `Mail.Read`
   - `Mail.Send`
   - `Mail.ReadWrite`
   - `Calendars.Read`
   - `Calendars.ReadWrite`
4. Copy the **Application (client) ID** to `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`

### 4. Odoo Configuration

Ensure your Odoo user has access to:
- Purchase module (`purchase.order`)
- Sales module (`sale.order`)
- Invoicing module (`account.move`)
- Any additional modules you want to query via generic tools

### 5. Database Migrations

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

### Vercel

```bash
npm run build
```

Set all environment variables in Vercel project settings. Update `NEXT_PUBLIC_REDIRECT_URI` to your production URL.

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |
| `db:push` | `npx supabase db push` | Apply migrations to Supabase |
| `db:reset` | `npx supabase db reset` | Reset database (destructive) |
| `db:migrate` | `npx supabase migration new` | Create new migration file |
| `db:types` | `npx supabase gen types ...` | Generate TypeScript types from schema |
| `supabase:setup` | `./scripts/setup-supabase.sh` | Run Supabase setup script |

---

## Documentation

- [Odoo Integration Guide](docs/ODOO_INTEGRATION.md) — Architecture, tool definitions, API endpoints, troubleshooting
- [Changelog](CHANGELOG.md) — Development history
- [AI Features Status](AI_FEATURES_TODO.md) — Feature implementation tracker
