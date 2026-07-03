# Inverta

Multi-tenant SaaS for solar installers. Installers sign up, build a catalog, share a branded solar calculator, capture leads, and send PDF proposals — all from one dashboard.

## Repo layout

Single Next.js app at root with two workspace packages for the DB and the pure calc engine.

```
inverta/
  app/                 Next.js 14 App Router
    page.tsx           Marketing landing (ported from the original Vite site)
    (auth)/            /signup, /login, /verify-email
    auth/callback/     Supabase email-verify handler
    onboarding/        Post-signup wizard (step 1: business profile)
    dashboard/         Installer dashboard (stats, calculator link)
    calc/[slug]/       Public branded solar calculator
    api/               Route handlers (public calculator submit)
  components/
    marketing/         Header, Hero, Footer (from the Vite site)
    brand/             Wordmark, BrandIcon
    ui/                shadcn/ui primitives
  lib/
    prisma.ts          @inverta/db re-export
    auth.ts            getCurrentInstaller / requireInstaller helpers
    supabase/          Server + browser + middleware clients
    utils.ts           cn helper
    rate-limit.ts      Per-IP sliding-window limiter
  middleware.ts        Gates /dashboard and /onboarding, refreshes session
  public/              icon.png, wordmark.png, hero-image.png
  packages/
    db/                Prisma schema, migrations, seed, typed client
    shared/            Pure calc engine, types, sun-hours, presets, money
```

## Setup

Requires Node.js 20+ and a Postgres URL (Supabase / Neon / local Docker).

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Generate Prisma client + run migrations + seed
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Configure Supabase auth redirect URLs
#    In Supabase Dashboard → Authentication → URL Configuration:
#      Site URL:          http://localhost:3000
#      Redirect URLs:     http://localhost:3000/auth/callback
#                         http://localhost:3000/**

# 5. Start dev
npm run dev
```

Then open http://localhost:3000.

## What to try

- **Marketing landing**: `/` — the original marketing site, now running on Next
- **Sign up flow**: `/` → click Sign up → creates a Supabase user + Installer row, sends verification email
- **Verify + onboard**: click email link → `/onboarding` → fills business profile → `/dashboard`
- **Dashboard**: shows stat cards, your calculator link with copy button, sign-out
- **Public calculator**: `/calc/demo-solar` — the seeded demo installer's branded calculator, 4 steps + results

## Tech stack

- Next.js 14 App Router, TypeScript
- Tailwind CSS, shadcn/ui primitives
- Supabase (Auth via SSR helpers, Postgres via Prisma)
- Prisma 5 ORM
- Zod for validation
- Jest for the calc engine unit tests
- Planned: BullMQ + Redis (async jobs), Cloudflare R2 (proposal PDFs), Resend (email), `@react-pdf/renderer`

## Design rules

- **Multi-tenancy**: every tenant-scoped table has an `installerId` foreign key. Every authenticated API route must verify the JWT's installer claim against the row's `installerId`. The public calculator endpoint is the single exception — it's rate-limited instead.
- **Money**: stored as integer kobo. Format for display via `@inverta/shared/money`.
- **Validation**: all form and API inputs validated with Zod schemas re-exported from `@inverta/shared/schemas`.
- **Engine purity**: `packages/shared/engine` has zero I/O. Runs on the server, in the browser, and in tests.

## Current build state

All core MVP modules are implemented:

- **Marketing site** at `/` (ported from the original Vite site)
- **Auth** — signup, login, email verify (Supabase SSR)
- **Onboarding** — business profile with logo upload (Supabase Storage, server-side)
- **Calculator** at `/calc/[slug]` — Itel-style appliance grid with product images, 3 steps, engine with graceful degradation (sizing-only results when the catalog is incomplete)
- **Catalog** at `/dashboard/catalog` — full CRUD + one-click starter template
- **Leads** at `/dashboard/leads` — inbox, detail view (inputs/results/spending), status workflow, notes
- **Notifications** — in-app rows + Resend email on new leads (email skipped gracefully when `RESEND_API_KEY` unset), recent-activity feed on the overview
- **Settings** at `/dashboard/settings` — profile, pricing (markup + flat/percent installation fee), calculator link slug + active toggle
- **Proposals** — create from lead (prefilled from the calculation snapshot), line-item editor, on-demand PDF (`@react-pdf/renderer`), public customer view at `/proposal/[id]` with viewed-tracking, send via email
- **Store** — `/dashboard/store` CRUD + public storefront at `/store/[slug]` with WhatsApp enquiry links

**Deliberate MVP simplifications (revisit before scale):**
- Rate limiting is in-process memory — swap for Redis before running multiple instances
- PDFs are generated on demand from the DB, not stored in R2 — revisit if PDFs need to be immutable-once-sent
- No job queue (BullMQ) — notification email sends inline with the request
- Customer accounts (spec module: customers saving results) not built
