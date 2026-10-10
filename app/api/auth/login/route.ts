import {authClient} from '@/lib/auth-server';
import {isAllowedOperator,isSameOrigin} from '@/lib/auth-policy';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!isSameOrigin(req))return Response.json({error:'Request origin is not allowed.'},{status:403});
 let body:{email:string;password:string};
 try{body=await req.json();if(typeof body.email!=='string'||body.email.length>254||typeof body.password!=='string'||body.password.length>256||!body.password)throw Error()}catch{return Response.json({error:'Enter your staff email and password.'},{status:400})}
 try{
  const client=await authClient();
  const {data,error}=await client.auth.signInWithPassword({email:body.email.trim(),password:body.password});
  if(error)return Response.json({error:error.status===429?'Too many attempts. Please wait and try again.':'Unable to sign in. Check your staff credentials.'},{status:error.status===429?429:401});
  if(!isAllowedOperator(data.user)){await client.auth.signOut({scope:'local'});return Response.json({error:'This account does not have AXIC operations access.'},{status:403});}
  return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Staff sign-in is unavailable. Contact your administrator.'},{status:503})}
}
