import {storage} from '@/lib/supabase-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const unavailable=()=>Response.json({error:'Support is unavailable. Check server configuration or try again.'},{status:503});
export async function GET(){try{return Response.json(await storage.listTickets(),{headers:{'Cache-Control':'no-store'}})}catch{return unavailable()}}
export async function POST(req:Request){
 let b:Record<string,unknown>;
 try{b=await req.json() as typeof b;if(!b||typeof b.subject!=='string'||!b.subject.trim()||b.subject.length>100||typeof b.message!=='string'||!b.message.trim()||b.message.length>1000)throw new Error();}catch{return Response.json({error:'Enter a subject and message (up to 1,000 characters).'},{status:400})}
 const t={id:'TK-'+crypto.randomUUID().slice(0,8).toUpperCase(),subject:String(b.subject).trim(),message:String(b.message).trim(),status:'Open',created:new Date().toISOString()};
 try{await storage.createTicket(t);return Response.json(t,{status:201})}catch{return unavailable()}
}
export async function PATCH(req:Request){
 let b:Record<string,unknown>;
 try{b=await req.json() as typeof b;if(!b||!['Open','Resolved'].includes(String(b.status))||typeof b.id!=='string'||b.id.length>40)throw new Error();}catch{return Response.json({error:'Invalid ticket update.'},{status:400})}
 try{const t=await storage.updateTicket(String(b.id),String(b.status));return Response.json(t??{error:'Ticket not found.'},{status:t?200:404})}catch{return unavailable()}
}
