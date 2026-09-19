# Architecture

Monorepo (Turborepo):

| App/package | Stack | Purpose |
|---|---|---|
| apps/backend | NestJS + TypeORM + Supabase Postgres | Single source of truth. Owns booking logic, availability, clients, WhatsApp webhook. |
| apps/admin-web | Next.js | Admin dashboard (browser) |
| apps/mobile | Flutter | Admin mobile app + home-screen widget |
| apps/desktop | Flutter (desktop target) | Admin desktop app + desktop widget |
| packages/shared-types | TypeScript | Shared API types/DTOs used by backend + admin-web |

Data flow:

Client's WhatsApp (buttons/lists, never free text for booking)
  -> Meta WhatsApp Cloud API -> webhook -> NestJS backend
  -> Supabase Postgres (single source of truth)
  -> read/written by Admin Web, Flutter Mobile, Flutter Desktop (same REST API)

## Database: Supabase, accessed only through the backend

- ORM is TypeORM, not Prisma. Entities live in packages/db (or apps/backend,
  see Stage 1) as TypeORM entity classes.
- Two connection strings, used for different things:
  - `DATABASE_URL` — Supabase's Supavisor **transaction pooler** (port 6543).
    Used by the running app.
  - `DIRECT_URL` — Supabase's **direct connection** (port 5432). Used only
    by the TypeORM CLI to run migrations.
- `synchronize: false` always. Schema changes only happen via TypeORM
  migrations, run against DIRECT_URL. Never mix in `supabase db push` —
  TypeORM migrations are the single owner of schema state.
- Every table has Row Level Security enabled with **no permissive
  policies**. The backend connects with the Postgres role and bypasses RLS
  by design; RLS's job here is only to stop Supabase's public PostgREST/anon
  API from being a second, unguarded way into the data. Nothing outside the
  NestJS backend may read or write these tables.
- `btree_gist` (needed for the overlap-prevention constraint) is created in
  Supabase's `extensions` schema, not `public`.

## Hard rules

- No Twilio or any other BSP. The backend talks to
  `graph.facebook.com/v{latest}/{phone-number-id}/messages` directly with a
  Meta-issued access token.
- The bot never confirms a booking itself. Only the backend, inside a DB
  transaction, may set a booking to CONFIRMED. The bot only calls the
  backend's booking endpoint and relays whatever it returns.
- WhatsApp's free tier only allows free-form messages within 24 hours of the
  customer's last inbound message. Any business-initiated message sent
  outside that window (a cancellation notice, a "running late" update sent
  without a recent inbound message) must use a pre-approved message
  template, not a free-form message. Never assume a free-form send will
  succeed — check the window / handle the template fallback.
- Every inbound webhook payload must be verified via the
  `X-Hub-Signature-256` header (HMAC-SHA256 with the app secret) before
  processing. Reject anything that doesn't verify.
- Webhook deliveries can be retried by Meta. Dedup inbound processing using
  `whatsappMessageId` against MessageLog before acting on a message.
- Admin-only endpoints require authentication. This is a single-admin
  system: use a simple session-cookie + hashed-password login, not a
  multi-tenant auth system.
- Never run `synchronize: true` and never let an auto-generated migration
  touch the hand-written overlap-constraint migration — TypeORM's migration
  generator will try to "fix" it away since it can't express exclusion
  constraints natively.