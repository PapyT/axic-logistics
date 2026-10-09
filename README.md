# AXIC Logistics

An original logistics portfolio project built with **Next.js**, **Vercel**, and **Supabase**. The customer site connects freight quotes, booking and tracking to a demo operations workspace.

## Features

- Responsive ink-blue and lime design, animated SVG freight network and reduced-motion support.
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

No `NEXT_PUBLIC_` environment variables are required. The browser calls `/api/shipments` and `/api/support`; only the server calls Supabase. A legacy service-role JWT can be used in `SUPABASE_SECRET_KEY` for compatibility, but prefer a current secret key. No `DATABASE_URL`, OpenAI key, Vercel token or GPS/map key is needed for this version.

The code does **not** depend on OpenAI hosting, Cloudflare bindings, Vinext, or ChatGPT authentication. Existing records in the previous hosted demo are not migrated automatically.

## Local development

Node 22.13+ (Node 24 is recommended for the test runner), pnpm 11.25.0.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
# Add real local-development values privately to .env.local.
pnpm dev
```

Run `pnpm typecheck`, `pnpm test`, and `pnpm build`. Tests exercise the actual API handlers and REST adapter using a mock Supabase Data API, including optimistic concurrency and secret/error handling. A real Supabase project and browser QA are required for deployment verification.

## Privacy and demo boundaries

- `.env`, `.env.local`, all environment variants, `.vercel` and build output are ignored. Only `.env.example` with placeholders belongs in Git.
- The Supabase secret stays server-side and is never returned in API responses. Database errors are sanitized before being returned to clients.
- RLS and grants block browsers from calling the tables directly. The server secret can access them.
- Keeping secrets private does not make the website, its demo API or operations dashboard private. The project intentionally remains a public portfolio demonstration.
- All sample companies, rates and shipment events are illustrative. No carrier API, live GPS, physical shipment, payments or external messaging is connected. Use fictional data only.
- Before collecting real customer data, add operator authentication/authorization, customer ownership controls, abuse protection and carrier integration. GPS integration will need additional configuration when implemented.
