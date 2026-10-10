import {redirect} from 'next/navigation';
import {getOperator} from '@/lib/auth-server';
import Operations from '@/components/operations-workspace';
export const dynamic='force-dynamic';
export default async function OperationsPage(){
 const user=await getOperator();
 if(!user)redirect('/login');
 return <Operations email={user.email??'AXIC operator'}/>;
}
