# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- TypeScript 5.x - All source code (`src/`)
- SQL (PostgreSQL) - Database migrations (`supabase/migrations/`)

**Secondary:**
- CSS (via Tailwind) - Styling (`src/app/globals.css`)

## Runtime

**Environment:**
- Node.js (version not pinned, modern LTS assumed)
- Next.js 16.1.2 server runtime

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.2 - Full-stack React framework with App Router
- React 19.2.3 - UI library (latest version)
- React DOM 19.2.3 - DOM rendering

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS integration

**Testing:**
- Not configured (no test framework in package.json)

**Build/Dev:**
- Turbopack - Fast bundler (configured in `next.config.ts`)
- TypeScript 5.x - Type checking
- ESLint 9.x - Linting with Next.js config
- Babel React Compiler 1.0.0 - Experimental React compiler

## Key Dependencies

**Critical:**
- `@supabase/ssr` ^0.8.0 - Server-side Supabase client for Next.js
- `@supabase/supabase-js` ^2.90.1 - Supabase JavaScript client
- `jose` ^6.1.3 - JWT signing/verification (Edge-compatible)
- `bcryptjs` ^3.0.3 - Password hashing

**UI Components:**
- `lucide-react` ^0.562.0 - Icon library
- `clsx` ^2.1.1 - Conditional class names
- `tailwind-merge` ^3.4.0 - Tailwind class merging

**Data/Utilities:**
- `date-fns` ^4.1.0 - Date manipulation
- `papaparse` ^5.5.3 - CSV parsing (for exports)

**PDF Generation:**
- `@react-pdf/renderer` ^4.3.2 - Server-side PDF generation

## Configuration

**Environment:**
- Configuration via `.env.local` (gitignored)
- Template in `.env.example`
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `SESSION_SECRET` - JWT signing secret (32+ characters)
  - `OPENAI_API_KEY` - OpenAI Whisper API key (for transcription)

**TypeScript:**
- Config: `tsconfig.json`
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Target: ES2017
- Module resolution: bundler

**Build:**
- `next.config.ts` - Next.js configuration
  - Output: standalone (for Docker deployment)
  - React Compiler enabled
  - Turbopack configured
  - Parallel server compiles disabled (stability)

**Linting:**
- `eslint.config.mjs` - ESLint 9 flat config
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

**Styling:**
- `postcss.config.mjs` - PostCSS with Tailwind
- Global styles in `src/app/globals.css`

## Platform Requirements

**Development:**
- Node.js (modern LTS)
- npm
- Supabase project (cloud or local)

**Production:**
- Vercel (configured via `.vercel/`)
- Supabase cloud database
- OpenAI API access (for audio transcription)

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # TypeScript validation (tsc --noEmit)
```

---

*Stack analysis: 2026-01-19*
