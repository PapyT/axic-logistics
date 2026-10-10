import {states,locationName} from '@/lib/freight';
import {requireAdmin,getOperator} from '@/lib/auth-server';
import {adminClient} from '@/lib/auth-admin-server';
import {operatorRole} from '@/lib/auth-policy';
import type {User} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const record=(user:User)=>({id:user.id,email:user.email??'',name:String(user.user_metadata?.name??''),role:operatorRole(user)??user.app_metadata?.axic_role??'staff',state:locationName(String(user.app_metadata?.axic_state??'')),active:user.app_metadata?.axic_enabled!==false,created:user.created_at});
const unavailable=()=>Response.json({error:'Account administration is unavailable. Check server configuration.'},{status:503});
export async function GET(){const denied=await requireAdmin();if(denied)return denied;try{const {data,error}=await adminClient().auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;return Response.json(data.users.filter(user=>operatorRole(user)||['admin','staff'].includes(user.app_metadata?.axic_role)).map(record),{headers:{'Cache-Control':'private, no-store'}})}catch{return unavailable()}}
export async function POST(req:Request){const denied=await requireAdmin(req);if(denied)return denied;let body:{email:string;password:string;name:string;role:'admin'|'staff';state:string};try{body=await req.json();if(typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)||typeof body.name!=='string'||!body.name.trim()||body.name.length>100||typeof body.password!=='string'||body.password.length<12||body.password.length>128||!['admin','staff'].includes(body.role)||!states.includes(body.state))throw Error()}catch{return Response.json({error:'Enter a name, valid email, password of 12–128 characters, account role and Nigerian work state.'},{status:400})}try{const {data,error}=await adminClient().auth.admin.createUser({email:body.email.trim(),password:body.password,email_confirm:true,user_metadata:{name:body.name.trim()},app_metadata:{axic_role:body.role,axic_enabled:true,axic_state:body.state}});if(error)return Response.json({error:'Account could not be created. The email may already be registered, or the password may not meet the Auth policy.'},{status:409});return Response.json(record(data.user!),{status:201})}catch{return unavailable()}}
export async function PATCH(req:Request){
 const denied=await requireAdmin(req);if(denied)return denied;
 let body:{id:string;role?:'admin'|'staff';active?:boolean;state?:string;name?:string;password?:string};
 try{body=await req.json();if(typeof body.id!=='string'||!/^[-\da-f]{36}$/i.test(body.id)||body.role!==undefined&&!['admin','staff'].includes(body.role)||body.active!==undefined&&typeof body.active!=='boolean'||body.state!==undefined&&!states.includes(body.state)||body.name!==undefined&&(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)||body.password!==undefined&&(typeof body.password!=='string'||body.password.length<12||body.password.length>128))throw Error()}catch{return Response.json({error:'Provide a valid account, name, work state and password of 12–128 characters.'},{status:400})}
 try{const caller=await getOperator(),client=adminClient(),existing=await client.auth.admin.getUserById(body.id);const user=existing.data.user;
 if(existing.error||!user||!operatorRole(user)&&!['admin','staff'].includes(user.app_metadata?.axic_role))return Response.json({error:'AXIC account not found.'},{status:404});
 const before=record(user),role=body.role??before.role,active=body.active??before.active,state=body.state??before.state;
 const accessChanged=role!==before.role||active!==before.active;
 if(body.id===caller?.id&&accessChanged)return Response.json({error:'You cannot change your own access here.'},{status:409});
 const bootstrap=(process.env.OPERATIONS_ADMIN_EMAILS??'').split(',').map(e=>e.trim().toLowerCase()).includes(user.email?.toLowerCase()??'');
 if(bootstrap&&accessChanged)return Response.json({error:'Bootstrap administrator access is managed in the server environment.'},{status:409});
 const {data,error}=await client.auth.admin.updateUserById(body.id,{app_metadata:{...user.app_metadata,axic_role:role,axic_enabled:active,axic_state:state},...(body.name!==undefined?{user_metadata:{...user.user_metadata,name:body.name.trim()}}:{}),...(body.password!==undefined?{password:body.password}:{})});if(error)throw error;return Response.json(record(data.user!));
 }catch{return unavailable()}
}
