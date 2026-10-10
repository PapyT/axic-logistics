begin;
create table public.axic_workflows(
 consignment_id text primary key references public.axic_consignments(id),
 origin text not null,destination text not null,
 stage text not null default 'Awaiting pickup' check(stage in ('Awaiting pickup','Pickup claimed','Collected','In transit','Arrival claimed','At destination','Delivery claimed','Delivered')),
 pickup_owner uuid,pickup_name text,destination_owner uuid,destination_name text,delivery_owner uuid,delivery_name text,
 updated timestamptz not null default now()
);
create table public.axic_workflow_scans(
 id uuid primary key,good_id uuid not null references public.axic_goods(id),
 consignment_id text not null references public.axic_workflows(consignment_id),
 phase text not null check(phase in ('pickup','arrival')),
 actor uuid not null,actor_name text not null,location text not null,
 scanned_at timestamptz not null default now(),unique(good_id,phase)
);
create index axic_workflow_scans_consignment_idx on public.axic_workflow_scans(consignment_id,phase);
create index axic_workflows_origin_idx on public.axic_workflows(origin,stage);
create index axic_workflows_destination_idx on public.axic_workflows(destination,stage);
create table public.axic_workflow_alerts(
 id uuid primary key default gen_random_uuid(),consignment_id text not null references public.axic_workflows(consignment_id),
 state text not null,kind text not null,created timestamptz not null default now()
);
create index axic_workflow_alerts_state_idx on public.axic_workflow_alerts(state,created desc);
create table public.axic_workflow_reads(alert_id uuid not null references public.axic_workflow_alerts(id),actor uuid not null,primary key(alert_id,actor));
alter table public.axic_workflows enable row level security;
alter table public.axic_workflow_scans enable row level security;
alter table public.axic_workflow_alerts enable row level security;
alter table public.axic_workflow_reads enable row level security;
revoke all on public.axic_workflows,public.axic_workflow_scans,public.axic_workflow_alerts,public.axic_workflow_reads from anon,authenticated;
grant select,insert,update on public.axic_workflows to service_role;
grant select,insert on public.axic_workflow_scans,public.axic_workflow_alerts,public.axic_workflow_reads to service_role;
create function public.axic_start_workflow() returns trigger language plpgsql security invoker set search_path='' as $$
declare s jsonb; eligible text[]:=array['Abia','Abuja','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
begin
 select payload into s from public.axic_shipments where id=new.shipment_id;
 if s->>'origin'=any(eligible) and s->>'destination'=any(eligible) then
  insert into public.axic_workflows(consignment_id,origin,destination) values(new.id,s->>'origin',s->>'destination');
  insert into public.axic_workflow_alerts(consignment_id,state,kind) values(new.id,s->>'origin','Pickup available');
 end if;
 return new;
end $$;
create trigger axic_consignment_workflow after insert on public.axic_consignments for each row execute function public.axic_start_workflow();
revoke all on function public.axic_start_workflow() from public,anon,authenticated;
-- Existing consignments retain their previous manual dispatch/receipt history.
create function public.axic_workflow_action(p_id text,p_action text,p_actor uuid,p_name text,p_state text,p_good uuid default null,p_scan uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.axic_workflows; s public.axic_shipments; g public.axic_goods; scan public.axic_workflow_scans; phase_name text; owner_id uuid; expected_state text; next_status text; next_label text; next_location text; total int; scanned int; next_payload jsonb;
begin
 -- Lock order matches assignment and receipt code: shipment, then workflow.
 select * into s from public.axic_shipments where id=p_id for update;
 select * into w from public.axic_workflows where consignment_id=p_id for update;
 if not found then raise exception 'Workflow not found' using errcode='P0002';end if;
 if s.payload->>'status'='Exception' then raise exception 'Resolve the exception before progressing this consignment' using errcode='23505';end if;
 if p_actor is null or p_state is null or p_state='' then raise exception 'Work state is required' using errcode='42501';end if;
 if p_action='claim_pickup' then
  if p_state<>w.origin then raise exception 'Wrong origin state' using errcode='42501';end if;
  if w.pickup_owner=p_actor then return to_jsonb(w);end if;
  if w.stage<>'Awaiting pickup' or w.pickup_owner is not null then raise exception 'Pickup already claimed' using errcode='23505';end if;
  update public.axic_workflows set stage='Pickup claimed',pickup_owner=p_actor,pickup_name=p_name,updated=now() where consignment_id=p_id returning * into w;
  next_status:='Booked';next_label:='On the way to collect';next_location:=w.origin;
 elsif p_action='dispatch' then
  if w.pickup_owner is distinct from p_actor or p_state<>w.origin then raise exception 'Pickup owner required' using errcode='42501';end if;
  if w.stage='In transit' then return to_jsonb(w);end if;
  if w.stage<>'Collected' then raise exception 'Scan every item before dispatch' using errcode='23505';end if;
  update public.axic_workflows set stage='In transit',updated=now() where consignment_id=p_id returning * into w;
  insert into public.axic_workflow_alerts(consignment_id,state,kind) values(p_id,w.destination,'Incoming consignment');
  next_status:='In transit';next_label:='Dispatched to '||w.destination;next_location:=w.origin;
 elsif p_action='claim_arrival' then
  if p_state<>w.destination then raise exception 'Wrong destination state' using errcode='42501';end if;
  if w.destination_owner=p_actor then return to_jsonb(w);end if;
  if w.stage<>'In transit' or w.destination_owner is not null then raise exception 'Arrival already claimed or not dispatched' using errcode='23505';end if;
  update public.axic_workflows set stage='Arrival claimed',destination_owner=p_actor,destination_name=p_name,updated=now() where consignment_id=p_id returning * into w;
  next_status:='In transit';next_label:='Destination handover claimed';next_location:=s.payload->>'location';
 elsif p_action='claim_delivery' then
  if p_state<>w.destination then raise exception 'Wrong destination state' using errcode='42501';end if;
  if w.delivery_owner=p_actor then return to_jsonb(w);end if;
  if w.stage<>'At destination' or w.delivery_owner is not null then raise exception 'Delivery already claimed or receipt incomplete' using errcode='23505';end if;
  -- The receiving staff member retains responsibility for the final delivery.
  if w.destination_owner is distinct from p_actor then raise exception 'Receiving staff member must start delivery' using errcode='42501';end if;
  update public.axic_workflows set stage='Delivery claimed',delivery_owner=p_actor,delivery_name=p_name,updated=now() where consignment_id=p_id returning * into w;
  next_status:='Out for delivery';next_label:='Out for delivery';next_location:=w.destination;
 elsif p_action='deliver' then
  if w.delivery_owner is distinct from p_actor or p_state<>w.destination then raise exception 'Delivery owner required' using errcode='42501';end if;
  if w.stage='Delivered' then return to_jsonb(w);end if;
  if w.stage<>'Delivery claimed' then raise exception 'Start delivery first' using errcode='23505';end if;
  update public.axic_workflows set stage='Delivered',updated=now() where consignment_id=p_id returning * into w;
  next_status:='Delivered';next_label:='Delivered to receiver';next_location:=w.destination;
 elsif p_action in ('scan_pickup','scan_arrival') then
  phase_name:=case when p_action='scan_pickup' then 'pickup' else 'arrival' end;
  owner_id:=case when phase_name='pickup' then w.pickup_owner else w.destination_owner end;
  expected_state:=case when phase_name='pickup' then w.origin else w.destination end;
  if p_state<>expected_state or owner_id is distinct from p_actor then raise exception 'Claim this handover before scanning' using errcode='42501';end if;
  select * into g from public.axic_goods where id=p_good and consignment_id=p_id;
  if not found then raise exception 'Item does not belong to this consignment' using errcode='P0002';end if;
  select * into scan from public.axic_workflow_scans where good_id=p_good and phase=phase_name;
  if found then return to_jsonb(w);end if;
  if w.stage<>(case when phase_name='pickup' then 'Pickup claimed' else 'Arrival claimed' end) then raise exception 'Wrong handover stage' using errcode='23505';end if;
  insert into public.axic_workflow_scans(id,good_id,consignment_id,phase,actor,actor_name,location) values(p_scan,p_good,p_id,phase_name,p_actor,p_name,expected_state);
  select count(*) into total from public.axic_goods where consignment_id=p_id;
  select count(*) into scanned from public.axic_workflow_scans where consignment_id=p_id and phase=phase_name;
  if scanned<total then update public.axic_workflows set updated=now() where consignment_id=p_id returning * into w;return to_jsonb(w);end if;
  update public.axic_workflows set stage=case when phase_name='pickup' then 'Collected' else 'At destination' end,updated=now() where consignment_id=p_id returning * into w;
  next_status:=case when phase_name='pickup' then 'Collected' else 'At hub' end;
  next_label:=case when phase_name='pickup' then 'Collected from sender' else 'Received in '||w.destination end;
  next_location:=expected_state;
 else raise exception 'Invalid workflow action' using errcode='22023';end if;
 next_payload:=jsonb_set(jsonb_set(s.payload,'{status}',to_jsonb(next_status)),'{location}',to_jsonb(next_location));
 next_payload:=jsonb_set(next_payload,'{events}',coalesce(next_payload->'events','[]'::jsonb)||jsonb_build_array(jsonb_build_object('status',next_status,'location',next_location,'time',now(),'label',next_label)));
 update public.axic_shipments set payload=next_payload,version=version+1 where id=p_id;
 return to_jsonb(w);
end $$;
revoke all on function public.axic_workflow_action(text,text,uuid,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.axic_workflow_action(text,text,uuid,text,text,uuid,uuid) to service_role;
commit;
