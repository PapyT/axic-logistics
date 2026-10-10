export type OperatorRole='admin'|'staff';
type AuthUser={email?:string;email_confirmed_at?:string;app_metadata?:Record<string,unknown>};
const includes=(list:string,email:string)=>list.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
export function operatorRole(user:AuthUser|null,staffEmails=process.env.OPERATIONS_ALLOWED_EMAILS??'',adminEmails=process.env.OPERATIONS_ADMIN_EMAILS??''):OperatorRole|null{
 if(!user?.email||!user.email_confirmed_at||user.app_metadata?.axic_enabled===false)return null;
 if(includes(adminEmails,user.email))return 'admin';
 const role=user.app_metadata?.axic_role;
 if(role==='admin'||role==='staff')return role;
 return includes(staffEmails,user.email)?'staff':null;
}
export const isAllowedOperator=(user:AuthUser|null,allowlist=process.env.OPERATIONS_ALLOWED_EMAILS??'')=>operatorRole(user,allowlist)!==null;
export function isSameOrigin(req:Request){const origin=req.headers.get('origin');return !!origin&&origin===new URL(req.url).origin}
