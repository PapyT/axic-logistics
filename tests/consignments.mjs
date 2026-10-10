import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {contact,goodsInput,parseGoodCode} from '../lib/consignment.ts';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const name of ['consignments','goods'])writeFileSync(`work/${name}.mjs`,compile(readFileSync(`app/api/${name}/route.ts`,'utf8').replace("'@/lib/auth-server'","'./workflow-auth.mjs'").replace("'@/lib/consignment-server'","'./consignment-server.mjs'").replace("'@/lib/consignment'","'../lib/consignment.ts'").replace("'@/lib/supabase-server'","'../lib/supabase-server.ts'")));
const shipment=await import('../work/shipments.mjs'),api=await import('../work/consignments.mjs'),items=await import('../work/goods.mjs');
delete process.env.DATABASE_URL;process.env.SUPABASE_URL='https://consignment-test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_TEST_ONLY';
const rows=new Map(),goods=new Map(),shipments=new Map();let atomicCalls=0;const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 const u=new URL(url);assert.equal(u.hostname,'consignment-test.supabase.co');assert.equal(options.headers.apikey,process.env.SUPABASE_SECRET_KEY);assert.equal(options.cache,'no-store');const body=options.body?JSON.parse(options.body):null;
 if(u.pathname.endsWith('axic_create_consignment')){atomicCalls++;const {p_shipment:s,p_sender:sender,p_receiver:receiver,p_goods:g}=body;shipments.set(s.id,s);rows.set(s.id,{id:s.id,shipment_id:s.id,sender,receiver,created:new Date().toISOString()});for(const item of g)goods.set(item.id,{...item,consignment_id:s.id,created:new Date().toISOString(),assigned_at:new Date().toISOString()});return Response.json(s);}
 if(u.pathname.endsWith('axic_assign_good')){const g=goods.get(body.p_good);if(!g||!rows.has(body.p_consignment))return Response.json({},{status:404});if(g.consignment_id&&g.consignment_id!==body.p_consignment)return Response.json({},{status:409});g.consignment_id=body.p_consignment;g.assigned_at??=new Date().toISOString();return Response.json(g);}
 if(u.pathname.endsWith('axic_goods')){if(options.method==='POST'){goods.set(body.id,{...body,consignment_id:null,assigned_at:null,created:new Date().toISOString()});return Response.json([goods.get(body.id)])}return Response.json([...goods.values()].filter(g=>!u.searchParams.get('id')||g.id===u.searchParams.get('id').slice(3)));}
 if(u.pathname.endsWith('axic_receipts'))return Response.json([]);
 if(u.pathname.endsWith('axic_consignments'))return Response.json([...rows.values()]);
 if(u.pathname.endsWith('axic_shipments'))return Response.json([...shipments.values()].filter(s=>s.id===u.searchParams.get('id')?.slice(3)).map(payload=>({payload,id:payload.id,version:0})));
 throw Error('Unexpected request');
};
const req=(method,body,path='/api/shipments')=>new Request('https://test.local'+path,{method,...(body?{headers:{'Content-Type':'application/json',origin:'https://test.local'},body:JSON.stringify(body)}:{})});
const person={name:'QA person',phone:'+234 800 000 0000',address:'QA Abuja address'};
const input={kind:'consignment',sender:person,receiver:{...person,name:'Receiver'},customer:'QA',origin:'Lagos',destination:'Abuja',service:'Road freight',weight:999,length:10,width:10,height:10,insurance:false,goods:[{description:'Crate one',weight:3},{description:'Crate two',weight:5}]};
let r=await shipment.POST(req('POST',input));assert.equal(r.status,201);const booking=await r.json();assert.equal(booking.weight,8);assert.equal(atomicCalls,1);
r=await api.GET();const consignment=(await r.json())[0];assert.equal(consignment.goods.length,2);assert.notEqual(consignment.goods[0].id,consignment.goods[1].id);
const id=consignment.goods[0].id,url='https://test.local/operations/scan?code='+id;assert.equal(parseGoodCode(url),id);assert.equal(parseGoodCode('AXIC:GOOD:'+id),id);
assert.throws(()=>parseGoodCode('javascript:alert(1)'));assert.throws(()=>parseGoodCode('https://test.local/foreign?code='+id));assert.throws(()=>contact({...person,phone:'bad'}));assert.throws(()=>goodsInput([]));
r=await items.GET(req('GET',null,'/api/goods?code='+encodeURIComponent(url)));assert.equal((await r.json()).id,id);
r=await items.POST(req('POST',{description:'Loose parcel',weight:1},'/api/goods'));assert.equal(r.status,201);const loose=await r.json();assert.equal(loose.consignment_id,null);
r=await items.PATCH(req('PATCH',{code:loose.id,consignmentId:booking.id},'/api/goods'));assert.equal(r.status,200);const assigned=await r.json();assert.equal(assigned.consignment_id,booking.id);
r=await items.PATCH(req('PATCH',{code:loose.id,consignmentId:booking.id},'/api/goods'));assert.equal((await r.json()).assigned_at,assigned.assigned_at);
r=await shipment.POST(req('POST',input));const other=await r.json();r=await items.PATCH(req('PATCH',{code:loose.id,consignmentId:other.id},'/api/goods'));assert.equal(r.status,409);assert.equal(goods.get(loose.id).consignment_id,booking.id);
r=await shipment.GET(req('GET',null,'/api/shipments?id='+booking.id));const publicData=await r.json();assert.equal(publicData.sender,undefined);assert.equal(publicData.receiver,undefined);
r=await shipment.POST(req('POST',{...input,goods:[]}));assert.equal(r.status,400);
// Decode the generated, uncropped QR matrix with ZXing. Camera finder detection requires device testing.
const require=createRequire(import.meta.url),qr=require('qrcode'),qrRequire=createRequire(require.resolve('qrcode')),zRequire=createRequire(require.resolve('@zxing/browser'));
const {PNG}=qrRequire('pngjs'),{RGBLuminanceSource,HybridBinarizer,BinaryBitmap,QRCodeReader,DecodeHintType}=zRequire('@zxing/library');
const png=PNG.sync.read(await qr.toBuffer(url,{scale:6,margin:4,errorCorrectionLevel:'M'}));const pixels=new Int32Array(png.width*png.height);for(let i=0;i<pixels.length;i++)pixels[i]=(png.data[i*4]<<16)|(png.data[i*4+1]<<8)|png.data[i*4+2];
const decoded=new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,png.width,png.height))),new Map([[DecodeHintType.PURE_BARCODE,true]])).getText();assert.equal(decoded,url);assert.equal(parseGoodCode(decoded),id);
globalThis.fetch=originalFetch;
console.log('PASS: consignment booking with summed weights, distinct item IDs, private contacts, registration→QR encode/decode→lookup→assignment, duplicate idempotence, cross-consignment conflict and input validation (mock REST; real QR engine).');
