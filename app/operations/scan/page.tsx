import {redirect} from 'next/navigation';
import {getOperator} from '@/lib/auth-server';
import {canAccessShipment} from '@/lib/operator-scope';
import {consignments} from '@/lib/consignment-server';
import {storage} from '@/lib/storage-server';
import {parseGoodCode} from '@/lib/consignment';
import {ConsignmentWorkspace} from '@/components/consignment-workspace';
export const dynamic='force-dynamic';
export default async function ScanPage({searchParams}:{searchParams:Promise<{code?:string}>}){let code='';try{code=parseGoodCode((await searchParams).code??'')}catch{}const user=await getOperator();if(!user)redirect('/login'+(code?'?next='+encodeURIComponent('/operations/scan?code='+code):''));if(user.axicRole==='staff'){let job='';try{const item=code?await consignments.getGood(code):undefined;const row=item?.consignment_id?await storage.getShipment(item.consignment_id):undefined;if(row&&canAccessShipment(user,row.payload))job=row.id;}catch{}redirect(job?'/operations?job='+encodeURIComponent(job)+'&code='+encodeURIComponent(code):'/operations?scan=unavailable');}return <main className="scan-page"><a className="btn outline" href="/operations">← Operations workspace</a><h1>AXIC item scanning</h1><ConsignmentWorkspace initialCode={code}/></main>}
