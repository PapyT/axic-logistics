import {requireOperator} from '@/lib/auth-server';
import {consignments} from '@/lib/consignment-server';
export const dynamic='force-dynamic';
export async function GET(){const denied=await requireOperator();if(denied)return denied;try{return Response.json(await consignments.list(),{headers:{'Cache-Control':'private, no-store'}})}catch{return Response.json({error:'Consignments are unavailable. Check the database configuration.'},{status:503})}}
