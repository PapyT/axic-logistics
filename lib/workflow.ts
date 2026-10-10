export type WorkflowScan={id:string;good_id:string;consignment_id:string;phase:'pickup'|'arrival';actor:string;actor_name:string;location:string;scanned_at:string};
export type Workflow={consignment_id:string;origin:string;destination:string;stage:string;pickup_owner:string|null;pickup_name:string|null;destination_owner:string|null;destination_name:string|null;delivery_owner:string|null;delivery_name:string|null;updated:string};
export type WorkflowAlert={id:string;consignment_id:string;state:string;kind:string;created:string;read:boolean};
export type WorkflowData={jobs:Workflow[];scans:WorkflowScan[];alerts:WorkflowAlert[]};
export const workflowActions=['claim_pickup','scan_pickup','dispatch','claim_arrival','scan_arrival','claim_delivery','deliver'] as const;
export type WorkflowAction=typeof workflowActions[number];
