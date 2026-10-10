import {supabaseRequest,StorageError} from './supabase-server';
import type {Shipment} from './freight';
import type {Consignment,Contact,Good,GoodInput} from './consignment';
async function db(){if(!process.env.DATABASE_URL)return null;return (await import('./prisma-server')).getPrisma()}
async function run<T>(action:()=>Promise<T>){try{return await action()}catch(e){if(e instanceof StorageError)throw e;throw new StorageError(typeof e==='object'&&e&&'code' in e&&e.code==='P2002'?409:503)}}
const good=(g:{id:string;description:string;weight:number;consignmentId:string|null;created:Date;assignedAt:Date|null}):Good=>({id:g.id,description:g.description,weight:g.weight,consignment_id:g.consignmentId,created:g.created.toISOString(),assigned_at:g.assignedAt?.toISOString()??null});
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
  const prisma=await db();if(prisma)return (await prisma.consignment.findMany({include:{goods:true},orderBy:{created:'desc'}})).map(c=>({id:c.id,shipment_id:c.shipmentId,sender:c.sender as unknown as Contact,receiver:c.receiver as unknown as Contact,created:c.created.toISOString(),goods:c.goods.map(good)}));
  const [rows,goods]=await Promise.all([supabaseRequest<Omit<Consignment,'goods'>[]>('axic_consignments',{order:'created.desc'}),supabaseRequest<Good[]>('axic_goods')]);return rows.map(c=>({...c,goods:goods.filter(g=>g.consignment_id===c.id)}));
 }),
 getGood:(id:string)=>run(async()=>{const prisma=await db();if(prisma){const row=await prisma.good.findUnique({where:{id}});return row?good(row):undefined;}return (await supabaseRequest<Good[]>('axic_goods',{id:'eq.'+id,limit:'1'}))[0]}),
 createGood:(input:GoodInput)=>run(async()=>{const data={id:crypto.randomUUID(),...input};const prisma=await db();if(prisma)return good(await prisma.good.create({data}));return (await supabaseRequest<Good[]>('axic_goods',{},'POST',data))[0]}),
 assign:(id:string,consignmentId:string)=>run(async()=>{
  const prisma=await db();if(prisma)return prisma.$transaction(async tx=>{
   if(!await tx.consignment.findUnique({where:{id:consignmentId}}))throw new StorageError(404);
   const existing=await tx.good.findUnique({where:{id}});if(!existing)throw new StorageError(404);if(existing.consignmentId===consignmentId)return good(existing);
   const changed=await tx.good.updateManyAndReturn({where:{id,OR:[{consignmentId:null},{consignmentId}]},data:{consignmentId,assignedAt:new Date()}});
   if(changed[0])return good(changed[0]);if(await tx.good.findUnique({where:{id}}))throw new StorageError(409);throw new StorageError(404);
  });
  try{return await supabaseRequest<Good>('rpc/axic_assign_good',{},'POST',{p_good:id,p_consignment:consignmentId})}catch(e){if(e instanceof StorageError&&e.status===409)throw e;if(e instanceof StorageError&&e.status===404)throw e;throw e;}
 })
};
