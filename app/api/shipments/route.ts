import {contact,goodsInput,type GoodInput,type Contact} from '@/lib/consignment';
import {consignments} from '@/lib/consignment-server';
import {requireOperator} from '@/lib/auth-server';
import {storage,StorageError} from '@/lib/storage-server';
import {quote,statuses,normaliseShipment,locationName,type QuoteInput,type Shipment} from '@/lib/freight';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const retiredSampleIds=new Set(['AX-204810','AX-204811','AX-204812','AX-204813','AX-204814','AX-204815']);
const unavailable=()=>Response.json({error:'The shipment service is unavailable. Check server configuration or try again.'},{status:503});
export async function GET(req:Request){
 try{
  const id=new URL(req.url).searchParams.get('id')?.trim().toUpperCase();
  if(id){if(id.length>40)return Response.json({error:'Invalid tracking ID.'},{status:400});const row=await storage.getShipment(id);const raw=retiredSampleIds.has(id)?undefined:row?.payload;const shipment=raw?normaliseShipment(raw):undefined;const publicShipment=shipment?{id:shipment.id,origin:shipment.origin,destination:shipment.destination,service:shipment.service,weight:shipment.weight,status:shipment.status,location:shipment.location,events:shipment.events}:undefined;return Response.json(publicShipment??{error:'Shipment not found. Check the tracking ID.'},{status:shipment?200:404,headers:{'Cache-Control':'no-store'}});}
  const denied=await requireOperator();if(denied)return denied;const rows=await storage.listShipments();return Response.json(rows.filter(r=>!retiredSampleIds.has(r.id)).map(r=>normaliseShipment(r.payload)).sort((a,b)=>b.created.localeCompare(a.created)),{headers:{'Cache-Control':'no-store'}});
 }catch{return unavailable();}
}
export async function POST(req:Request){
 let body:QuoteInput&{customer:string;sender?:Contact;receiver?:Contact;kind?:string;goods?:GoodInput[]};let estimate:ReturnType<typeof quote>;let sender:Contact|undefined,receiver:Contact|undefined,goods:GoodInput[]=[];
 try{body=await req.json() as typeof body;if(body.kind!==undefined&&!['shipment','consignment'].includes(body.kind))throw Error('Choose a valid booking type.');if(body.kind==='consignment'){const denied=await requireOperator(req);if(denied)return denied;sender=contact(body.sender);receiver=contact(body.receiver);goods=goodsInput(body.goods);body.weight=goods.reduce((sum,g)=>sum+g.weight,0);}else if(body.sender||body.receiver){sender=contact(body.sender);receiver=contact(body.receiver);}estimate=quote(body);body={...body,origin:locationName(body.origin),destination:locationName(body.destination)};if(typeof body.customer!=='string'||!body.customer.trim()||body.customer.length>80)throw new Error('Enter a customer or company name, up to 80 characters.');}catch(e){return Response.json({error:e instanceof SyntaxError?'Invalid booking request.':e instanceof Error?e.message:'Invalid booking request.'},{status:400});}
 const time=new Date().toISOString();const s:Shipment={id:'AX-'+crypto.randomUUID().slice(0,8).toUpperCase(),origin:body.origin,destination:body.destination,service:body.service,weight:body.weight,amount:estimate.total,status:'Booked',customer:body.customer.trim(),driver:'Unassigned',location:body.origin,created:time,...(sender&&receiver?{sender,receiver}:{}),kind:goods.length?'consignment':'shipment',events:[{status:'Booked',location:body.origin,time}]};
 try{if(goods.length)await consignments.create(s,sender!,receiver!,goods);else await storage.createShipment(s);return Response.json(s,{status:201});}catch{return unavailable();}
}
export async function PATCH(req:Request){
 const denied=await requireOperator(req);if(denied)return denied;
 let body:Record<string,unknown>;
 try{body=await req.json() as typeof body;if(!body||!statuses.includes(String(body.status))||typeof body.id!=='string'||body.id.length>40||typeof body.location!=='string'||!body.location.trim()||body.location.length>120||typeof body.driver!=='string'||body.driver.length>80)throw new Error();}catch{return Response.json({error:'Provide a valid status, location and driver.'},{status:400});}
 try{
  const id=String(body.id);const row=await storage.getShipment(id);const raw=retiredSampleIds.has(id)?undefined:row?.payload;const s=raw?normaliseShipment(raw):undefined;if(!s)return Response.json({error:'Shipment not found.'},{status:404});
  const nextStatus=String(body.status),nextLocation=locationName(String(body.location)),nextDriver=String(body.driver).trim()||'Unassigned';
  const statusChanged=nextStatus!==s.status,locationChanged=nextLocation!==s.location,driverChanged=nextDriver!==s.driver;
  if(!statusChanged&&!locationChanged&&!driverChanged)return Response.json(s);
  const label=statusChanged?nextStatus:locationChanged&&driverChanged?'Driver & location updated':locationChanged?'Location updated':nextDriver==='Unassigned'?'Driver unassigned':s.driver==='Unassigned'?'Driver assigned':'Driver reassigned';
  const updated:Shipment={...s,status:nextStatus,location:nextLocation,driver:nextDriver,events:[...s.events,{status:nextStatus,location:nextLocation,time:new Date().toISOString(),label}]};
  const saved=row?await storage.updateShipment(row,updated):await storage.createShipment(updated);
  if(!saved)return Response.json({error:'This shipment changed while you were editing. Refresh and try again.'},{status:409});return Response.json(saved.payload);
 }catch(e){if(e instanceof StorageError&&e.status===409)return Response.json({error:'This shipment changed while you were editing. Refresh and try again.'},{status:409});return unavailable();}
}
