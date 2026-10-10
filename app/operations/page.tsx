import {redirect} from 'next/navigation';
import {getOperator} from '@/lib/auth-server';
import StaffWorkspace from '@/components/staff-workspace';
import Operations from '@/components/operations-workspace';
export const dynamic='force-dynamic';
export default async function OperationsPage({searchParams}:{searchParams:Promise<{job?:string;code?:string;scan?:string}>}){
 const user=await getOperator();
 if(!user)redirect('/login');
 if(user.axicRole==='staff'){const params=await searchParams;return <StaffWorkspace email={user.email??''} name={String(user.user_metadata?.name??'AXIC staff')} state={user.axicState} userId={user.id} initialJob={params.job} initialCode={params.code} scanUnavailable={params.scan==='unavailable'}/>;}
 return <Operations email={user.email??'AXIC operator'} role={user.axicRole} state={user.axicState} userId={user.id}/>;
}
