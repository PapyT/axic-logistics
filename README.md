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

Open **Goods & receiving**, select a consignment and print the item labels. The QR contains only an opaque item identifier in an HTTPS `/operations/scan?code=…` link. Contacts are never encoded in QR labels or returned in public tracking. Scanning requires staff login and preserves the item link through login. Use **Scan QR with camera** on HTTPS, grant camera permission, or paste the item ID/link. Select the consignment and assign. Repeating the same assignment is safe; an item already assigned elsewhere is rejected. There is no item transfer or removal workflow yet.

Goods can be registered individually before assignment. Adding such goods updates the consignment item list and registered weight, but does not automatically recalculate the original shipment weight or quote. Review weight and carrier price before dispatch. Estimates are not invoices or payments.

Bootstrap the first admin with `OPERATIONS_ADMIN_EMAILS`, privately in Vercel, and redeploy. An admin then sees **Team accounts** to create confirmed admin/staff accounts and change roles or suspend access. `SUPABASE_SECRET_KEY` is required for these Auth Admin operations even when Prisma handles storage. Accounts have trusted server-managed app metadata; there is no public signup or emailed invitation. Existing accounts are not promoted automatically. Your own access and bootstrap admin access cannot be edited in this screen. Admins can edit account names and set new passwords in Team accounts. Work states and roles are trusted app metadata. These controls never return passwords.

Validation includes generated QR PNG decoding with ZXing, mocked REST registration/lookup/assignment, auth role guards, and a rolled-back live Postgres transaction checking unique IDs, assignment conflicts and creation rollback. Test records are not retained. Physical camera scanning still needs device testing.

## Receiving goods

Open Operations → **Goods & receiving** → **Receive goods**. Enter the receiving branch/warehouse, scan the QR label or click **Enter code manually** and type the printed item UUID (or paste the QR link). Look up the item, check its details and press **Confirm physical receipt**. Camera access is optional; a scan alone never confirms arrival.

Each receipt stores the item ID, normalized location, provider-verified operator ID/email, and server timestamp. Client-supplied actor names or IDs are ignored. The private receipt history appears with the item. Repeated confirmations at the same location return the original receipt, without increasing counts or adding milestones. Case and repeated whitespace do not create different warehouses; staff should use a consistent branch name.

The consignment shows received/expected counts and outstanding items for the chosen location. Partial arrivals preserve the existing shipment status. Once all assigned goods are received at that location, a single milestone is added and the shipment becomes **At hub**. Existing **Exception** status is retained for staff resolution. New receipts are rejected for **Out for delivery** or **Delivered** shipments. Another hub can record its own arrivals during a subsequent transit leg.

Once receiving begins, the assigned item set is frozen. Register late goods in another consignment. This keeps completion counts reliable. Receipts and assignment use the same database shipment row lock; dispatch's existing version checks also detect receipt updates. `supabase/receipts.sql` has been applied additively to the shared project; do not rerun it. Both Prisma and REST call the same SQL functions, using bound parameters, and all receipt data is server-only with RLS and denied browser-role grants.

Validation: rolled-back live SQL checks cover partial/completed receipts, same-location duplicates, another hub, frozen item counts, unassigned items, delivered-state protection and private grants. API tests cover manual/QR equivalence, provider-derived staff identity, both storage adapters and sanitized failures. Physical camera and live authenticated browser checks still require device/session testing.

## Automatic dark mode

`app/theme.css` follows `prefers-color-scheme: dark`. CSS applies the correct palette before first paint and responds to system theme changes without reload, local storage or a hydration script. The customer site, login, operations screens, forms, tables and dialogs share the theme. Brand lime and freight photography are retained. QR images and printed labels stay white with dark codes for scan contrast. There is no manual theme override.


## State pickups and handovers

New domestic bookings (single good or consignment) create item QR codes, a workflow and an origin-state notification in one database transaction. Existing bookings and international jobs retain their legacy dispatch/receiving flow. The public calculator supports both single goods and consignments, with sender and receiver contacts.

Open **Pickup & handovers**. Staff see jobs for their configured origin/destination state; admins can see the whole network. Notifications are private, per account, refresh every 10 seconds while the workspace is open, and have a mark-read action. No email, SMS or background push notifications are sent.

| Step | Responsible staff | Required action | Public status |
| --- | --- | --- | --- |
| Booking | Origin-state staff notified | One staff claims “I’m on my way to collect” before travelling | Booked |
| Sender collection | Pickup owner | Attach one QR label per physical good and confirm each collected item | Collected after all scans |
| Dispatch | Pickup owner | Dispatch to destination state; destination staff notified | In transit |
| Destination handover | One destination-state staff | Claim receipt, then confirm each item received | At hub after all scans |
| Final delivery | Staff who received the goods | Start delivery, then confirm handover to receiver | Out for delivery → Delivered |

Camera scanning and manual entry use the same explicit confirmation. Server-verified actor ID and trusted work-state metadata determine permission; browser-supplied assignments cannot override them. Row locks make competing claims atomic. Duplicate claims/scans are safe, partial scans cannot advance a job, and the item set freezes when pickup is claimed. Generic status edits and legacy receipt controls cannot bypass a managed workflow. The current flow retains the receiving staff member through final delivery; it does not include reassignment, cancellation or claim release.

Apply `supabase/state-workflow.sql`, then `supabase/workflow-assignment.sql` once, additively, on a new environment. They have already been applied to the existing shared project. Prisma and REST call the same transactional function. RLS and denied browser grants keep workflows, scans and notifications private. The backend tests include a rolled-back real Postgres lifecycle in `tests/workflow-db.sql`.

## Seeded state staff and later edits

37 confirmed staff accounts were created: one per Nigerian state plus Abuja. Testing emails follow `staff.<state-with-hyphens>@example.com`, e.g. `staff.akwa-ibom@example.com`. Names start as `AXIC <State> Staff`. Each has a different generated password, stored only in the private credential file delivered to the owner. These are real Auth accounts using reserved testing addresses; no messages are sent. Replace testing accounts with individual staff accounts before real team use.

Admins use **Team accounts → Edit name / password** to change names or set a password of 12–128 characters. Leave the new-password field blank to preserve the current password. State, role and suspension controls remain available. Passwords are never included in account-list responses. The first administrator still uses the private `OPERATIONS_ADMIN_EMAILS` bootstrap setting.

For a new environment, set the Supabase URL and secret key privately and run `pnpm db:seed:staff`. This server-only script creates missing accounts, skips matching existing accounts, never overwrites existing passwords, and records only newly created credentials in ignored `work/state-staff-credentials.csv`. Rerunning after partial success is safe. Never commit or publish that file.


## Customer intake and staff state workspaces

The customer website now offers **Calculate a quote / Request a quote** and **Send a shipment**. Quote enquiries require customer contact details and freight information, save an estimated price calculated on the server, and appear in the administrator's **Quote requests** inbox. They do not create shipments, labels or pickup notifications. Admins can mark enquiries New, Contacted or Closed. Shipment bookings require sender/receiver details and goods, and start the existing pickup workflow. Instant estimates can still be calculated without submitting contact details.

The quote inbox uses the private `axic_quote_requests` table and server-only REST/Prisma access. `supabase/quote-requests.sql` has been applied additively to the existing shared project. Apply it once for a new environment. Enquiries are not automatically converted to shipments; a shipment is booked separately once its details are confirmed.

Staff sign-in opens a dedicated **My state** workspace with local collections, incoming consignments, **My assignments**, state notifications, and **State activity**. Destination jobs become actionable after origin dispatch. Staff QR links open the relevant job in this workspace, with a camera/manual scan and explicit confirmation after claiming its handover. Missing work states return no state records. Staff have no portal booking screen or network metrics, exports, support inbox, item registration/assignment, or team administration. Admins retain the full operations portal and can create bookings on behalf of customers.

API handlers enforce the same state boundary: private shipment and consignment lists include only jobs whose origin or destination matches trusted `app_metadata.axic_state`. Goods from unrelated states or unassigned goods return 404 to staff. Generic shipment changes, legacy receipt recording, support management and quote-request management require admin access. Staff progress managed handovers through the existing claim/scan API; older manual records remain administrator-managed. Public tracking by ID remains available without contacts, and public intake remains available without staff login.

Validation: `tests/state-access.mjs` exercises real route handlers for state scope, blank states, unrelated QR IDs, admin-only APIs, public tracking privacy and public quote intake in both storage adapters. `tests/quote-intake-db.sql` checks status persistence, no shipment side effects and private grants in a rolled-back transaction.
