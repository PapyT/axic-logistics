-- Apply once in the dedicated AXIC project's SQL Editor before deploying.
-- Only Vercel's server API can access these tables. No client access policies.
begin;
create table public.axic_shipments (
  id text primary key,
  payload jsonb not null,
  version integer not null default 0 check (version >= 0)
);
create table public.axic_tickets (
  id text primary key,
  subject text not null check (length(subject) between 1 and 100),
  message text not null check (length(message) between 1 and 1000),
  status text not null default 'Open' check (status in ('Open','Resolved')),
  created timestamptz not null default now()
);
alter table public.axic_shipments enable row level security;
alter table public.axic_tickets enable row level security;
revoke all on public.axic_shipments,public.axic_tickets from anon,authenticated;
grant select,insert,update on public.axic_shipments,public.axic_tickets to service_role;
create index axic_tickets_created_idx on public.axic_tickets (created desc);
commit;
