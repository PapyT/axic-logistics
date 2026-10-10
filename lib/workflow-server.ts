import {supabaseRequest,StorageError} from './supabase-server';
import type {Workflow,WorkflowAction,WorkflowData,WorkflowAlert,WorkflowScan} from './workflow';
async function db(){return process.env.DATABASE_URL?(await import('./prisma-server')).getPrisma():null}
async function run<T>(fn:()=>Promise<T>){try{return await fn()}catch(e){if(e instanceof StorageError)throw e;const pg=typeof e==='object'&&e&&'meta' in e?(e.meta as {code?:string})?.code:'';throw new StorageError(pg==='42501'?403:pg==='P0002'?404:pg==='23505'?409:503)}}
export const workflow={
 get:(id:string)=>run(async()=>{const prisma=await db();if(prisma)return (await prisma.$queryRaw<Workflow[]>`select * from public.axic_workflows where consignment_id=${id}`)[0];return (await supabaseRequest<Workflow[]>('axic_workflows',{consignment_id:'eq.'+id,limit:'1'}))[0]}),
 list:(state:string,actor:string,admin:boolean)=>run(async():Promise<WorkflowData>=>{
  const prisma=await db();let jobs:Workflow[],scans:WorkflowScan[],alerts:Omit<WorkflowAlert,'read'>[],reads:{alert_id:string}[];
  if(prisma){[jobs,scans,alerts,reads]=await Promise.all([
   prisma.$queryRaw<Workflow[]>`select * from public.axic_workflows where ${admin} or origin=${state} or destination=${state} order by updated desc`,
   prisma.$queryRaw<WorkflowScan[]>`select s.* from public.axic_workflow_scans s join public.axic_workflows w on w.consignment_id=s.consignment_id where ${admin} or w.origin=${state} or w.destination=${state}`,
   prisma.$queryRaw<Omit<WorkflowAlert,'read'>[]>`select * from public.axic_workflow_alerts where ${admin} or state=${state} order by created desc limit 100`,
   prisma.$queryRaw<{alert_id:string}[]>`select alert_id from public.axic_workflow_reads where actor=${actor}::uuid`
  ]);}else{const scope:Record<string,string>=admin?{}:{or:`(origin.eq.${state},destination.eq.${state})`};[jobs,alerts,reads]=await Promise.all([supabaseRequest<Workflow[]>('axic_workflows',{...scope,order:'updated.desc'}),supabaseRequest<Omit<WorkflowAlert,'read'>[]>('axic_workflow_alerts',{...(admin?{}:{state:'eq.'+state}),order:'created.desc',limit:'100'}),supabaseRequest<{alert_id:string}[]>('axic_workflow_reads',{actor:'eq.'+actor})]);scans=jobs.length?await supabaseRequest<WorkflowScan[]>('axic_workflow_scans',{consignment_id:'in.('+jobs.map(j=>j.consignment_id).join(',')+')'}):[];}
  const seen=new Set(reads.map(r=>r.alert_id));return {jobs,scans,alerts:alerts.map(a=>({...a,read:seen.has(a.id)}))};
 }),
 action:(id:string,action:WorkflowAction,actor:string,name:string,state:string,goodId?:string)=>run(async()=>{const scanId=crypto.randomUUID(),prisma=await db();if(prisma)return (await prisma.$queryRaw<{result:Workflow}[]>`select public.axic_workflow_action(${id}::text,${action}::text,${actor}::uuid,${name}::text,${state}::text,${goodId??null}::uuid,${scanId}::uuid) as result`)[0].result;return supabaseRequest<Workflow>('rpc/axic_workflow_action',{},'POST',{p_id:id,p_action:action,p_actor:actor,p_name:name,p_state:state,p_good:goodId??null,p_scan:scanId})}),
 read:(id:string,actor:string,state:string,admin:boolean)=>run(async()=>{const prisma=await db();if(prisma){const allowed=await prisma.$queryRaw<{id:string}[]>`select id from public.axic_workflow_alerts where id=${id}::uuid and (${admin} or state=${state})`;if(!allowed.length)throw new StorageError(404);await prisma.$executeRaw`insert into public.axic_workflow_reads(alert_id,actor) values(${id}::uuid,${actor}::uuid) on conflict do nothing`;return;}const row=(await supabaseRequest<{id:string}[]>('axic_workflow_alerts',{id:'eq.'+id,...(admin?{}:{state:'eq.'+state})}))[0];if(!row)throw new StorageError(404);try{await supabaseRequest('axic_workflow_reads',{},'POST',{alert_id:id,actor})}catch(e){if(!(e instanceof StorageError&&e.status===409))throw e;}})
};
