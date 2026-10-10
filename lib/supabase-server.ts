// Imported only by server API routes. No secret is returned to a client.
export type ShipmentRow={id:string;payload:import('./freight').Shipment;version:number};
export type Ticket={id:string;subject:string;message:string;status:string;created:string};
export class StorageError extends Error {readonly status:number;constructor(status:number){super('Database request failed.');this.status=status}}
export async function supabaseRequest<T>(table:'axic_shipments'|'axic_tickets'|'axic_consignments'|'axic_goods'|'rpc/axic_create_consignment'|'axic_receipts'|'rpc/axic_receive_good'|'rpc/axic_assign_good'|'axic_workflows'|'axic_workflow_scans'|'axic_workflow_alerts'|'axic_workflow_reads'|'rpc/axic_workflow_action'|'axic_quote_requests'|'rpc/axic_quote_request_status',query:Record<string,string>={},method='GET',body?:unknown):Promise<T>{
  if(typeof window!=='undefined')throw new Error('Server-only database access.');
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)throw new Error('Database configuration missing.');
  const origin=new URL(url);
  if(origin.protocol!=='https:')throw new Error('Database configuration invalid.');
  const endpoint=new URL('/rest/v1/'+table,origin);
  Object.entries(query).forEach(([k,v])=>endpoint.searchParams.set(k,v));
  const headers:Record<string,string>={apikey:key,'Content-Type':'application/json',Prefer:'return=representation'};
  // Current sb_secret_ keys are API keys, not JWTs. Legacy service_role JWTs
  // require Authorization as well. Neither key ever goes to browser code.
  if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  const response=await fetch(endpoint,{method,headers,cache:'no-store',...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new StorageError(response.status);
  return response.json() as Promise<T>;
}
export const restStorage={
  listShipments:()=>supabaseRequest<ShipmentRow[]>('axic_shipments',{select:'id,payload,version'}),
  getShipment:async(id:string)=>(await supabaseRequest<ShipmentRow[]>('axic_shipments',{id:'eq.'+id,select:'id,payload,version',limit:'1'}))[0],
  createShipment:async(payload:import('./freight').Shipment)=>(await supabaseRequest<ShipmentRow[]>('axic_shipments',{},'POST',{id:payload.id,payload,version:0}))[0],
  updateShipment:async(row:ShipmentRow,payload:import('./freight').Shipment)=>(await supabaseRequest<ShipmentRow[]>('axic_shipments',{id:'eq.'+row.id,version:'eq.'+row.version},'PATCH',{payload,version:row.version+1}))[0],
  listTickets:()=>supabaseRequest<Ticket[]>('axic_tickets',{select:'id,subject,message,status,created',order:'created.desc'}),
  createTicket:async(ticket:Ticket)=>(await supabaseRequest<Ticket[]>('axic_tickets',{},'POST',ticket))[0],
  updateTicket:async(id:string,status:string)=>(await supabaseRequest<Ticket[]>('axic_tickets',{id:'eq.'+id},'PATCH',{status}))[0]
};
