import {pricing} from './pricing';
export const states = ['Abia','Abuja','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
export const international = ['Accra, Ghana','Benin','Cameroon',"Côte d’Ivoire",'Togo','United Kingdom','United States','Canada'];
export const locations = [...states,...international];
export const statuses = ['Booked','Collected','In transit','At hub','Out for delivery','Delivered','Exception'];
export type Shipment = {id:string;origin:string;destination:string;service:string;weight:number;amount:number;status:string;customer:string;driver:string;location:string;created:string;sender?:import('./consignment').Contact;receiver?:import('./consignment').Contact;kind?:'shipment'|'consignment';events:{status:string;location:string;time:string;label?:string}[]};
export type QuoteInput = {origin:string;destination:string;service:string;weight:number;length:number;width:number;height:number;insurance:boolean};
// Keep previously stored FCT records and older booking clients compatible.
export const locationName=(value:string)=>value.trim()==='Federal Capital Territory'?'Abuja':value.trim();
export function normaliseShipment(s:Shipment):Shipment{
 return {...s,origin:locationName(s.origin),destination:locationName(s.destination),location:locationName(s.location),events:s.events.map(e=>({...e,location:locationName(e.location)}))};
}
export function milestoneLabel(event:Shipment['events'][number],previous?:Shipment['events'][number]){
 if(event.label)return event.label;
 if(!previous||event.status!==previous.status)return event.status;
 return event.location!==previous.location?'Location updated':'Update recorded';
}
export function quote(q:QuoteInput){
 if(!q||typeof q!=='object'||typeof q.insurance!=='boolean'||typeof q.origin!=='string'||typeof q.destination!=='string')throw new Error('Invalid quote parameters.');
 q={...q,origin:locationName(q.origin),destination:locationName(q.destination)};
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
