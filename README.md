# Cloyd & Cyrin — Wedding Entourage Proposal

A private, personalized wedding entourage proposal experience built with React, Vite, and Supabase.

## Features

- Secure server-side entourage name search
- Personalized proposal presentation by role
- Accept and decline response flow
- Supabase-only persistence with server-side rate limiting
- Private event-owner dashboard with response and head-count summaries
- Responsive layouts, reduced-motion support, and keyboard-accessible controls

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_WEDDING_SLUG`.
3. Start the development server with `npm run dev`.

## Verification

Run `npm run check` to execute linting, unit tests, and the production build. Use `npm run preview` for a local production preview.

## Backend

The browser uses only public Supabase RPC functions from `src/lib/supabase.js`. Direct access to wedding tables is blocked by Row Level Security and revoked table privileges.

Manual SQL scripts are in `supabase/manual`. Their reviewed application sequence and migration-history limitation are documented in `supabase/MIGRATION_ORDER.md`. Run only scripts that have not already been applied to the target Supabase project.

GitHub Actions runs the complete quality check on every push and pull request. `vercel.json` provides a production-ready Vite SPA deployment configuration; configure the three `VITE_*` environment variables in the hosting provider.

The application does not submit to Google Sheets.
