begin;
do $$
declare request_id text:='QT-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));result public.axic_quote_requests;count_before bigint;
begin
 select count(*) into count_before from public.axic_shipments;
 insert into public.axic_quote_requests(id,payload) values(request_id,'{"status":"New","contact":{"name":"SQL verification"},"estimate":7500}');
 select * into result from public.axic_quote_request_status(request_id,'Contacted');
 if result.payload->>'status'<>'Contacted' then raise exception 'Quote status update failed';end if;
 if (select count(*) from public.axic_shipments)<>count_before then raise exception 'Quote enquiry created a shipment';end if;
 if has_table_privilege('anon','public.axic_quote_requests','SELECT') or has_table_privilege('authenticated','public.axic_quote_requests','INSERT') or has_function_privilege('anon','public.axic_quote_request_status(text,text)','EXECUTE') then raise exception 'Quote intake grants are public';end if;
end $$;
rollback;
