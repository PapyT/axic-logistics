import {storage,StorageError} from '@/lib/supabase-server';
import {demoShipments,quote,statuses,type QuoteInput,type Shipment} from '@/lib/freight';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const unavailable=()=>Response.json({error:'The shipment service is unavailable. Check server configuration or try again.'},{status:503});
export async function GET(req:Request){
 try{
  const id=new URL(req.url).searchParams.get('id')?.trim().toUpperCase();
  if(id){if(id.length>40)return Response.json({error:'Invalid tracking ID.'},{status:400});const row=await storage.getShipment(id);const shipment=row?.payload??demoShipments.find(s=>s.id===id);return Response.json(shipment??{error:'Shipment not found. Check the tracking ID or try AX-204810.'},{status:shipment?200:404,headers:{'Cache-Control':'no-store'}});}
  const rows=await storage.listShipments();const map=new Map(demoShipments.map(s=>[s.id,s]));rows.forEach(r=>map.set(r.id,r.payload));return Response.json([...map.values()].sort((a,b)=>b.created.localeCompare(a.created)),{headers:{'Cache-Control':'no-store'}});
 }catch{return unavailable();}
}
export async function POST(req:Request){
 let body:QuoteInput&{customer:string};let estimate:ReturnType<typeof quote>;
 try{body=await req.json() as typeof body;estimate=quote(body);if(typeof body.customer!=='string'||!body.customer.trim()||body.customer.length>80)throw new Error('Enter a demo company name, up to 80 characters.');}catch(e){return Response.json({error:e instanceof SyntaxError?'Invalid booking request.':e instanceof Error?e.message:'Invalid booking request.'},{status:400});}
 const time=new Date().toISOString();const s:Shipment={id:'AX-'+crypto.randomUUID().slice(0,8).toUpperCase(),origin:body.origin,destination:body.destination,service:body.service,weight:body.weight,amount:estimate.total,status:'Booked',customer:body.customer.trim(),driver:'Unassigned',location:body.origin,created:time,events:[{status:'Booked',location:body.origin,time}]};
 try{await storage.createShipment(s);return Response.json(s,{status:201});}catch{return unavailable();}
}
export async function PATCH(req:Request){
 let body:Record<string,unknown>;
 try{body=await req.json() as typeof body;if(!body||!statuses.includes(String(body.status))||typeof body.id!=='string'||body.id.length>40||typeof body.location!=='string'||!body.location.trim()||body.location.length>120||typeof body.driver!=='string'||body.driver.length>80)throw new Error();}catch{return Response.json({error:'Provide a valid status, location and driver.'},{status:400});}
 try{
  const id=String(body.id);const row=await storage.getShipment(id);const s=row?.payload??demoShipments.find(s=>s.id===id);if(!s)return Response.json({error:'Shipment not found.'},{status:404});
  const updated:Shipment={...s,status:String(body.status),location:String(body.location).trim(),driver:String(body.driver).trim()||'Unassigned',events:[...s.events,{status:String(body.status),location:String(body.location).trim(),time:new Date().toISOString()}]};
  const saved=row?await storage.updateShipment(row,updated):await storage.createShipment(updated);
  if(!saved)return Response.json({error:'This shipment changed while you were editing. Refresh and try again.'},{status:409});return Response.json(saved.payload);
 }catch(e){if(e instanceof StorageError&&e.status===409)return Response.json({error:'This shipment changed while you were editing. Refresh and try again.'},{status:409});return unavailable();}
}
