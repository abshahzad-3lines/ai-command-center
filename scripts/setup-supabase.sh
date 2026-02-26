#!/bin/bash

# AI Command Center - Supabase Setup Script
# This script helps you set up Supabase for the project

set -e

echo "=========================================="
echo "AI Command Center - Supabase Setup"
echo "=========================================="
echo ""

# Check if supabase CLI is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "Please update .env.local with your Supabase credentials"
fi

echo "Step 1: Login to Supabase"
echo "-------------------------"
npx supabase login

echo ""
echo "Step 2: Link to your project"
echo "----------------------------"
read -p "Enter your Supabase project ref (from dashboard URL): " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "Error: Project ref is required"
    exit 1
fi

npx supabase link --project-ref "$PROJECT_REF"

echo ""
echo "Step 3: Apply migrations"
echo "------------------------"
echo "This will create all database tables..."
npx supabase db push

echo ""
echo "Step 4: Generate TypeScript types"
echo "----------------------------------"
npx supabase gen types typescript --linked > types/database.ts

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Don't forget to update your .env.local with:"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "You can find these in your Supabase dashboard:"
echo "Settings > API"
echo ""
