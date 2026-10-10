begin;
create table public.axic_receipts (
 id uuid primary key,
 good_id uuid not null references public.axic_goods(id),
 location text not null check(length(location) between 1 and 120),
 location_key text not null,
 received_by uuid not null,
 received_by_name text not null,
 received_at timestamptz not null default now(),
 unique(good_id,location_key)
);
create index axic_receipts_received_idx on public.axic_receipts(received_at desc);
alter table public.axic_receipts enable row level security;
revoke all on public.axic_receipts from anon,authenticated;
grant select,insert on public.axic_receipts to service_role;
create function public.axic_receive_good(p_good uuid,p_location text,p_actor uuid,p_actor_name text,p_receipt uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.axic_goods; s public.axic_shipments; r public.axic_receipts; loc text; key text; total int; arrived int; duplicate boolean:=false; next_payload jsonb;
begin
 loc:=btrim(regexp_replace(p_location,'\s+',' ','g'));key:=lower(loc);
 if loc is null or length(loc) not between 1 and 120 or p_actor is null then raise exception 'Invalid receipt' using errcode='22023';end if;
 select * into g from public.axic_goods where id=p_good;
 if not found then raise exception 'Item not found' using errcode='P0002';end if;
 if g.consignment_id is null then raise exception 'Assign item before receipt' using errcode='23505';end if;
 -- Serialize all arrivals and assignment changes for this consignment.
 select * into s from public.axic_shipments where id=g.consignment_id for update;
 select * into r from public.axic_receipts where good_id=p_good and location_key=key;
 if found then duplicate:=true;
 else
  if s.payload->>'status' in ('Delivered','Out for delivery') then raise exception 'Shipment already beyond warehouse receipt' using errcode='23505';end if;
  insert into public.axic_receipts(id,good_id,location,location_key,received_by,received_by_name)
   values(p_receipt,p_good,loc,key,p_actor,p_actor_name) returning * into r;
 end if;
 select count(*),count(re.id) into total,arrived from public.axic_goods item left join public.axic_receipts re on re.good_id=item.id and re.location_key=key where item.consignment_id=g.consignment_id;
 next_payload:=s.payload;
 if not duplicate and arrived=total and total>0 then
  next_payload:=jsonb_set(next_payload,'{status}',to_jsonb(case when next_payload->>'status'='Exception' then 'Exception' else 'At hub' end));
  next_payload:=jsonb_set(next_payload,'{location}',to_jsonb(loc));
  next_payload:=jsonb_set(next_payload,'{events}',coalesce(next_payload->'events','[]'::jsonb)||jsonb_build_array(jsonb_build_object('status',next_payload->>'status','location',loc,'time',r.received_at,'label','Consignment received · '||arrived||' of '||total||' goods')));
  update public.axic_shipments set payload=next_payload,version=version+1 where id=s.id;
 end if;
 return jsonb_build_object('item',to_jsonb(g)||jsonb_build_object('receipts',(select coalesce(jsonb_agg(to_jsonb(a) order by received_at desc),'[]'::jsonb) from public.axic_receipts a where a.good_id=g.id)), 'receipt',to_jsonb(r),'received',arrived,'expected',total,'alreadyReceived',duplicate,'shipmentStatus',next_payload->>'status');
end $$;
-- Freeze the expected item set once receipt begins; repeat assignment is still safe.
create or replace function public.axic_assign_good(p_good uuid,p_consignment text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.axic_goods;
begin
 if not exists(select 1 from public.axic_consignments where id=p_consignment) then raise exception 'Consignment not found' using errcode='P0002';end if;
 perform 1 from public.axic_shipments where id=p_consignment for update;
 select * into g from public.axic_goods where id=p_good for update;
 if not found then raise exception 'Item not found' using errcode='P0002';end if;
 if g.consignment_id=p_consignment then return to_jsonb(g);end if;
 if g.consignment_id is not null then raise exception 'Item already assigned' using errcode='23505';end if;
 if exists(select 1 from public.axic_receipts r join public.axic_goods item on item.id=r.good_id where item.consignment_id=p_consignment) then raise exception 'Receipt already started' using errcode='23505';end if;
 update public.axic_goods set consignment_id=p_consignment,assigned_at=coalesce(assigned_at,now()) where id=p_good returning * into g;
 return to_jsonb(g);
end $$;
revoke all on function public.axic_receive_good(uuid,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.axic_receive_good(uuid,text,uuid,text,uuid) to service_role;
commit;
