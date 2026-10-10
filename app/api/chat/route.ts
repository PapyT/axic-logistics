import {createHash} from 'node:crypto';
import {createAgentUIStreamResponse} from 'ai';
import {createChatAgent} from '@/lib/chat-agent';
import {chatMessages} from '@/lib/chat-policy';
import {supabaseRequest} from '@/lib/supabase-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const unavailable=()=>Response.json({error:'The assistant is temporarily unavailable. You can still use the calculator, tracking and support forms.'},{status:503});
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Open the assistant on the AXIC website.'},{status:403});
 if(process.env.AXIC_CHAT_ENABLED!=='true'||!process.env.CHAT_RATE_LIMIT_SALT||(!process.env.VERCEL_OIDC_TOKEN&&!process.env.AI_GATEWAY_API_KEY))return unavailable();
 let messages;
 try{const body=await req.text();if(body.length>64000)throw Error('Conversation is too long. Start a new conversation.');messages=chatMessages(JSON.parse(body));}
 catch(e){return Response.json({error:e instanceof SyntaxError?'Invalid conversation.':e instanceof Error?e.message:'Invalid conversation.'},{status:400});}
 try{
  // Vercel overwrites x-vercel-forwarded-for with the connecting client IP.
  // Outside Vercel use a single shared development bucket, not spoofable headers.
  const ip=process.env.VERCEL?req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown':'development';
  const identity=createHash('sha256').update(process.env.CHAT_RATE_LIMIT_SALT+'|'+ip).digest('hex');
  const allowed=await supabaseRequest<boolean>('rpc/axic_consume_chat',{},'POST',{p_identity:identity});
  if(!allowed)return Response.json({error:'The assistant has reached its usage limit. Please use the calculator, tracking or support form.'},{status:429,headers:{'Retry-After':'60'}});
  return await createAgentUIStreamResponse({agent:createChatAgent(),uiMessages:messages,abortSignal:req.signal,timeout:50000,sendReasoning:false,onError:error=>{console.error('AXIC assistant generation failed',{name:error instanceof Error?error.name:'Unknown',statusCode:error&&typeof error==='object'&&'statusCode' in error?error.statusCode:undefined});return 'The assistant could not finish this response. Please try again or use the forms below.';},headers:{'Cache-Control':'no-store'}});
 }catch{return unavailable();}
}
