import type {PrismaClient,Prisma} from '../generated/prisma/client';
import type {Shipment} from './freight';
import {StorageError,type ShipmentRow,type Ticket} from './supabase-server';
// A supplied client makes the real storage operations testable without credentials.
export function createPrismaStorage(db:PrismaClient){
 const shipment=(row:{id:string;payload:Prisma.JsonValue;version:number}|null):ShipmentRow|undefined=>row?{...row,payload:row.payload as unknown as Shipment}:undefined;
 const ticket=(row:{id:string;subject:string;message:string;status:string;created:Date}|null):Ticket|undefined=>row?{...row,created:row.created.toISOString()}:undefined;
 const payload=(s:Shipment)=>JSON.parse(JSON.stringify(s)) as Prisma.InputJsonValue;
 async function run<T>(fn:()=>Promise<T>):Promise<T>{try{return await fn()}catch(e){throw new StorageError(typeof e==='object'&&e!==null&&'code' in e&&e.code==='P2002'?409:503)}}
 return {
  listShipments:()=>run(async()=>(await db.shipment.findMany()).map(row=>shipment(row)!)),
  getShipment:(id:string)=>run(async()=>shipment(await db.shipment.findUnique({where:{id}}))),
  createShipment:(s:Shipment)=>run(async()=>shipment(await db.shipment.create({data:{id:s.id,payload:payload(s),version:0}}))!),
  // Returning the changed row from this single conditional UPDATE avoids a
  // read-after-write race and preserves version-based optimistic concurrency.
  updateShipment:(row:ShipmentRow,s:Shipment)=>run(async()=>shipment((await db.shipment.updateManyAndReturn({where:{id:row.id,version:row.version},data:{payload:payload(s),version:{increment:1}}}))[0]??null)),
  listTickets:()=>run(async()=>(await db.supportTicket.findMany({orderBy:{created:'desc'}})).map(row=>ticket(row)!)),
  createTicket:(t:Ticket)=>run(async()=>ticket(await db.supportTicket.create({data:{...t,created:new Date(t.created)}}))!),
  updateTicket:(id:string,status:string)=>run(async()=>ticket((await db.supportTicket.updateManyAndReturn({where:{id},data:{status}}))[0]??null))
 };
}
