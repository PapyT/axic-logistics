import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(url&&key){
  try{
   const client=createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll:(values,headers)=>{
     values.forEach(({name,value})=>request.cookies.set(name,value));
     response=NextResponse.next({request});
     values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
     Object.entries(headers??{}).forEach(([name,value])=>response.headers.set(name,value));
    }
   }});
   // Refresh expired sessions before pages/API handlers validate staff access.
   await client.auth.getUser();
  }catch{/* Pages and handlers deny access when validation fails. */}
 }
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/operations/:path*','/login','/api/shipments','/api/support','/api/consignments','/api/goods','/api/receipts/:path*','/api/team','/api/auth/:path*']};
