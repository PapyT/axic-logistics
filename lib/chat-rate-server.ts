import {supabaseRequest} from './supabase-server';
export async function consumeChat(identity:string){
 if(process.env.DATABASE_URL){
  const {getPrisma}=await import('./prisma-server');
  const rows=await getPrisma().$queryRaw<{allowed:boolean}[]>`select public.axic_consume_chat(${identity}::text) as allowed`;
  return rows[0]?.allowed===true;
 }
 return await supabaseRequest<boolean>('rpc/axic_consume_chat',{},'POST',{p_identity:identity});
}
