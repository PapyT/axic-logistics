export type Contact={name:string;phone:string;address:string;email?:string};
export type GoodInput={description:string;weight:number};
export type Receipt={id:string;good_id:string;location:string;location_key:string;received_by:string;received_by_name:string;received_at:string};
export type ReceiptResult={item:Good;receipt:Receipt;received:number;expected:number;alreadyReceived:boolean;shipmentStatus:string};
export type Good={id:string;description:string;weight:number;consignment_id:string|null;created:string;assigned_at:string|null;receipts?:Receipt[]};
export type Consignment={id:string;shipment_id:string;sender:Contact;receiver:Contact;created:string;goods:Good[]};
export function contact(value:unknown):Contact{
 const c=value as Record<string,unknown>;
 if(!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>100||typeof c.phone!=='string'||!/^\+?[\d ()-]{7,25}$/.test(c.phone)||typeof c.address!=='string'||!c.address.trim()||c.address.length>400||c.email!==undefined&&(typeof c.email!=='string'||c.email.length>254||c.email!==''&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)))throw Error('Enter a name, valid phone number and address for sender and receiver.');
 return {name:c.name.trim(),phone:c.phone.trim(),address:c.address.trim(),...(c.email?{email:String(c.email).trim()}:{})};
}
export function goodInput(value:unknown):GoodInput{
 const g=value as Record<string,unknown>;
 if(!g||typeof g.description!=='string'||!g.description.trim()||g.description.length>200||typeof g.weight!=='number'||!Number.isFinite(g.weight)||g.weight<=0||g.weight>10000)throw Error('Each item needs a description and weight between 0 and 10,000 kg.');
 return {description:g.description.trim(),weight:g.weight};
}
export function goodsInput(value:unknown):GoodInput[]{if(!Array.isArray(value)||value.length<1||value.length>100)throw Error('Add between 1 and 100 goods. Each row receives its own QR code.');return value.map(goodInput)}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseGoodCode(value:string){
 let id=value.trim();
 if(id.startsWith('AXIC:GOOD:'))id=id.slice(10);
 else if(/^https?:\/\//i.test(id)){const url=new URL(id);if(url.pathname!=='/operations/scan')throw Error('This QR code is not an AXIC item label.');id=url.searchParams.get('code')??'';}
 if(!uuid.test(id))throw Error('Enter or scan a valid AXIC item QR code.');return id.toLowerCase();
}

export function receiptLocation(value:unknown){if(typeof value!=='string')throw Error('Enter the receiving branch or warehouse.');const location=value.trim().replace(/\s+/g,' ');if(!location||location.length>120)throw Error('Enter a receiving location of up to 120 characters.');return {location,key:location.toLowerCase()};}
