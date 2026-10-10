import {authClient} from '@/lib/auth-server';
import {isSameOrigin} from '@/lib/auth-policy';
import {cookies} from 'next/headers';
export async function POST(req:Request){
 if(!isSameOrigin(req))return Response.json({error:'Request origin is not allowed.'},{status:403});
 try{const client=await authClient();await client.auth.signOut({scope:'local'})}catch{/* Clear local credentials even if the provider is unavailable. */}
 const jar=await cookies();jar.getAll().filter(c=>c.name.startsWith('sb-')).forEach(c=>jar.delete(c.name));
 return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
}
