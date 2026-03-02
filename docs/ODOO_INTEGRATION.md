# Odoo ERP Integration Guide

This document explains how the AI Command Center integrates with Odoo ERP using direct JSON-RPC over HTTP.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Configuration](#configuration)
5. [AI Tool Definitions](#ai-tool-definitions)
6. [Using the Dashboard Components](#using-the-dashboard-components)
7. [API Endpoints](#api-endpoints)
8. [Database Tables](#database-tables)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Odoo integration connects to Odoo ERP via **JSON-RPC** (HTTP POST to `/jsonrpc`) using username/password authentication. It provides:

- **Dashboard Cards** - View Purchase Orders, Sales Orders, and Invoices with AI-powered summaries
- **AI Chat Actions** - Claude can search, view, approve, reject, confirm, and manage Odoo records through natural language
- **Generic Queries** - AI can query any Odoo model (contacts, products, etc.) via `search_odoo_records` and `get_odoo_record`
- **Audit Trail** - All Odoo actions are logged to the `odoo_action_logs` table in Supabase

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     AI Command Center                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ OdooRfpCard │  │OdooSalesCard │  │ OdooInvoicesCard   │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘  │
│         │                │                    │               │
│         └────────────────┼────────────────────┘               │
│                          │                                    │
│                 ┌────────▼────────┐                           │
│                 │  React Hooks    │  useOdooRfps, etc.        │
│                 └────────┬────────┘                           │
│                          │                                    │
│  ┌───────────────────────┼────────────────────────────────┐  │
│  │                API Routes  /api/odoo/*                  │  │
│  │  rfps/ | sales/ | invoices/ | tools/execute | actions   │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────┼────────────────────────────────┐  │
│  │              AI Chat Pipeline                           │  │
│  │  chat route → Claude (Anthropic) → tool-executor        │  │
│  │                          ↓                              │  │
│  │              OdooService (lib/odoo/)                     │  │
│  │                          ↓                              │  │
│  │          OdooAdapterImpl (lib/adapters/odoo/)           │  │
│  │                          ↓                              │  │
│  │          OdooJsonRpcClient → HTTP POST /jsonrpc         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │  JSON-RPC over HTTPS
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      Odoo ERP Server                          │
│                                                               │
│  ┌──────────────┐    ┌───────────────────────────────────┐   │
│  │ JSON-RPC API │    │  Models                           │   │
│  │  /jsonrpc    │    │  - purchase.order                 │   │
│  └──────────────┘    │  - sale.order                     │   │
│                       │  - account.move                   │   │
│                       │  - res.partner (+ any model)      │   │
│                       └───────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Call Chain (AI Chat)

```
User message → /api/chat (route.ts)
  → ClaudeAdapter.chatWithTools() sends tools + system prompt to Anthropic
  → Claude decides which tool to call
  → tool-executor.ts dispatches to OdooService
  → OdooService → OdooAdapterImpl → OdooJsonRpcClient
  → HTTP POST to Odoo /jsonrpc endpoint
  → Result returned to Claude → formatted response to user
  → Loop up to 5 iterations for multi-step tasks
```

---

## Project Structure

```
ai-command-center/
├── types/
│   ├── odoo.ts                        # Odoo TypeScript types (OdooToolDefinition, OdooToolResult, etc.)
│   └── database.ts                    # Supabase table types (odoo_action_logs, etc.)
├── lib/
│   ├── adapters/odoo/
│   │   ├── index.ts                   # Factory exports
│   │   ├── types.ts                   # OdooAdapter interface + transform helpers
│   │   ├── jsonrpc-client.ts          # OdooJsonRpcClient - low-level JSON-RPC HTTP client
│   │   └── odoo.adapter.ts            # OdooAdapterImpl - business logic adapter
│   ├── odoo/
│   │   ├── index.ts                   # Exports
│   │   ├── odoo.service.ts            # OdooService - high-level service (searchRecords, getRecord, etc.)
│   │   └── tools.ts                   # AI tool definitions (15 tools with detailed descriptions)
│   ├── ai/
│   │   └── tool-executor.ts           # Maps AI tool calls → OdooService methods
│   └── services/
│       ├── odoo.service.ts            # Legacy service (dashboard API routes)
│       ├── odoo-action-log.service.ts # Audit trail logging to Supabase
│       └── chat.service.ts            # Chat service (message persistence)
├── hooks/
│   ├── useOdooRfps.ts                 # Purchase orders React hook
│   ├── useOdooSales.ts                # Sales orders React hook
│   ├── useOdooInvoices.ts             # Invoices React hook
│   └── useOdooTools.ts                # Generic Odoo tool execution hook
├── components/modules/odoo/
│   ├── index.ts                       # Component exports
│   ├── OdooRfpCard.tsx                # Purchase orders dashboard card
│   ├── OdooRfpItem.tsx                # Single RFP item
│   ├── OdooSalesCard.tsx              # Sales orders dashboard card
│   ├── OdooSalesItem.tsx              # Single order item
│   ├── OdooInvoicesCard.tsx           # Invoices dashboard card
│   └── OdooInvoiceItem.tsx            # Single invoice item
├── app/api/odoo/
│   ├── rfps/
│   │   ├── route.ts                   # GET /api/odoo/rfps
│   │   └── [id]/
│   │       ├── route.ts               # GET /api/odoo/rfps/:id
│   │       └── action/route.ts        # POST approve/reject
│   ├── sales/
│   │   ├── route.ts                   # GET /api/odoo/sales
│   │   └── [id]/route.ts             # GET/POST sales/:id
│   ├── invoices/
│   │   ├── route.ts                   # GET /api/odoo/invoices
│   │   └── [id]/route.ts             # GET/POST invoices/:id
│   ├── tools/execute/route.ts         # POST /api/odoo/tools/execute
│   └── actions/route.ts               # GET /api/odoo/actions (audit log)
├── app/chat/page.tsx                  # AI chat interface
└── supabase/migrations/
    ├── 20260226000001_initial_schema.sql
    ├── 20260226000002_odoo_cache_tables.sql
    ├── 20260301000001_add_actor_email_to_actions.sql
    ├── 20260301000002_fix_chat_rls.sql
    ├── 20260301000003_fix_chat_messages_nullable.sql
    └── 20260302000001_rename_mcp_actions_table.sql
```

---

## Configuration

### Environment Variables

Add these to `.env.local`:

```env
# Odoo ERP connection
ODOO_URL=https://your-odoo-instance.com
ODOO_DATABASE=your-database-name
ODOO_USERNAME=your-username@example.com
ODOO_PASSWORD=your-password

# AI Provider (used for chat tool calling)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### Authentication

The integration uses **username/password authentication** via JSON-RPC:

1. Authenticates via `common.login` to get a user ID (uid)
2. Uses the uid + password for subsequent `object.execute_kw` calls
3. No API key required - just Odoo user credentials

---

## AI Tool Definitions

The AI has access to **15 tools** defined in `lib/odoo/tools.ts`. Each tool has detailed descriptions optimized for smaller AI models.

### Domain-Specific Tools (13)

| Tool | Description |
|------|-------------|
| `search_purchase_orders` | Search/filter purchase orders by state |
| `get_purchase_order` | Get full details of a PO by ID |
| `approve_purchase_order` | Approve a PO (must be in "to approve" state) |
| `reject_purchase_order` | Reject a PO with optional reason |
| `search_sales_orders` | Search/filter sales orders by state |
| `get_sales_order` | Get full details of an SO by ID |
| `find_sales_order_by_name` | Find an SO by its display name (e.g. "SO-3L-03055") |
| `confirm_sales_order` | Confirm an SO (must be in "draft" or "sent" state) |
| `cancel_sales_order` | Cancel an SO |
| `search_invoices` | Search/filter invoices by state and type |
| `get_invoice` | Get full details of an invoice by ID |
| `register_invoice_payment` | Record a payment against an invoice |
| `send_payment_reminder` | Send a payment reminder (friendly/formal/final_notice) |

### Generic Tools (2)

| Tool | Description |
|------|-------------|
| `search_odoo_records` | Search any Odoo model with custom domain filters and fields |
| `get_odoo_record` | Get a single record from any Odoo model by ID |

The generic tools allow the AI to query models beyond purchase orders, sales orders, and invoices (e.g. `res.partner`, `product.product`, `hr.employee`).

---

## Using the Dashboard Components

### Import Components

```tsx
import {
  OdooRfpCard,
  OdooSalesCard,
  OdooInvoicesCard
} from '@/components/modules/odoo';
```

### Use Hooks

```tsx
import { useOdooRfps } from '@/hooks/useOdooRfps';
import { useOdooSales } from '@/hooks/useOdooSales';
import { useOdooInvoices } from '@/hooks/useOdooInvoices';
import { useOdooTools } from '@/hooks/useOdooTools';
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/odoo/rfps` | GET | List purchase orders |
| `/api/odoo/rfps/:id` | GET | Get single purchase order |
| `/api/odoo/rfps/:id/action` | POST | Approve/Reject purchase order |
| `/api/odoo/sales` | GET | List sales orders |
| `/api/odoo/sales/:id` | GET/POST | Get or action on sales order |
| `/api/odoo/invoices` | GET | List invoices |
| `/api/odoo/invoices/:id` | GET/POST | Get or action on invoice |
| `/api/odoo/tools/execute` | POST | Execute any Odoo tool by name |
| `/api/odoo/actions` | GET | View action audit log |
| `/api/chat` | POST | AI chat with tool calling |

---

## Database Tables

All tables are in Supabase with RLS enabled.

| Table | Purpose |
|-------|---------|
| `odoo_rfp_cache` | Cached purchase orders for dashboard |
| `odoo_sales_cache` | Cached sales orders for dashboard |
| `odoo_invoices_cache` | Cached invoices for dashboard |
| `odoo_action_logs` | Audit trail of all Odoo actions performed |
| `chat_conversations` | Chat conversation history |
| `chat_messages` | Individual chat messages |

---

## Testing

### Test the API

```bash
npm run dev
```

Then visit: `http://localhost:3000/api/odoo/rfps`

### Test AI Chat

Navigate to `http://localhost:3000/chat` and try:

- "Show me all pending purchase orders"
- "Get details of sales order SO-3L-03055"
- "Search for contacts named 3lines"
- "List all draft invoices"

### Test Tool Execution

```bash
curl -X POST http://localhost:3000/api/odoo/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"toolName": "search_purchase_orders", "args": {"limit": 5}}'
```

---

## Troubleshooting

### Error: "Odoo is not configured"

Check `.env.local` has all four Odoo variables set:
```env
ODOO_URL=...
ODOO_DATABASE=...
ODOO_USERNAME=...
ODOO_PASSWORD=...
```

### Error: "Authentication failed"

1. Verify username and password are correct
2. Check the database name matches your Odoo instance
3. Ensure the user has appropriate Odoo permissions

### Error: "Access Denied" on specific models

The Odoo user needs proper access rights for the models being queried. Check the user's security groups in Odoo under **Settings > Users & Companies > Users**.

### AI not using the right tool

The tool definitions include trigger phrases and negative guidance. If a smaller model picks the wrong tool, check `lib/odoo/tools.ts` and adjust the `description` field.

---

*Last updated: March 2, 2026*
