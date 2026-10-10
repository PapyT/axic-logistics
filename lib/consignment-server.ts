import {supabaseRequest,StorageError} from './supabase-server';
import type {Shipment} from './freight';
import {receiptLocation} from './consignment';
import type {Consignment,Contact,Good,GoodInput,Receipt,ReceiptResult} from './consignment';
async function db(){if(!process.env.DATABASE_URL)return null;return (await import('./prisma-server')).getPrisma()}
async function run<T>(action:()=>Promise<T>){try{return await action()}catch(e){if(e instanceof StorageError)throw e;const code=typeof e==='object'&&e&&'code' in e?String(e.code):'';const pg=typeof e==='object'&&e&&'meta' in e?(e.meta as {code?:string})?.code:'';throw new StorageError(code==='P2002'||pg==='23505'?409:pg==='P0002'?404:503)}}
const good=(g:{id:string;description:string;weight:number;consignmentId:string|null;created:Date;assignedAt:Date|null;receipts?:{id:string;goodId:string;location:string;locationKey:string;receivedBy:string;receivedByName:string;receivedAt:Date}[]}):Good=>({id:g.id,description:g.description,weight:g.weight,consignment_id:g.consignmentId,created:g.created.toISOString(),assigned_at:g.assignedAt?.toISOString()??null,receipts:(g.receipts??[]).map(r=>({id:r.id,good_id:r.goodId,location:r.location,location_key:r.locationKey,received_by:r.receivedBy,received_by_name:r.receivedByName,received_at:r.receivedAt.toISOString()}))});
export const consignments={
 create:(shipment:Shipment,sender:Contact,receiver:Contact,items:GoodInput[])=>run(async()=>{
  const goods=items.map(g=>({...g,id:crypto.randomUUID()}));const prisma=await db();
  if(prisma){await prisma.$transaction(async tx=>{
   await tx.shipment.create({data:{id:shipment.id,payload:JSON.parse(JSON.stringify(shipment)),version:0}});
   await tx.consignment.create({data:{id:shipment.id,shipmentId:shipment.id,sender:JSON.parse(JSON.stringify(sender)),receiver:JSON.parse(JSON.stringify(receiver)),goods:{create:goods.map(g=>({...g,assignedAt:new Date()}))}}});
  });return shipment;}
  return supabaseRequest<Shipment>('rpc/axic_create_consignment',{},'POST',{p_shipment:shipment,p_sender:sender,p_receiver:receiver,p_goods:goods});
 }),
 list:()=>run(async():Promise<Consignment[]>=>{
  const prisma=await db();if(prisma)return (await prisma.consignment.findMany({include:{goods:{include:{receipts:true}}},orderBy:{created:'desc'}})).map(c=>({id:c.id,shipment_id:c.shipmentId,sender:c.sender as unknown as Contact,receiver:c.receiver as unknown as Contact,created:c.created.toISOString(),goods:c.goods.map(good)}));
  const [rows,goods,receipts]=await Promise.all([supabaseRequest<Omit<Consignment,'goods'>[]>('axic_consignments',{order:'created.desc'}),supabaseRequest<Good[]>('axic_goods'),supabaseRequest<Receipt[]>('axic_receipts')]);return rows.map(c=>({...c,goods:goods.filter(g=>g.consignment_id===c.id).map(g=>({...g,receipts:receipts.filter(r=>r.good_id===g.id)}))}));
 }),
 getGood:(id:string)=>run(async()=>{const prisma=await db();if(prisma){const row=await prisma.good.findUnique({where:{id},include:{receipts:true}});return row?good(row):undefined;}const row=(await supabaseRequest<Good[]>('axic_goods',{id:'eq.'+id,limit:'1'}))[0];return row?{...row,receipts:await supabaseRequest<Receipt[]>('axic_receipts',{good_id:'eq.'+id,order:'received_at.desc'})}:undefined}),
 createGood:(input:GoodInput)=>run(async()=>{const data={id:crypto.randomUUID(),...input};const prisma=await db();if(prisma)return good(await prisma.good.create({data}));return (await supabaseRequest<Good[]>('axic_goods',{},'POST',data))[0]}),
 assign:(id:string,consignmentId:string)=>run(async()=>{
  const prisma=await db();if(prisma){const rows=await prisma.$queryRaw<{item:Good}[]>`select public.axic_assign_good(${id}::uuid,${consignmentId}::text) as item`;return rows[0].item;}
  try{return await supabaseRequest<Good>('rpc/axic_assign_good',{},'POST',{p_good:id,p_consignment:consignmentId})}catch(e){if(e instanceof StorageError&&e.status===409)throw e;if(e instanceof StorageError&&e.status===404)throw e;throw e;}
 }),
 receive:(id:string,location:string,actor:string,actorName:string)=>run(async()=>{
  location=receiptLocation(location).location;const receiptId=crypto.randomUUID();const prisma=await db();
  if(prisma){const rows=await prisma.$queryRaw<{result:ReceiptResult}[]>`select public.axic_receive_good(${id}::uuid,${location}::text,${actor}::uuid,${actorName}::text,${receiptId}::uuid) as result`;return rows[0].result;}
  return supabaseRequest<ReceiptResult>('rpc/axic_receive_good',{},'POST',{p_good:id,p_location:location,p_actor:actor,p_actor_name:actorName,p_receipt:receiptId});
 })
};
