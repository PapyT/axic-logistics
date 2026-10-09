# AXIC Logistics

An original logistics portfolio project: an editorial customer website connected to an operations workspace. Ink blue, soft neutrals and lime accents; custom animated SVG freight network; responsive layouts; keyboard-accessible controls; reduced-motion support.

## Customer website

- Road, air and ocean service information.
- Coverage across Nigeria's 36 states and FCT, five West African destinations, UK, US and Canada.
- Instant illustrative NGN estimates based on actual or volumetric weight, service, route, handling and protection.
- Demo booking with a unique tracking ID stored in D1.
- Shipment tracking refreshed every 10 seconds from the same records operations uses.
- Support tickets stored in the operations inbox.

## Operations workspace (`/operations`)

- Overview metrics and shipment status distribution.
- Searchable shipment table with status filters and CSV export.
- Dispatch board with driver assignment, location updates and exception handling.
- Timestamped milestones visible to customers.
- Support ticket resolution and reopening.

Try tracking **AX-204810**. Create a quote and book a fictional shipment. Open the operations workspace, update its driver/status/location, then watch customer tracking refresh.

## Setup and validation

Node 22.13+ and pnpm. Run `pnpm install`, `pnpm typecheck`, `pnpm test` and `pnpm build`. `pnpm dev` uses the Cloudflare/Vinext development environment. Apply the Drizzle migrations to local D1 before testing API calls locally. The Sites build provisions and migrates the hosted D1 binding declared as `DB` in `.openai/hosting.json`.

`tests/verify.mjs` tests quote rules and the actual API handlers using real in-memory SQLite behind a D1-compatible adapter. It covers booking persistence, dispatch/tracking synchronization, fixture updates, support resolution and rejected invalid requests. It does not validate a remote D1 deployment or replace browser QA.

## Demo boundaries

AXIC Logistics is a fictional portfolio concept. Rates, coverage, customers, drivers and initial shipment milestones are illustrative. Tracking reflects stored dispatch milestones; no carrier API, GPS, payment gateway, physical shipping or external messaging integration is connected. The operations workspace is deliberately accessible as a demo under the Site's audience controls. A production deployment needs staff authentication/authorization, customer ownership controls, carrier integration, rates, operational policies and abuse controls before collecting real customer data. Use fictional details only.

No API secrets are required. No third-party tracking or analytics scripts. Fonts use Google Fonts with system fallbacks.
