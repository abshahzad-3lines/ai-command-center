# Odoo MCP Integration Guide

This document explains how to fully integrate Odoo ERP with the AI Command Center dashboard using the Model Context Protocol (MCP).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [What's Already Set Up](#whats-already-set-up)
4. [Odoo Configuration Required](#odoo-configuration-required)
5. [MCP Server Setup](#mcp-server-setup)
6. [Using the Dashboard Components](#using-the-dashboard-components)
7. [Testing the Integration](#testing-the-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Odoo MCP integration enables:

- **Dashboard Cards**: View Purchase Orders, Sales Orders, and Invoices with AI-powered summaries and suggested actions
- **AI Actions**: Claude can directly execute actions in Odoo (approve, reject, confirm, etc.)
- **Real-time Data**: Fetch and display live data from your Odoo ERP

### Two Integration Methods

| Method | Use Case | Status |
|--------|----------|--------|
| **Direct API** | Dashboard displays data | ✅ Working |
| **MCP Protocol** | Claude executes actions | ⚠️ Requires Odoo config |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Command Center                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ OdooRfpCard │  │OdooSalesCard│  │   OdooInvoicesCard      │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │                                      │
│                 ┌────────▼────────┐                            │
│                 │  React Query    │                            │
│                 │  Hooks          │                            │
│                 └────────┬────────┘                            │
│                          │                                      │
│                 ┌────────▼────────┐                            │
│                 │   API Routes    │                            │
│                 │ /api/odoo/*     │                            │
│                 └────────┬────────┘                            │
│                          │                                      │
│                 ┌────────▼────────┐                            │
│                 │  OdooService    │◄──── AI Analysis (OpenAI)  │
│                 └────────┬────────┘                            │
│                          │                                      │
│                 ┌────────▼────────┐                            │
│                 │  OdooAdapter    │                            │
│                 │  (JSON-RPC)     │                            │
│                 └────────┬────────┘                            │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Odoo ERP Server                             │
│         https://three-lines-stage5-28645903.dev.odoo.com         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ XML-RPC API  │  │  MCP Module  │  │  Models              │   │
│  │ /xmlrpc/2/*  │  │  (Optional)  │  │  - purchase.order    │   │
│  └──────────────┘  └──────────────┘  │  - sale.order        │   │
│                                       │  - account.move      │   │
│                                       │  - res.partner       │   │
│                                       └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                    MCP Server (Optional)                         │
│           /Users/3lines/Desktop/odoo-mcp-server                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  mcp-server-odoo (Python)                                │   │
│  │  - Provides MCP tools for Claude                         │   │
│  │  - Requires Odoo MCP module permissions                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## What's Already Set Up

### 1. Credentials (Stored)

| Field | Value |
|-------|-------|
| **URL** | https://three-lines-stage5-28645903.dev.odoo.com |
| **Database** | three-lines-stage5-28645903 |
| **API Key** | db18cc1774d0c01fd9dc119082c5caac60bcfb9f |
| **Email** | ab.shahzad@3lines.com.sa |
| **Password** | kingdom123 |

### 2. Files Created

```
ai-command-center/
├── .env.local                          # Odoo credentials
├── types/odoo.ts                       # TypeScript types
├── lib/
│   ├── adapters/odoo/
│   │   ├── index.ts                    # Factory exports
│   │   ├── types.ts                    # Adapter interfaces
│   │   ├── mcp-client.ts               # JSON-RPC client
│   │   └── odoo.adapter.ts             # Main adapter
│   └── services/
│       └── odoo.service.ts             # Business logic + AI
├── hooks/
│   ├── useOdooRfps.ts                  # Purchase orders hook
│   ├── useOdooSales.ts                 # Sales orders hook
│   ├── useOdooInvoices.ts              # Invoices hook
│   └── useOdooMcp.ts                   # MCP tool execution
├── components/modules/odoo/
│   ├── index.ts                        # Exports
│   ├── OdooRfpCard.tsx                 # Purchase orders card
│   ├── OdooRfpItem.tsx                 # Single RFP item
│   ├── OdooSalesCard.tsx               # Sales orders card
│   ├── OdooSalesItem.tsx               # Single order item
│   ├── OdooInvoicesCard.tsx            # Invoices card
│   └── OdooInvoiceItem.tsx             # Single invoice item
├── app/api/odoo/
│   ├── rfps/
│   │   ├── route.ts                    # GET /api/odoo/rfps
│   │   └── [id]/
│   │       ├── route.ts                # GET /api/odoo/rfps/:id
│   │       └── action/route.ts         # POST approve/reject
│   ├── sales/
│   │   ├── route.ts                    # GET /api/odoo/sales
│   │   └── [id]/route.ts               # GET/POST sales/:id
│   ├── invoices/
│   │   ├── route.ts                    # GET /api/odoo/invoices
│   │   └── [id]/route.ts               # GET/POST invoices/:id
│   └── mcp/execute/route.ts            # POST MCP tool execution
└── supabase/migrations/
    └── 20260226000002_odoo_cache_tables.sql  # Cache tables

odoo-mcp-server/                        # Separate MCP server
├── venv/                               # Python virtual environment
├── .env                                # Odoo credentials
└── README.md                           # Setup instructions
```

### 3. Database Tables (Supabase)

```sql
-- Cache tables for Odoo data
odoo_rfp_cache          -- Purchase orders cache
odoo_sales_cache        -- Sales orders cache
odoo_invoices_cache     -- Invoices cache
odoo_mcp_actions        -- MCP action audit log
```

### 4. MCP Server Configuration

Added to `~/.claude.json`:

```json
{
  "mcpServers": {
    "odoo": {
      "type": "stdio",
      "command": "/Users/3lines/Desktop/odoo-mcp-server/venv/bin/python",
      "args": ["-m", "mcp_server_odoo"],
      "env": {
        "ODOO_URL": "https://three-lines-stage5-28645903.dev.odoo.com",
        "ODOO_DB": "three-lines-stage5-28645903",
        "ODOO_API_KEY": "db18cc1774d0c01fd9dc119082c5caac60bcfb9f"
      }
    }
  }
}
```

---

## Odoo Configuration Required

### The Problem

Your Odoo instance has an **MCP module installed** that blocks MCP protocol requests by default:

```
Access denied by MCP for model 'purchase.order' method 'search_read'
```

### Solution: Configure MCP Permissions in Odoo

#### Step 1: Log into Odoo

1. Go to: https://three-lines-stage5-28645903.dev.odoo.com
2. Login:
   - Email: `ab.shahzad@3lines.com.sa`
   - Password: `kingdom123`

#### Step 2: Enable Developer Mode

1. Go to **Settings** (gear icon in top menu)
2. Scroll to the bottom
3. Click **Activate the developer mode**
   - Or press `Ctrl + Alt + D`

#### Step 3: Find MCP Configuration

Look for MCP settings in one of these locations:

- **Settings** → **Technical** → **MCP** or **MCP Server**
- **Settings** → **Technical** → **MCP Configuration**
- Search "MCP" in the global search bar

#### Step 4: Add Model Permissions

Add full access for these models:

| Model Name | Technical Name | Operations |
|------------|----------------|------------|
| Purchase Orders | `purchase.order` | read, write, create |
| Sales Orders | `sale.order` | read, write, create |
| Invoices | `account.move` | read, write, create |
| Contacts | `res.partner` | read |
| Products | `product.product` | read |
| Product Templates | `product.template` | read |

#### Step 5: Configure API Key Permissions

Ensure your API key has access to the MCP module:

1. Go to **Settings** → **Users & Companies** → **Users**
2. Find user: `ab.shahzad@3lines.com.sa`
3. Check that MCP access is enabled

#### Step 6: Save and Restart

1. Save all configuration changes
2. The MCP server should now work

---

## MCP Server Setup

### Location

```
/Users/3lines/Desktop/odoo-mcp-server/
```

### Manual Start

```bash
cd /Users/3lines/Desktop/odoo-mcp-server
source venv/bin/activate
mcp-server-odoo
```

### Test Connection

```bash
cd /Users/3lines/Desktop/odoo-mcp-server
source venv/bin/activate
python -c "
from mcp_server_odoo import create_connection, load_config
config = load_config()
with create_connection(config) as conn:
    conn.authenticate()
    print(f'Connected as user ID: {conn.uid}')
    # Test read
    result = conn.search_read('res.partner', [], ['name'], limit=1)
    print(f'Test read: {result}')
"
```

### Available MCP Tools (After Odoo Config)

| Tool | Description |
|------|-------------|
| `mcp__odoo__search_records` | Search any Odoo model |
| `mcp__odoo__read_records` | Read records by ID |
| `mcp__odoo__create_record` | Create new records |
| `mcp__odoo__update_record` | Update existing records |
| `mcp__odoo__delete_record` | Delete records |
| `mcp__odoo__list_models` | List available models |
| `mcp__odoo__get_model_fields` | Get fields for a model |

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

function Dashboard() {
  const { rfps, isLoading, approveRfp, rejectRfp } = useOdooRfps();
  const { orders, confirmOrder, cancelOrder } = useOdooSales();
  const { invoices, registerPayment, sendReminder } = useOdooInvoices();

  return (
    <div className="grid grid-cols-3 gap-4">
      <OdooRfpCard
        rfps={rfps}
        isLoading={isLoading}
        onRefresh={() => {}}
        onApprove={approveRfp}
        onReject={rejectRfp}
      />
      <OdooSalesCard
        orders={orders}
        onConfirm={confirmOrder}
        onCancel={cancelOrder}
        // ...
      />
      <OdooInvoicesCard
        invoices={invoices}
        onRegisterPayment={registerPayment}
        onSendReminder={sendReminder}
        // ...
      />
    </div>
  );
}
```

### Example Dashboard Integration

```tsx
// app/page.tsx or app/dashboard/page.tsx
'use client';

import { OdooRfpCard, OdooSalesCard, OdooInvoicesCard } from '@/components/modules/odoo';
import { useOdooRfps } from '@/hooks/useOdooRfps';
import { useOdooSales } from '@/hooks/useOdooSales';
import { useOdooInvoices } from '@/hooks/useOdooInvoices';

export default function Dashboard() {
  const rfps = useOdooRfps({ limit: 10 });
  const sales = useOdooSales({ limit: 10 });
  const invoices = useOdooInvoices({ limit: 10 });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI Command Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Requests */}
        <OdooRfpCard
          rfps={rfps.rfps}
          isLoading={rfps.isLoading}
          error={rfps.error}
          onRefresh={rfps.refetch}
          onApprove={rfps.approveRfp}
          onReject={rfps.rejectRfp}
        />

        {/* Sales Orders */}
        <OdooSalesCard
          orders={sales.orders}
          isLoading={sales.isLoading}
          error={sales.error}
          onRefresh={sales.refetch}
          onConfirm={sales.confirmOrder}
          onCancel={sales.cancelOrder}
        />

        {/* Invoices */}
        <OdooInvoicesCard
          invoices={invoices.invoices}
          isLoading={invoices.isLoading}
          error={invoices.error}
          onRefresh={invoices.refetch}
          onRegisterPayment={invoices.registerPayment}
          onSendReminder={invoices.sendReminder}
        />
      </div>
    </div>
  );
}
```

---

## Testing the Integration

### 1. Test Direct API (Works Now)

```bash
cd /Users/3lines/Desktop/ai-command-center
npm run dev
```

Then visit: http://localhost:3000/api/odoo/rfps

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1234,
      "name": "PO-3L-03486",
      "vendor": "Kontron Hartmann-Wiener GmbH",
      "amount": 2240.0,
      "state": "draft",
      "aiPriority": "medium",
      "aiSuggestedAction": { "type": "approve", "label": "Approve" }
    }
  ]
}
```

### 2. Test MCP Server (After Odoo Config)

Restart Claude Code, then ask:

> "Show me all pending purchase orders from Odoo"

Claude should use `mcp__odoo__search_records` tool.

### 3. Verify Data in Odoo

Current data in your Odoo instance:

| Type | Count | Example |
|------|-------|---------|
| Purchase Orders | 5+ | PO-3L-03486: SAR 2,240 (draft) |
| Sales Orders | 5+ | SO-3L-03055: SAR 115 (sale) |
| Invoices | 5+ | Mix of paid/unpaid |

---

## Troubleshooting

### Error: "Odoo is not configured"

**Solution**: Check `.env.local` has all values:
```env
ODOO_URL=https://three-lines-stage5-28645903.dev.odoo.com
ODOO_DATABASE=three-lines-stage5-28645903
ODOO_API_KEY=db18cc1774d0c01fd9dc119082c5caac60bcfb9f
```

### Error: "SSL Certificate Verify Failed"

**Solution**: Install Python certificates:
```bash
/Applications/Python\ 3.14/Install\ Certificates.command
```

### Error: "Access denied by MCP"

**Cause**: Odoo's MCP module is blocking requests.

**Solution**: Configure MCP permissions in Odoo (see [Odoo Configuration Required](#odoo-configuration-required))

### Error: "Authentication failed"

**Check**:
1. API key is valid (regenerate in Odoo if needed)
2. User has correct permissions
3. Database name matches

### MCP Tools Not Appearing in Claude

**Solution**:
1. Verify `~/.claude.json` has odoo server config
2. Restart Claude Code completely
3. Check MCP server can start: `cd /Users/3lines/Desktop/odoo-mcp-server && source venv/bin/activate && mcp-server-odoo --help`

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/odoo/rfps` | GET | List purchase orders |
| `/api/odoo/rfps/:id` | GET | Get single PO |
| `/api/odoo/rfps/:id/action` | POST | Approve/Reject PO |
| `/api/odoo/sales` | GET | List sales orders |
| `/api/odoo/sales/:id` | GET/POST | Get or action on SO |
| `/api/odoo/invoices` | GET | List invoices |
| `/api/odoo/invoices/:id` | GET/POST | Get or action on invoice |
| `/api/odoo/mcp/execute` | POST | Execute any MCP tool |

### React Query Keys

| Key | Description |
|-----|-------------|
| `['odoo-rfps', limit]` | Purchase orders list |
| `['odoo-rfp', id]` | Single purchase order |
| `['odoo-sales', limit]` | Sales orders list |
| `['odoo-sales-order', id]` | Single sales order |
| `['odoo-invoices', limit]` | Invoices list |
| `['odoo-invoice', id]` | Single invoice |

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `odoo_rfp_cache` | Cached purchase orders |
| `odoo_sales_cache` | Cached sales orders |
| `odoo_invoices_cache` | Cached invoices |
| `odoo_mcp_actions` | MCP action audit log |

---

## Next Steps

1. **Configure Odoo MCP Module** - Enable permissions for the required models
2. **Add to Dashboard** - Import and use the Odoo components in your main dashboard
3. **Test AI Actions** - Ask Claude to perform actions like "Approve PO-3L-03486"
4. **Monitor** - Check `odoo_mcp_actions` table for action history

---

*Last updated: February 26, 2026*
