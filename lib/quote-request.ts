import type {QuoteInput} from './freight';
export type QuoteRequest={id:string;contact:{name:string;phone:string;email?:string};route:QuoteInput;goods:{description:string;weight:number}[];estimate:number;status:'New'|'Contacted'|'Closed';created:string};
