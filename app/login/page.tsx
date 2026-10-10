import {parseGoodCode} from '@/lib/consignment';
import {redirect} from 'next/navigation';
import {getOperator} from '@/lib/auth-server';
import {LoginForm} from '@/components/login-form';
export const dynamic='force-dynamic';
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){let next='/operations';const requested=(await searchParams).next;try{if(requested?.startsWith('/operations/scan?code='))next='/operations/scan?code='+parseGoodCode(requested.slice(22))}catch{}if(await getOperator())redirect(next);return <LoginForm next={next}/>}
