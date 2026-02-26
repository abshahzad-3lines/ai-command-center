# Supabase Database Setup

This folder contains all database migrations and configuration for the AI Command Center.

## Quick Setup (New Project)

Run these commands to set up a new Supabase project:

```bash
# 1. Login to Supabase CLI
npx supabase login

# 2. Link to your project (get project ref from dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF)
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Apply all migrations (creates all tables)
npx supabase db push

# 4. Generate TypeScript types
npm run db:types
```

## Detailed Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project ref from the URL (e.g., `alpjjfqpikxzbhasyejs`)
4. Go to Settings > API to get your credentials

### 2. Set Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Link Your Project

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project (get project ref from dashboard URL)
npx supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Apply Migrations

```bash
# Push all migrations to your database
npx supabase db push

# Or use npm script
npm run db:push
```

### 5. Generate TypeScript Types

```bash
npm run db:types
```

## Migration Files

| File | Description |
|------|-------------|
| `20260226000001_initial_schema.sql` | Core tables: profiles, user_settings, chat_messages, tasks, email_cache, calendar_cache |

## Database Schema

### Tables

- **profiles** - User profiles (extends auth.users)
- **user_settings** - User preferences (theme, notifications, connections)
- **chat_messages** - AI chat conversation history
- **tasks** - User tasks/todos
- **email_cache** - Cached email metadata + AI analysis
- **calendar_cache** - Cached calendar events

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data.

## Common Commands

```bash
# Check migration status
npx supabase migration list

# Create a new migration
npx supabase migration new my_migration_name

# Reset database (WARNING: deletes all data)
npx supabase db reset

# Generate TypeScript types
npx supabase gen types typescript --local > types/database.ts

# Start local Supabase (for development)
npx supabase start

# Stop local Supabase
npx supabase stop
```

## Switching Supabase Projects

To migrate to a new Supabase project:

1. Create new project at supabase.com
2. Update `.env.local` with new credentials
3. Link to new project: `npx supabase link --project-ref NEW_PROJECT_REF`
4. Apply migrations: `npx supabase db push`

Your data won't transfer automatically - only the schema. Export/import data separately if needed.

## Local Development

You can run Supabase locally with Docker:

```bash
# Start local Supabase
npx supabase start

# This gives you:
# - Local Postgres database
# - Local Auth server
# - Local Storage
# - Studio UI at http://localhost:54323
```
