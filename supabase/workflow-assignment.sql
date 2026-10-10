begin;
create or replace function public.axic_assign_good(p_good uuid,p_consignment text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.axic_goods;
begin
 if not exists(select 1 from public.axic_consignments where id=p_consignment) then raise exception 'Consignment not found' using errcode='P0002';end if;
 perform 1 from public.axic_shipments where id=p_consignment for update;
 select * into g from public.axic_goods where id=p_good for update;
 if not found then raise exception 'Item not found' using errcode='P0002';end if;
 if g.consignment_id=p_consignment then return to_jsonb(g);end if;
 if exists(select 1 from public.axic_workflows where consignment_id=p_consignment and stage<>'Awaiting pickup') then raise exception 'Pickup already started: items are frozen' using errcode='23505';end if;
 if g.consignment_id is not null then raise exception 'Item already assigned' using errcode='23505';end if;
 if exists(select 1 from public.axic_receipts r join public.axic_goods item on item.id=r.good_id where item.consignment_id=p_consignment) then raise exception 'Receipt already started' using errcode='23505';end if;
 update public.axic_goods set consignment_id=p_consignment,assigned_at=coalesce(assigned_at,now()) where id=p_good returning * into g;
 return to_jsonb(g);
end $$;
commit;
