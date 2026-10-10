import {workflow} from '@/lib/workflow-server';
import {getOperator,requireAdmin} from '@/lib/auth-server';
import {consignments} from '@/lib/consignment-server';
import {parseGoodCode,receiptLocation} from '@/lib/consignment';
import {StorageError} from '@/lib/supabase-server';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const denied=await requireAdmin(req);if(denied)return denied;
 let id:string,location:string;
 try{const body=await req.json();id=parseGoodCode(body.code);location=receiptLocation(body.location).location}catch(e){return Response.json({error:e instanceof Error?e.message:'Enter an item code and receiving location.'},{status:400})}
 const user=await getOperator();if(!user)return Response.json({error:'Sign in to confirm receipt.'},{status:401});
 try{const good=await consignments.getGood(id);if(good?.consignment_id&&await workflow.get(good.consignment_id))return Response.json({error:'Use Pickup & handovers: claim the collection or destination handover before scanning.'},{status:409});return Response.json(await consignments.receive(id,location,user.id,user.email??'AXIC operator'),{headers:{'Cache-Control':'private, no-store'}})}catch(e){if(e instanceof StorageError&&e.status===404)return Response.json({error:'Item not found.'},{status:404});if(e instanceof StorageError&&e.status===409)return Response.json({error:'Assign this item to a consignment before receiving it. Shipments out for delivery or already delivered cannot receive new warehouse arrivals.'},{status:409});return Response.json({error:'Receipt confirmation is unavailable. Try again.'},{status:503})}
}
