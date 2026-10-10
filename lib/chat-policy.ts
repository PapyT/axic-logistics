import type {UIMessage} from 'ai';
// Accept text only. Client-supplied tool results, attachments and system roles
// never enter the model context. Tools are executed fresh on the server.
export function chatMessages(body:unknown):UIMessage[]{
 if(!body||typeof body!=='object'||!('messages' in body)||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>24)throw Error('Start a new conversation after 12 exchanges.');
 let total=0;
 const messages=body.messages.map((m:unknown,index:number)=>{
  if(!m||typeof m!=='object'||!('role' in m)||!['user','assistant'].includes(String(m.role))||!('parts' in m)||!Array.isArray(m.parts))throw Error('Invalid conversation.');
  const text=m.parts.filter((p:unknown)=>p&&typeof p==='object'&&'type' in p&&p.type==='text'&&'text' in p&&typeof p.text==='string').map(p=>p.text as string).join('\n');
  if(text.length>2000)throw Error('Keep each message under 2,000 characters.');
  total+=text.length;
  return {id:'message-'+index,role:m.role as 'user'|'assistant',parts:[{type:'text' as const,text}]};
 });
 if(total>16000||messages.at(-1)?.role!=='user'||!messages.at(-1)?.parts.some(p=>p.type==='text'&&p.text.trim()))throw Error('Send a short message or start a new conversation.');
 return messages;
}
export const retiredTrackingIds=new Set(['AX-204810','AX-204811','AX-204812','AX-204813','AX-204814','AX-204815']);
