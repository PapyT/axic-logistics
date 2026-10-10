import {redirect} from 'next/navigation';
import {getOperator} from '@/lib/auth-server';
import {parseGoodCode} from '@/lib/consignment';
import {ConsignmentWorkspace} from '@/components/consignment-workspace';
export const dynamic='force-dynamic';
export default async function ScanPage({searchParams}:{searchParams:Promise<{code?:string}>}){let code='';try{code=parseGoodCode((await searchParams).code??'')}catch{}if(!await getOperator())redirect('/login'+(code?'?next='+encodeURIComponent('/operations/scan?code='+code):''));return <main className="scan-page"><a className="btn outline" href="/operations">← Operations workspace</a><h1>AXIC item scanning</h1><ConsignmentWorkspace initialCode={code}/></main>}
