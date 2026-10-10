# AXIC Logistics

An original logistics portfolio project built with **Next.js**, **Vercel**, **Prisma**, and **Supabase Postgres**. The customer site connects freight quotes, booking and tracking to a staff-only operations workspace.

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

Hero: custom generated editorial freight-truck scene in `public/images/axic-freight-hero.webp`, designed for AXIC’s ink/teal palette. Generated with the built-in image tool using this prompt: “A white freight truck with a graphite trailer at a modern warehouse at blue hour, realistic editorial photography, deep petrol teal/charcoal, quiet negative space, no text or logos.” Hosted locally and served responsively through Next.js Image. The scene is illustrative; coverage and dashboard SVG graphics remain.

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
- The customer website, quote/booking and tracking remain public. The operations page, full shipment list, dispatch edits and ticket inbox require an authorised staff session. Public tracking omits customer, driver and pricing information.
- All sample companies, rates and shipment events are illustrative. No carrier API, live GPS, physical shipment, payments or external messaging is connected. Use fictional data only.
- Staff authentication/authorization is implemented. Customer tracking ownership controls, public booking/ticket abuse protection and carrier integration are still needed before collecting real customer data. GPS remains deferred.

## Staff login setup

Staff authentication uses Supabase Auth email/password and the official SSR SDK. Cookies are HttpOnly, SameSite=Lax, Secure in production. The proxy refreshes tokens; pages and API handlers validate the user with Supabase before allowing access. No tokens or password are returned to frontend JavaScript. There is no public signup. An empty allowlist denies everyone, and other users of the shared Supabase project cannot access AXIC operations.

1. In Supabase → Portfolio Design → Authentication → Users, **Add user → Create new user**. Enter your staff email and a strong password privately; confirm the email. No invitation is sent by this app. For password resets, manage the user in Supabase or use your configured Auth recovery process.
2. In Supabase → Settings → API Keys, copy the **publishable** key. Add it to Vercel as `SUPABASE_PUBLISHABLE_KEY`. This app uses it server-side; it is different from `SUPABASE_SECRET_KEY` and `DATABASE_URL`.
3. In Vercel, add `OPERATIONS_ALLOWED_EMAILS` with that confirmed staff email. Separate multiple authorised staff emails with commas. Set Production and the intended Preview/Development values. Redeploy.
4. Open `/operations`; it redirects to `/login`. Sign in, update a demo shipment, check public tracking and sign out. Removing an email from the allowlist and redeploying removes its portal permission.

GET `/api/shipments` (full list), PATCH `/api/shipments`, GET `/api/support`, and PATCH `/api/support` require staff access. Cookie-authenticated writes and login/logout require the same-origin Origin header. Public POST booking/support and GET shipment by tracking ID remain available. Supabase applies its Auth rate limits. Auth responses and session-refresh routes use private/no-store caching.

## Changing quote prices

Edit **`lib/pricing.ts`**, then commit and deploy. Client estimates and server booking calculations share this configuration. The server always computes the booking amount itself; a browser cannot supply a lower amount.

| Route band | Base NGN | Per billable kg NGN | Handling NGN |
| --- | ---: | ---: | ---: |
| Domestic (Nigeria) | 4,500 | 450 | 750 |
| Regional (listed African destinations) | 16,000 | 1,400 | 2,000 |
| Overseas (UK / US / Canada) | 35,000 | 4,500 | 5,000 |

Service multiplier: Road 1; Air 2.8; Ocean 0.7. Billable kg = greater of actual kg and L × W × H (cm) / 5,000. Freight = rounded ((base + billable kg × per-kg price) × service multiplier). Optional protection = rounded (freight × 2.5%). Total = freight + protection + handling. Handling is not multiplied.

Example: 25 kg Lagos → Abuja road freight with 40 × 30 × 30 cm and protection: billable 25 kg; freight 15,750; protection 394; handling 750; total **NGN 16,894**. If domestic base becomes 5,000, change `bands.domestic.base`; the same new quote becomes **NGN 17,406**. Previously stored bookings retain their original amount. A quote displayed before a deployment can be recalculated at booking time with the newly deployed rates.

These are illustrative zone bands, not live carrier prices. Domestic state pairs currently share the same rates. A future staff-editable rate screen should store a versioned rate card in the database, include effective dates and route-specific surcharges, and make the public calculator fetch that same current rate card. No pricing administration screen has been added in this revision.
