export function isAllowedOperator(user:{email?:string;email_confirmed_at?:string}|null,allowlist=process.env.OPERATIONS_ALLOWED_EMAILS??''){
 if(!user?.email||!user.email_confirmed_at)return false;
 const emails=allowlist.split(',').map(email=>email.trim().toLowerCase()).filter(Boolean);
 return emails.includes(user.email.toLowerCase());
}
export function isSameOrigin(req:Request){
 const origin=req.headers.get('origin');
 return !!origin&&origin===new URL(req.url).origin;
}
