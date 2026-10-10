import {restStorage} from './supabase-server';
export {StorageError} from './supabase-server';
// Existing deployments keep working while the pooled DATABASE_URL is configured.
// Once present, every portal/customer data operation uses Prisma. Connection
// failures are surfaced, never silently redirected to a different backend.
async function backend(){
 if(!process.env.DATABASE_URL)return restStorage;
 const [{getPrisma},{createPrismaStorage}]=await Promise.all([import('./prisma-server'),import('./prisma-storage')]);
 return createPrismaStorage(getPrisma());
}
export const storage={
 listShipments:async()=>(await backend()).listShipments(),
 getShipment:async(...args:Parameters<typeof restStorage.getShipment>)=>(await backend()).getShipment(...args),
 createShipment:async(...args:Parameters<typeof restStorage.createShipment>)=>(await backend()).createShipment(...args),
 updateShipment:async(...args:Parameters<typeof restStorage.updateShipment>)=>(await backend()).updateShipment(...args),
 listTickets:async()=>(await backend()).listTickets(),
 createTicket:async(...args:Parameters<typeof restStorage.createTicket>)=>(await backend()).createTicket(...args),
 updateTicket:async(...args:Parameters<typeof restStorage.updateTicket>)=>(await backend()).updateTicket(...args)
};
