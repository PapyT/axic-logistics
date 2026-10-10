// Server-only utility. Never expose the secret key or generated credential file.
import 'dotenv/config';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {readFileSync,mkdirSync,appendFileSync,existsSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const source=readFileSync(new URL('../lib/freight.ts',import.meta.url),'utf8');
const states=JSON.parse(source.match(/export const states = (\[.*?\]);/)[1].replaceAll("'",'"'));
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key)throw Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY privately before running this server utility.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const existing=new Map();for(let page=1;;page++){const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});if(error)throw Error('Could not list Auth users.');for(const u of data.users)existing.set(u.email?.toLowerCase(),u);if(data.users.length<1000)break;}
const output=resolve('work/state-staff-credentials.csv');mkdirSync(dirname(output),{recursive:true});
if(!existsSync(output))appendFileSync(output,'State,Name,Login email,Initial password,Role\n',{mode:0o600});chmodSync(output,0o600);
const csv=s=>'"'+s.replaceAll('"','""')+'"';let created=0,skipped=0;
for(const state of states){const email='staff.'+state.toLowerCase().replaceAll(' ','-')+'@example.com',name='AXIC '+state+' Staff';if(existing.has(email)){const u=existing.get(email);if(u.app_metadata?.axic_role!=='staff'||u.app_metadata?.axic_state!==state)throw Error('An existing email belongs to a different account. No account was overwritten.');skipped++;continue;}
 const password=randomBytes(24).toString('base64url')+'!aA9';const {error}=await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name},app_metadata:{axic_role:'staff',axic_enabled:true,axic_state:state,axic_seed:'state-staff-2026'}});if(error)throw Error('A staff account could not be created. Earlier successes are recorded privately; rerun to resume.');appendFileSync(output,[state,name,email,password,'staff'].map(csv).join(',')+'\n');created++;
}
console.log(`Created ${created}; existing accounts skipped ${skipped}. New credentials are in ${output}. Passwords were not logged. Keep this file private.`);
