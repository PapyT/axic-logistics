import {locationName} from './freight';
export type OperatorScope={axicRole:'admin'|'staff';axicState:string};
export function canAccessShipment(user:OperatorScope,shipment:{origin:string;destination:string}){
 return user.axicRole==='admin'||!!user.axicState&&(locationName(shipment.origin)===user.axicState||locationName(shipment.destination)===user.axicState);
}
