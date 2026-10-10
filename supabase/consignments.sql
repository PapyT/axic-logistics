begin;
create table public.axic_consignments (
 id text primary key,
 shipment_id text not null unique references public.axic_shipments(id),
 sender jsonb not null check(jsonb_typeof(sender)='object'),
 receiver jsonb not null check(jsonb_typeof(receiver)='object'),
 created timestamptz not null default now()
);
create table public.axic_goods (
 id uuid primary key,
 description text not null check(length(description) between 1 and 200),
 weight double precision not null check(weight>0 and weight<=10000),
 consignment_id text references public.axic_consignments(id),
 created timestamptz not null default now(),
 assigned_at timestamptz
);
create index axic_goods_consignment_idx on public.axic_goods(consignment_id);
create index axic_consignments_created_idx on public.axic_consignments(created desc);
alter table public.axic_consignments enable row level security;
alter table public.axic_goods enable row level security;
revoke all on public.axic_consignments,public.axic_goods from anon,authenticated;
grant select,insert,update on public.axic_consignments,public.axic_goods to service_role;
-- Both functions run as the calling server role, never SECURITY DEFINER.
create function public.axic_create_consignment(p_shipment jsonb,p_sender jsonb,p_receiver jsonb,p_goods jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cid text:=p_shipment->>'id'; g jsonb;
begin
 if jsonb_typeof(p_goods)<>'array' or jsonb_array_length(p_goods) not between 1 and 100 then raise exception 'Invalid goods';end if;
 insert into public.axic_shipments(id,payload,version) values(cid,p_shipment,0);
 insert into public.axic_consignments(id,shipment_id,sender,receiver) values(cid,cid,p_sender,p_receiver);
 for g in select value from jsonb_array_elements(p_goods) loop
  insert into public.axic_goods(id,description,weight,consignment_id,assigned_at) values((g->>'id')::uuid,g->>'description',(g->>'weight')::double precision,cid,now());
 end loop;
 return p_shipment;
end $$;
create function public.axic_assign_good(p_good uuid,p_consignment text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.axic_goods;
begin
 select * into g from public.axic_goods where id=p_good for update;
 if not found then raise exception 'Item not found' using errcode='P0002';end if;
 if not exists(select 1 from public.axic_consignments where id=p_consignment) then raise exception 'Consignment not found' using errcode='P0002';end if;
 if g.consignment_id is not null and g.consignment_id<>p_consignment then raise exception 'Item already assigned' using errcode='23505';end if;
 update public.axic_goods set consignment_id=p_consignment,assigned_at=coalesce(assigned_at,now()) where id=p_good returning * into g;
 return to_jsonb(g);
end $$;
revoke all on function public.axic_create_consignment(jsonb,jsonb,jsonb,jsonb),public.axic_assign_good(uuid,text) from public,anon,authenticated;
grant execute on function public.axic_create_consignment(jsonb,jsonb,jsonb,jsonb),public.axic_assign_good(uuid,text) to service_role;
commit;
