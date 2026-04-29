# Inverta Platform

Multi-tenant SaaS for solar installers. Each installer gets a branded dashboard, a product catalog, a public solar-sizing calculator link, a lead inbox, and a proposal generator.

> The marketing site (Vite + React SPA) lives at the repo root. The platform monorepo (this directory) is separate. Both are kept isolated on purpose.

## Layout

```
platform/
  apps/
    web/         Next.js 14 App Router — installer dashboard + public calculator + store
    api/         NestJS — dedicated backend (stubbed; see apps/api/README.md)
  packages/
    db/          Prisma schema, migrations, seed, and typed client
    shared/      Pure calculation engine, types, sun-hour lookup, appliance presets, money helpers
```

## Current build state

**Slice 1 — foundation + calculator (done):**
- Turborepo workspace wired
- Prisma schema with all tenant-scoped models
- Seed: demo installer (`demo-solar`), catalog (inverters/batteries/panels), appliance presets
- Pure calculation engine with Jest unit tests
- Nigerian sun-hours lookup
- Public calculator at `/calc/[slug]` — 4 steps + live results
- Submit endpoint: engine + lead persistence + per-IP rate limit

**Slice 2 — auth + onboarding step 1 + dashboard skeleton (done):**
- Brand port: dark theme + orange (`18 100% 60%`) + hero gradient + glass buttons, copied verbatim from the marketing site
- Marketing assets (`icon.png`, `wordmark.png`) live in `apps/web/public/`
- Supabase SSR auth: server + browser clients, middleware that refreshes the session and gates `/dashboard` and `/onboarding`
- `/signup` form → Supabase user + Installer row + reserved unique slug + auto CalculatorLink
- `/login` with redirect to `/dashboard` or `/onboarding` based on `onboardedAt`
- `/auth/callback` handles email-verify code exchange
- `/verify-email` notice page (post-signup)
- `/onboarding` step 1 (business profile: logo URL, website, address, bio) — sets `onboardedAt`
- `/dashboard` skeleton: stat cards, calculator link with copy-to-clipboard, sidebar nav, sign-out
- Schema additions: `Installer.onboardedAt`, dropped `passwordHash` (Supabase owns auth)

**Next slices (in build order):**
1. Onboarding steps 2 & 3 — catalog quick-add + calculator link customization
2. Catalog CRUD UI (full editor under `/dashboard/catalog`)
3. Leads inbox + lead detail view
4. Proposal builder + PDF generation + R2 upload + Resend delivery
5. Product store
6. NestJS API migration (optional — Next API routes work for MVP)

See `../README.md` at the repo root for the marketing site.

## Setup

```bash
cd platform
npm install

# Fill in environment
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXT_PUBLIC_SUPABASE_*, etc.

# Generate Prisma client + run migrations + seed
npm run db:generate
npm run db:migrate
npm run db:seed

# Run the engine tests
npm run test --workspace @inverta/shared

# Start the web app
npm run dev --workspace @inverta/web
# Open http://localhost:3000/calc/demo-solar
```

## Key design rules

- **Multi-tenancy:** every tenant-scoped table has an `installerId` foreign key. Every API route that reads/writes tenant data must verify the JWT's installer claim against the row's `installerId`. The public calculator endpoint is the single exception — it's rate-limited instead.
- **Money:** stored as integer kobo. Format for display only at the edge via `@inverta/shared/money`.
- **Validation:** all request bodies validated with Zod at the API boundary.
- **Engine purity:** `packages/shared/engine` has zero I/O. Easy to test, easy to reuse on the server and in the browser.

## Packages

| Workspace | Purpose |
|---|---|
| `@inverta/web` | Next.js app — pages, server actions, API routes |
| `@inverta/api` | NestJS — reserved for the dedicated backend (see apps/api/README.md) |
| `@inverta/db` | Prisma schema + generated client + seed |
| `@inverta/shared` | Engine, types, lookups, formatters — no I/O, no framework dependencies |
