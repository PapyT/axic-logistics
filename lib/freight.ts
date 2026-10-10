import {pricing} from './pricing';
export const states = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Federal Capital Territory','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
export const international = ['Accra, Ghana','Benin','Cameroon',"Côte d’Ivoire",'Togo','United Kingdom','United States','Canada'];
export const locations = [...states,...international];
export const statuses = ['Booked','Collected','In transit','At hub','Out for delivery','Delivered','Exception'];
export type Shipment = {id:string;origin:string;destination:string;service:string;weight:number;amount:number;status:string;customer:string;driver:string;location:string;created:string;events:{status:string;location:string;time:string}[]};
export type QuoteInput = {origin:string;destination:string;service:string;weight:number;length:number;width:number;height:number;insurance:boolean};
export function quote(q:QuoteInput){
 if(!q||typeof q!=='object'||typeof q.insurance!=='boolean')throw new Error('Invalid quote parameters.');
 if(!locations.includes(q.origin)||!locations.includes(q.destination)||q.origin===q.destination)throw new Error('Choose two different supported locations.');
 if(!['Road freight','Air express','Ocean freight'].includes(q.service))throw new Error('Select a service.');
 if([q.weight,q.length,q.width,q.height].some(n=>!Number.isFinite(n)||n<=0||n>10000))throw new Error('Enter valid weight and dimensions (up to 10,000).');
 const overseas=[q.origin,q.destination].some(s=>['United Kingdom','United States','Canada'].includes(s));
 const regional=[q.origin,q.destination].some(s=>international.includes(s));
 if(overseas&&q.service==='Road freight')throw new Error('Choose air or ocean freight for intercontinental shipping.');
 const volumetric=q.length*q.width*q.height/pricing.volumetricDivisor;
 const billable=Math.max(q.weight,volumetric);
 const factor=pricing.serviceMultipliers[q.service as keyof typeof pricing.serviceMultipliers];
 const rates=pricing.bands[overseas?'overseas':regional?'regional':'domestic'];
 const freight=Math.round((rates.base+billable*rates.perKg)*factor);
 const protection=q.insurance?Math.round(freight*pricing.protectionRate):0;
 const handling=rates.handling;
 return {billable,volumetric,freight,protection,handling,total:freight+protection+handling,eta:q.service==='Ocean freight'?'21–35 business days':q.service==='Air express'?'2–5 business days':regional?'5–9 business days':'2–4 business days'};
}
export const money=(n:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n);
export const demoShipments:Shipment[]=[
 {id:'AX-204810',origin:'Lagos',destination:'Federal Capital Territory',service:'Road freight',weight:125,amount:61500,status:'In transit',customer:'Studio North',driver:'Tunde A.',location:'Lokoja distribution corridor',created:'2026-10-08T08:00:00Z',events:[{status:'Booked',location:'Lagos',time:'2026-10-08T08:00:00Z'},{status:'Collected',location:'Ikeja fulfillment hub',time:'2026-10-08T10:30:00Z'},{status:'In transit',location:'Lokoja distribution corridor',time:'2026-10-09T07:15:00Z'}]},
 {id:'AX-204811',origin:'Lagos',destination:'Accra, Ghana',service:'Road freight',weight:80,amount:129500,status:'At hub',customer:'Forma Collective',driver:'Ama K.',location:'Accra gateway hub',created:'2026-10-07T08:00:00Z',events:[{status:'Booked',location:'Lagos',time:'2026-10-07T08:00:00Z'},{status:'At hub',location:'Accra gateway hub',time:'2026-10-09T10:00:00Z'}]},
 {id:'AX-204812',origin:'Ogun',destination:'United Kingdom',service:'Air express',weight:12,amount:254950,status:'Out for delivery',customer:'Mira Goods',driver:'James R.',location:'London delivery zone',created:'2026-10-06T08:00:00Z',events:[{status:'Booked',location:'Ogun',time:'2026-10-06T08:00:00Z'},{status:'Out for delivery',location:'London delivery zone',time:'2026-10-09T09:00:00Z'}]},
 {id:'AX-204813',origin:'Lagos',destination:'Oyo',service:'Road freight',weight:24,amount:16050,status:'Delivered',customer:'Everyday Market',driver:'Bola O.',location:'Ibadan',created:'2026-10-05T08:00:00Z',events:[{status:'Booked',location:'Lagos',time:'2026-10-05T08:00:00Z'},{status:'Delivered',location:'Ibadan',time:'2026-10-08T12:00:00Z'}]},
 {id:'AX-204814',origin:'Rivers',destination:'Lagos',service:'Road freight',weight:320,amount:149250,status:'Exception',customer:'Kora Supply',driver:'Emeka N.',location:'Benin hub · address clarification',created:'2026-10-08T08:00:00Z',events:[{status:'Booked',location:'Rivers',time:'2026-10-08T08:00:00Z'},{status:'Exception',location:'Benin hub · address clarification',time:'2026-10-09T10:00:00Z'}]},
 {id:'AX-204815',origin:'Lagos',destination:'Canada',service:'Ocean freight',weight:450,amount:1447750,status:'Booked',customer:'Monarch Interiors',driver:'Unassigned',location:'Lagos export terminal',created:'2026-10-09T08:00:00Z',events:[{status:'Booked',location:'Lagos export terminal',time:'2026-10-09T08:00:00Z'}]}
];
