import {getOperator} from '@/lib/auth-server';
import {canAccessShipment} from '@/lib/operator-scope';
import {storage} from '@/lib/storage-server';
import {consignments} from '@/lib/consignment-server';
export const dynamic='force-dynamic';
export async function GET(){const user=await getOperator();if(!user)return Response.json({error:'Sign in to continue.'},{status:401});try{const [items,shipments]=await Promise.all([consignments.list(),storage.listShipments()]);const permitted=new Set(shipments.filter(s=>canAccessShipment(user,s.payload)).map(s=>s.id));return Response.json(items.filter(c=>permitted.has(c.shipment_id)),{headers:{'Cache-Control':'private, no-store'}})}catch{return Response.json({error:'Consignments are unavailable. Check the database configuration.'},{status:503})}}
