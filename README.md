# AI Command Center

A Next.js dashboard that integrates AI (Claude/OpenAI) with Odoo ERP, Microsoft 365 (Outlook, Calendar), and task management. Provides a unified interface for managing business operations through natural language chat and dashboard cards.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Database**: Supabase (PostgreSQL + RLS)
- **AI**: Anthropic Claude (primary), OpenAI (fallback)
- **ERP**: Odoo via JSON-RPC
- **Email/Calendar**: Microsoft Graph API
- **Styling**: Tailwind CSS + shadcn/ui

## Features

- **AI Chat** - Natural language interface to query and manage Odoo ERP records (purchase orders, sales orders, invoices, and any Odoo model)
- **Dashboard** - Cards for Purchase Orders, Sales Orders, and Invoices with AI-powered summaries
- **Email** - Microsoft Outlook integration for reading and managing emails
- **Calendar** - Microsoft Calendar integration
- **Task Management** - Built-in task tracking
- **Audit Trail** - All Odoo actions logged to `odoo_action_logs` for accountability

## Project Structure

```
app/                        # Next.js App Router pages and API routes
  api/
    chat/                   # AI chat endpoint (Claude tool calling)
    odoo/                   # Odoo REST API routes
      rfps/                 # Purchase orders
      sales/                # Sales orders
      invoices/             # Invoices
      tools/execute/        # Generic tool execution
      actions/              # Action audit log
    emails/                 # Email API routes
    calendar/               # Calendar API routes
  chat/                     # Chat page
  odoo/                     # Odoo dashboard page
  email/                    # Email page
  calendar/                 # Calendar page
  settings/                 # Settings page

lib/
  adapters/
    ai/                     # AI provider adapters (Claude, OpenAI)
    odoo/                   # Odoo JSON-RPC adapter
      jsonrpc-client.ts     # Low-level HTTP client
      odoo.adapter.ts       # Business logic adapter
      types.ts              # Interface definitions
    email/                  # Email adapter
    calendar/               # Calendar adapter
  odoo/
    tools.ts                # 15 AI tool definitions for Odoo
    odoo.service.ts         # High-level Odoo service
  ai/
    tool-executor.ts        # Maps AI tool calls to service methods
  services/                 # Business services

hooks/                      # React hooks for data fetching
components/                 # UI components
types/                      # TypeScript type definitions
supabase/migrations/        # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Odoo ERP instance
- Anthropic API key

### Setup

1. Clone and install:
```bash
git clone <repo-url>
cd ai-command-center
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# AI
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Odoo
ODOO_URL=https://your-odoo-instance.com
ODOO_DATABASE=your-database
ODOO_USERNAME=your-user@example.com
ODOO_PASSWORD=your-password
```

3. Apply database migrations:
```bash
npx supabase db push
```

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

- [Odoo Integration Guide](docs/ODOO_INTEGRATION.md) - Detailed architecture, tool definitions, API endpoints, and troubleshooting
