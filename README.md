# AXIC Logistics

An original logistics portfolio project built with **Next.js**, **Vercel**, **Prisma**, and **Supabase Postgres**. The customer site connects freight quotes, booking and tracking to a demo operations workspace.

## Features

- Responsive ink-blue and lime design, cargo-port photography in the hero, SVG coverage graphics and reduced-motion support.
- Road, air and ocean services; Nigerian, West African and international concept coverage.
- Illustrative NGN quotes with volumetric weight, protection and handling.
- Stored shipment bookings, shared milestones and tracking refresh every 10 seconds.
- Dispatch board, driver assignment, exception management and CSV exports.
- Support ticket creation and resolution.

Try tracking **AX-204810**. Book a fictional shipment, update it in `/operations`, then watch customer tracking refresh.

## Vercel deployment

1. Create a dedicated Supabase project. Choose a region close to your Vercel functions.
2. Run `supabase/schema.sql` in that project's SQL Editor. It creates the shipment and ticket tables, enables RLS and revokes direct anonymous/authenticated access. It is a one-time bootstrap script, not a repeatable migration.
3. Get the project URL from Supabase's Connect dialog, and a secret key (`sb_secret_…`) from Settings → API Keys. Keep the key out of GitHub, screenshots and chat messages.
4. Import `PapyT/axic-logistics` in Vercel. Select **Next.js**; use the repository root. Node 22 or 24. Install with `pnpm install --frozen-lockfile` and build with `pnpm build`. Leave the output directory default.
5. In Vercel → Project → Settings → Environment Variables, add the variables below. Mark `SUPABASE_SECRET_KEY` as **Secret** (the API may call it Sensitive). Add production and preview values before deploying. Use a separate database for isolated previews where practical.
6. Deploy or redeploy after setting the variables. Verify a quote, a booking, its tracking ID, a dispatch update and a support ticket.

| Variable | Value source | Where it is used |
| --- | --- | --- |
| `SUPABASE_URL` | Your Supabase project URL, `https://<ref>.supabase.co` | Server API only |
| `SUPABASE_SECRET_KEY` | Supabase Settings → API Keys → secret key | Server API only; keep private |

No `NEXT_PUBLIC_` environment variables are required. The browser calls `/api/shipments` and `/api/support`; only the server calls Supabase. A legacy service-role JWT can be used in `SUPABASE_SECRET_KEY` for compatibility, but prefer a current secret key. No OpenAI key, Vercel token or GPS/map key is needed. See the Prisma setup below for the database connection.

The code does **not** depend on OpenAI hosting, Cloudflare bindings, Vinext, or ChatGPT authentication. Existing records in the previous hosted demo are not migrated automatically.

## Prisma operations data

Prisma 7.9 maps `Shipment` to `public.axic_shipments` and `SupportTicket` to `public.axic_tickets`. Existing JSONB shipment payloads keep bookings, assignments, milestones and tracking intact. Status updates use an atomic version-checked update; stale dispatch edits return 409. Tickets retain their dates, status and ordering.

In **Kodryn Technologies → Portfolio Design → Connect**, copy the **Transaction pooler** PostgreSQL connection string (port 6543). Replace the database password placeholder privately and URL-encode special characters in the password. In Vercel's AXIC project, add it as **`DATABASE_URL`**, type **Secret**, for Production. Use an isolated Preview database when available. Redeploy after saving. This is a database connection string, not a Supabase API secret key. Keep certificate verification enabled; use Supabase's recommended TLS connection settings.

For local Prisma CLI/Studio use **`DIRECT_URL`** with the **Session pooler** string (port 5432), or the direct connection if your network supports IPv6. Keep this admin connection in your ignored `.env.local`; runtime uses only `DATABASE_URL`. You can use the dashboard's existing database user initially; for long-term operation provision a dedicated runtime role with access only to the two AXIC tables and the required RLS permissions.

| Variable | Connection | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Transaction pooler, port 6543 | Prisma runtime on Vercel; private |
| `DIRECT_URL` | Session pooler, port 5432, or direct | Local Prisma CLI / Studio; private |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Existing Data API configuration | Compatibility until `DATABASE_URL` is added |

When `DATABASE_URL` is present, all customer/operations APIs use Prisma. Without it, the existing Supabase REST adapter continues to work during setup. Prisma connection failures return a sanitized error and never fall back to a different backend. Client generation runs during install and build and needs no credentials or database connection.

```sh
pnpm db:generate
pnpm db:validate
pnpm db:studio
```

The AXIC tables already exist in Portfolio Design: **do not rerun the bootstrap SQL**. No database migration is needed for this ORM adoption. Do not run `prisma db push`, reset, or auto-migrate this shared database: the schema deliberately includes only AXIC tables, so destructive schema synchronization could affect other projects. Continue making reviewed AXIC-specific SQL migrations through Supabase, preserving its CHECK constraints, grants and RLS. Prisma does not express those security rules in its schema. Builds never run migrations.

## Photography

Hero: Pexels photo [3057963](https://www.pexels.com/photo/3057963/), aerial container vessel and port cranes, [download source](https://mygermany.com/wp-content/uploads/2025/05/pexels-photo-3057963-3057963.jpg). Pexels permits commercial use under its [license](https://www.pexels.com/license/). The image is hosted locally and served responsively through Next.js Image; it is illustrative stock photography, not an AXIC-owned fleet. Coverage and dashboard SVG graphics remain.

## Local development

Node 22.13+ (Node 24 is recommended for the test runner), pnpm 11.25.0.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
# Add real local-development values privately to .env.local.
pnpm dev
```

Run `pnpm typecheck`, `pnpm test`, and `pnpm build`. Tests exercise the actual API handlers and both storage adapters using mocked database clients, including optimistic concurrency and secret/error handling. A real Supabase project and browser QA are required for deployment verification.

## Privacy and demo boundaries

- `.env`, `.env.local`, all environment variants, `.vercel` and build output are ignored. Only `.env.example` with placeholders belongs in Git.
- The Supabase secret stays server-side and is never returned in API responses. Database errors are sanitized before being returned to clients.
- RLS and grants block browsers from calling the tables directly. The server secret can access them.
- Keeping secrets private does not make the website, its demo API or operations dashboard private. The project intentionally remains a public portfolio demonstration.
- All sample companies, rates and shipment events are illustrative. No carrier API, live GPS, physical shipment, payments or external messaging is connected. Use fictional data only.
- Before collecting real customer data, add operator authentication/authorization, customer ownership controls, abuse protection and carrier integration. GPS integration will need additional configuration when implemented.
