# AXIC Logistics

Next.js customer website and staff operations workspace, hosted on Vercel with Supabase Postgres and Prisma. Bookings, driver assignments, status events and support tickets use stored data. There are no seeded shipments or fake dashboard counts. Empty databases show empty states. Old built-in sample IDs are retired from listing, tracking and updates; user-created records are retained.

## Features

- Responsive ink/teal website with locally hosted freight photography.
- Abuja destination label with compatibility for older FCT booking records.
- Estimated NGN quote calculator and saved bookings with unique tracking IDs.
- Staff login, dispatch management, CSV export and support ticket resolution.
- Customer tracking polls saved dispatch milestones every 10 seconds.
- Unchanged saves add no events; driver/location edits are labelled separately.

The public site no longer displays mock metrics, sample companies or sample tracking IDs. The operations overview uses a static warehouse image instead of an animated network. Geographic coverage and service availability must be confirmed by the operator. Estimated prices are retained by request; they are not live carrier tariffs. No GPS, carrier, payment or external messaging integration is connected.

## Database / Vercel setup

The existing project is **Kodryn Technologies → Portfolio Design**. AXIC tables already exist: do not rerun `supabase/schema.sql`. That script is only for a fresh database. Prisma maps `Shipment` to `axic_shipments` and `SupportTicket` to `axic_tickets`, preserving JSONB data, version checks, CHECK constraints, RLS and grants. The additive migration `supabase/consignments.sql` has also been applied to this project. It creates `axic_consignments` and `axic_goods`, plus atomic creation/assignment functions. Do not rerun it on this project. Both tables are protected by RLS and only the server role can access them.

Import `PapyT/axic-logistics` in Vercel as Next.js using Node 22/24, install `pnpm install --frozen-lockfile`, build `pnpm build`. Set private variables in the dashboard, then redeploy. Do not commit credentials or use `NEXT_PUBLIC_` for them.

| Variable | Purpose / source |
| --- | --- |
| `DATABASE_URL` | Prisma runtime: Supabase Connect → Transaction pooler (port 6543), password inserted privately |
| `DIRECT_URL` | Local Prisma CLI/Studio: Session pooler (5432) or direct IPv6 connection |
| `SUPABASE_URL` | Supabase project URL for Auth and Data API compatibility |
| `SUPABASE_SECRET_KEY` | Required for server-side team administration, and Data API storage if DATABASE_URL is absent; type Secret |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase Auth publishable key, used server-side |
| `OPERATIONS_ALLOWED_EMAILS` | Legacy confirmed staff emails, comma separated |
| `OPERATIONS_ADMIN_EMAILS` | Confirmed bootstrap admin emails, comma separated; configure privately |

`DATABASE_URL` is not an API key. Mark password-bearing connection strings as Secret, URL-encode password characters and keep TLS certificate verification enabled. Use separate Preview/Development values where appropriate. When DATABASE_URL is set, every storage operation uses Prisma. Without it the existing Data API adapter is used. Connection failures never switch backends silently.

Prisma generation runs at install/build without database credentials. Builds never migrate. Do not run reset, db push or auto-migrate against this shared project; Prisma's schema includes only AXIC tables. Use reviewed AXIC-specific SQL migrations through Supabase to preserve unrelated data and table security.

## Photography

Hero: custom generated editorial freight-truck scene in `public/images/axic-freight-hero.webp`, designed for AXIC’s ink/teal palette. Generated with the built-in image tool using this prompt: “A white freight truck with a graphite trailer at a modern warehouse at blue hour, realistic editorial photography, deep petrol teal/charcoal, quiet negative space, no text or logos.” Hosted locally and served responsively through Next.js Image. The scene is illustrative; coverage and dashboard SVG graphics remain.

## Local development and validation

Node 22.13+ (Node 24 recommended), pnpm 11.25.0.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
# Configure credentials privately in the ignored local file.
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

Tests exercise real API handlers, both storage adapters and the Supabase SSR SDK using mocked database/Auth services. They cover the full dispatch lifecycle, no-op saves, edit labels, old FCT records, retired sample IDs, protected management APIs, session verification, logout and concurrency. They do not verify live Supabase credentials or carrier delivery.

Staff pages and management APIs require provider-verified authorised users. Anonymous booking/support creation and tracking by ID remain public. Public tracking omits customer, driver and amount. Customer ownership and public submission abuse controls are separate future work; private credentials do not make the whole customer site private.

## Dispatch progress

Open a shipment from **Shipments** or **Dispatch board**, select the next **Status**, then save. The chosen status appears in the portal and public tracking. Driver/location edits keep the shipment's current status and display their own event labels. A save with no changes adds no new event.

Historic repeated-status events retain their timestamps and display “Update recorded” or “Location updated”. Existing FCT destinations and event locations display Abuja without deleting or rebuilding history. Progress changes when staff record a milestone; it does not advance automatically with time.

## Staff login setup

Staff authentication uses Supabase Auth email/password and the official SSR SDK. Cookies are HttpOnly, SameSite=Lax, Secure in production. The proxy refreshes tokens; pages and API handlers validate the user with Supabase before allowing access. No tokens or password are returned to frontend JavaScript. There is no public signup. Access requires a confirmed email plus a bootstrap admin email, legacy staff allowlist entry, or trusted `app_metadata.axic_role` of admin/staff. Public user metadata never grants permission. `app_metadata.axic_enabled=false` suspends access. Other users of the shared Supabase project are denied.

1. In Supabase → Portfolio Design → Authentication → Users, **Add user → Create new user**. Enter your staff email and a strong password privately; confirm the email. No invitation is sent by this app. For password resets, manage the user in Supabase or use your configured Auth recovery process.
2. In Supabase → Settings → API Keys, copy the **publishable** key. Add it to Vercel as `SUPABASE_PUBLISHABLE_KEY`. This app uses it server-side; it is different from `SUPABASE_SECRET_KEY` and `DATABASE_URL`.
3. In Vercel, add `OPERATIONS_ADMIN_EMAILS` with your confirmed administrator email. Optionally retain legacy staff emails in `OPERATIONS_ALLOWED_EMAILS`. Set Production and the intended Preview/Development values. Redeploy.
4. Open `/operations`; it redirects to `/login`. Sign in, create a shipment and update it, check public tracking and sign out. Removing an email from the allowlist and redeploying removes its portal permission.

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

## Consignments, goods and team accounts

In Operations → New shipment, choose **Consignment**. Enter sender and receiver names, phone numbers, addresses, optional emails, and one row per physical good with its weight. The booking uses the sum of goods weights. Shipment, consignment and goods are created together atomically. Each good receives a random UUID and its own QR label.

Open **Consignments & QR**, select a consignment and print the item labels. The QR contains only an opaque item identifier in an HTTPS `/operations/scan?code=…` link. Contacts are never encoded in QR labels or returned in public tracking. Scanning requires staff login and preserves the item link through login. Use **Scan QR with camera** on HTTPS, grant camera permission, or paste the item ID/link. Select the consignment and assign. Repeating the same assignment is safe; an item already assigned elsewhere is rejected. There is no item transfer or removal workflow yet.

Goods can be registered individually before assignment. Adding such goods updates the consignment item list and registered weight, but does not automatically recalculate the original shipment weight or quote. Review weight and carrier price before dispatch. Estimates are not invoices or payments.

Bootstrap the first admin with `OPERATIONS_ADMIN_EMAILS`, privately in Vercel, and redeploy. An admin then sees **Team accounts** to create confirmed admin/staff accounts and change roles or suspend access. `SUPABASE_SECRET_KEY` is required for these Auth Admin operations even when Prisma handles storage. Accounts have trusted server-managed app metadata; there is no public signup or emailed invitation. Existing accounts are not promoted automatically. Your own access and bootstrap admin access cannot be edited in this screen. Password reset is managed in Supabase using your configured recovery process.

Validation includes generated QR PNG decoding with ZXing, mocked REST registration/lookup/assignment, auth role guards, and a rolled-back live Postgres transaction checking unique IDs, assignment conflicts and creation rollback. Test records are not retained. Physical camera scanning still needs device testing.
