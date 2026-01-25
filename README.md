# KEWA Renovation Operations System

Property renovation management for KEWA AG. Provides complete transparency and control over all renovations with standardized workflows, contractor integration, cost tracking, and automated condition history.

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Deployment Guide](#deployment-guide)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Quick Start

For local development:

```bash
# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Features

- **Property Management**: Multi-property administration with buildings and units
- **Renovation Projects**: Template-based project creation with WBS structure
- **Contractor Portal**: External work order assignment with magic link access
- **Cost Module**: Invoice and expense tracking with budget monitoring
- **Digital Twin**: Room-level condition tracking with history timeline
- **Admin Dashboard**: Overview counters, alerts, and quick actions

## Deployment Guide

### Prerequisites

- Supabase account ([supabase.com](https://supabase.com))
- Vercel account ([vercel.com](https://vercel.com))
- Node.js 20+
- Git

### 1. Supabase Setup

#### Create Project

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Set project name: `kewa-renovation`
4. Set database password (save securely)
5. Choose region closest to users (e.g., Frankfurt for Switzerland)
6. Wait for provisioning (~2 minutes)

#### Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push
```

#### Seed Demo Data (Optional)

For development/testing with realistic Swiss data:

```bash
supabase db execute -f supabase/seed_demo_data.sql
```

This creates:
- 5 properties in Zurich and Bern
- 16 buildings
- 22 partners (contractors and suppliers)
- 12 projects with varied statuses
- 5 renovation templates

### 2. Vercel Deployment

#### Connect Repository

1. Log in to [Vercel](https://vercel.com)
2. Click "Add New" -> "Project"
3. Import your Git repository
4. Configure environment variables (see table below)
5. Deploy

#### Vercel Settings

- Framework Preset: Next.js
- Root Directory: ./
- Build Command: `npm run build`
- Output Directory: .next

### 3. Environment Variables

Configure these in Vercel Dashboard -> Settings -> Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (SECRET) |
| `SESSION_SECRET` | Yes | Random 32+ character string |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployed URL (e.g., https://kewa.vercel.app) |

### 4. First-Run Checklist

After deployment:

- [ ] Verify login page loads at your URL
- [ ] Test PIN login (default: see Supabase users table)
- [ ] Complete setup wizard (creates initial property, building, partner)
- [ ] Navigate to Admin Dashboard (/admin)
- [ ] Create a test renovation project
- [ ] Verify dashboard counts update

## Development

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Create production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utilities and API clients
├── hooks/            # Custom React hooks
├── contexts/         # React context providers
└── types/            # TypeScript type definitions

supabase/
├── migrations/       # Database migrations
├── seed_demo_data.sql # Demo data script
└── MIGRATIONS.md     # Migration documentation
```

## Troubleshooting

### "Invalid JWT" errors

- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check if API keys were rotated in Supabase Dashboard
- Ensure key hasn't expired

### Storage uploads fail

- Verify buckets exist: `task-photos`, `task-audio`
- Check RLS policies are applied (migration 015)
- Verify storage permissions in Supabase Dashboard

### Build fails

- Verify Node.js version is 20+
- Check all required environment variables are set
- Review Vercel build logs for specific errors
- Try `npm ci` instead of `npm install`

### Login not working

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check browser network tab for API errors
- Verify user exists in Supabase Auth / users table
- Check `SESSION_SECRET` is set

### Setup wizard doesn't appear

- Clear browser localStorage
- Verify property count is 0 in database
- Check browser console for errors

## Supabase-Vercel Integration

For automatic environment variable sync:

1. In Vercel Dashboard -> Integrations
2. Search "Supabase"
3. Connect and authorize
4. Select your Supabase project
5. Choose which variables to sync

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## License

Proprietary - KEWA AG
