-- Shared server-side limits. No chat transcripts or raw IP addresses are stored.
create table if not exists public.axic_chat_limits (
 bucket text primary key,
 uses integer not null default 0,
 expires timestamptz not null
);
alter table public.axic_chat_limits enable row level security;
revoke all on public.axic_chat_limits from public,anon,authenticated;
grant select,insert,update,delete on public.axic_chat_limits to service_role;
create or replace function public.axic_consume_chat(p_identity text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare day_key text; hour_key text; minute_key text; global_count integer; hour_count integer; minute_count integer;
begin
 if p_identity !~ '^[a-f0-9]{64}$' then return false; end if;
 day_key := 'day:'||to_char(now() at time zone 'UTC','YYYY-MM-DD');
 hour_key := 'hour:'||p_identity||':'||to_char(now() at time zone 'UTC','YYYY-MM-DD-HH24');
 minute_key := 'minute:'||p_identity||':'||to_char(now() at time zone 'UTC','YYYY-MM-DD-HH24-MI');
 -- Every request takes the global row lock first, preventing races/deadlocks.
 insert into public.axic_chat_limits(bucket,expires) values(day_key,now()+interval '2 days') on conflict do nothing;
 select uses into global_count from public.axic_chat_limits where bucket=day_key for update;
 if global_count>=100 then return false; end if;
 insert into public.axic_chat_limits(bucket,expires) values(hour_key,now()+interval '2 days'),(minute_key,now()+interval '2 days') on conflict do nothing;
 select uses into hour_count from public.axic_chat_limits where bucket=hour_key for update;
 select uses into minute_count from public.axic_chat_limits where bucket=minute_key for update;
 if hour_count>=20 or minute_count>=5 then return false; end if;
 update public.axic_chat_limits set uses=uses+1 where bucket in (day_key,hour_key,minute_key);
 delete from public.axic_chat_limits where expires<now();
 return true;
end; $$;
revoke all on function public.axic_consume_chat(text) from public,anon,authenticated;
grant execute on function public.axic_consume_chat(text) to service_role;
