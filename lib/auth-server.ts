import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {isAllowedOperator,isSameOrigin} from './auth-policy';
export async function authClient(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Staff authentication is not configured.');
 const jar=await cookies();
 return createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},cookies:{
  getAll:()=>jar.getAll(),
  setAll:(values)=>{try{values.forEach(({name,value,options})=>jar.set(name,value,options))}catch{/* Server component reads; proxy owns refresh writes. */}}
 }});
}
export async function getOperator(){
 try{const client=await authClient();const {data,error}=await client.auth.getUser();return !error&&isAllowedOperator(data.user)?data.user:null}catch{return null}
}
export async function requireOperator(req?:Request){
 if(req&&['POST','PATCH','PUT','DELETE'].includes(req.method)&&!isSameOrigin(req))return Response.json({error:'Request origin is not allowed.'},{status:403});
 if(!await getOperator())return Response.json({error:'Sign in with an authorised AXIC staff account.'},{status:401,headers:{'Cache-Control':'private, no-store'}});
 return null;
}
