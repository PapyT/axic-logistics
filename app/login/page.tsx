import {redirect} from 'next/navigation';
import {getOperator} from '@/lib/auth-server';
import {LoginForm} from '@/components/login-form';
export const dynamic='force-dynamic';
export default async function LoginPage(){if(await getOperator())redirect('/operations');return <LoginForm/>}
