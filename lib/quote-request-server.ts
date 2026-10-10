import {supabaseRequest,StorageError} from './supabase-server';
import type {QuoteRequest} from './quote-request';
async function db(){return process.env.DATABASE_URL?(await import('./prisma-server')).getPrisma():null}
async function run<T>(fn:()=>Promise<T>){try{return await fn()}catch{throw new StorageError(503)}}
export const quoteRequests={
 list:()=>run(async()=>{const prisma=await db();if(prisma)return (await prisma.quoteRequest.findMany({orderBy:{created:'desc'}})).map(r=>r.payload as unknown as QuoteRequest);return (await supabaseRequest<{payload:QuoteRequest}[]>('axic_quote_requests',{order:'created.desc'})).map(r=>r.payload)}),
 create:(request:QuoteRequest)=>run(async()=>{const prisma=await db();if(prisma)await prisma.quoteRequest.create({data:{id:request.id,payload:JSON.parse(JSON.stringify(request)),created:new Date(request.created)}});else await supabaseRequest('axic_quote_requests',{},'POST',{id:request.id,payload:request,created:request.created})}),
 update:(id:string,status:QuoteRequest['status'])=>run(async()=>{const prisma=await db();if(prisma)return (await prisma.$queryRaw<{payload:QuoteRequest}[]>`update public.axic_quote_requests set payload=jsonb_set(payload,'{status}',to_jsonb(${status}::text)) where id=${id} returning payload`)[0]?.payload;return (await supabaseRequest<{payload:QuoteRequest}[]>('rpc/axic_quote_request_status',{},'POST',{p_id:id,p_status:status}))[0]?.payload})
};
