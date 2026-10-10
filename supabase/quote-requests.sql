begin;
create table public.axic_quote_requests(id text primary key,payload jsonb not null,created timestamptz not null default now());
create index axic_quote_requests_created_idx on public.axic_quote_requests(created desc);
alter table public.axic_quote_requests enable row level security;
revoke all on public.axic_quote_requests from anon,authenticated;
grant select,insert,update on public.axic_quote_requests to service_role;
create function public.axic_quote_request_status(p_id text,p_status text) returns setof public.axic_quote_requests language sql security invoker set search_path='' as $$
update public.axic_quote_requests set payload=jsonb_set(payload,'{status}',to_jsonb(p_status)) where id=p_id and p_status in ('New','Contacted','Closed') returning *;
$$;
revoke all on function public.axic_quote_request_status(text,text) from public,anon,authenticated;
grant execute on function public.axic_quote_request_status(text,text) to service_role;
commit;
