'use client';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,MessageCircle,Send,Square,X,RotateCcw,Package,Headphones} from 'lucide-react';
import {money} from '@/lib/freight';
export function ChatAssistant({onQuote,onBook,onSupport}:{onQuote:()=>void;onBook:()=>void;onSupport:()=>void}){
 const [open,setOpen]=useState(false),[input,setInput]=useState('');
 const panel=useRef<HTMLElement>(null),bottom=useRef<HTMLDivElement>(null);
 const transport=useMemo(()=>new DefaultChatTransport({api:'/api/chat',fetch:async(url,options)=>{
  const response=await fetch(url,options);if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'The assistant is unavailable. Please use the forms below.');}return response;
 }}),[]);
 const {messages,sendMessage,status,error,stop,setMessages,clearError}=useChat({transport});
 const busy=status==='submitted'||status==='streaming';
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'});},[messages,status]);
 useEffect(()=>{
  if(!open)return;const before=document.activeElement as HTMLElement;const old=document.body.style.overflow;document.body.style.overflow='hidden';
  const nodes=()=>Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')||[]);
  panel.current?.querySelector<HTMLInputElement>('input')?.focus();
  function keys(e:KeyboardEvent){if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const n=nodes();if(e.shiftKey&&document.activeElement===n[0]){e.preventDefault();n.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===n.at(-1)){e.preventDefault();n[0]?.focus();}}}
  document.addEventListener('keydown',keys);return()=>{document.removeEventListener('keydown',keys);document.body.style.overflow=old;before?.focus();};
 },[open]);
 const ask=(text:string)=>{if(busy||!text.trim())return;clearError();void sendMessage({text:text.trim()});setInput('');};
 const action=(callback:()=>void)=>{setOpen(false);void stop();callback();};
 return <><button className="support-fab" aria-label="Open AXIC assistant" aria-expanded={open} onClick={()=>setOpen(true)}><MessageCircle size={22}/><span>Ask AXIC</span></button>{open&&<div className="chat-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}><section ref={panel} className="axic-chat" role="dialog" aria-modal="true" aria-labelledby="chat-title"><div className="chat-heading"><span className="chat-mark"><Package size={23}/></span><div><span className="eyebrow">LOGISTICS, CONNECTED.</span><h2 id="chat-title">Your AXIC assistant</h2><p>Freight guidance. A clearer next move.</p></div><button className="icon-button" aria-label="Close assistant" onClick={()=>setOpen(false)}><X size={20}/></button></div><div className="chat-history" role="log" aria-live="polite" aria-relevant="additions text">{!messages.length&&<div className="chat-welcome"><span className="eyebrow">HOW CAN WE HELP?</span><h3>Let’s get your<br/>shipment moving.</h3><p>Ask about coverage, calculate an estimate or check your shipment’s latest milestone.</p><div className="chat-prompts">{['Where can I ship?','Help me calculate a freight quote','How do I track my shipment?'].map(text=><button key={text} onClick={()=>ask(text)}>{text}<ArrowUpRight size={15}/></button>)}</div></div>}{messages.map(m=><div className={'chat-message '+m.role} key={m.id}><span className="chat-author">{m.role==='user'?'YOU':'AXIC ASSISTANT'}</span>{m.parts.map((part,i)=>{
 if(part.type==='text')return <p key={i}>{part.text}</p>;
 if(part.type.startsWith('tool-')&&'state' in part){
  if(part.state==='input-available'||part.state==='input-streaming')return <span className="chat-tool-status" key={i}>Checking {part.type==='tool-freightQuote'?'current pricing':'shipment records'}…</span>;
  if(part.state==='output-available'&&'output' in part&&part.output&&typeof part.output==='object'){
   const result=part.output as Record<string,unknown>;
   if(typeof result.error==='string')return <div className="chat-result" key={i}>{result.error}</div>;
   if(part.type==='tool-freightQuote'&&typeof result.total==='number')return <div className="chat-result" key={i}><span className="micro">FREIGHT ESTIMATE · NGN</span><strong>{money(result.total)}</strong><span>Chargeable weight: {Number(result.billable).toFixed(2)} kg</span><small>Subject to confirmation. No booking created.</small></div>;
   if(part.type==='tool-trackShipment')return <div className="chat-result" key={i}><span className="micro">{String(result.id)}</span><strong>{String(result.status)}</strong><span>{String(result.location)}</span><small>Recorded shipment milestone · GPS not connected</small></div>;
  }
 }return null;
 })}</div>)}{busy&&<p className="chat-thinking" role="status">AXIC is working on your request<span>…</span></p>}{error&&<div className="chat-error" role="alert">{error.message}</div>}<div ref={bottom}/></div><div className="chat-actions"><button onClick={()=>action(onQuote)}>Calculator<ArrowUpRight size={13}/></button><button onClick={()=>action(onBook)}>Send shipment<ArrowUpRight size={13}/></button><button onClick={()=>action(onSupport)}><Headphones size={13}/>Contact support</button></div><form className="chat-composer" onSubmit={e=>{e.preventDefault();ask(input);}}><label className="sr-only" htmlFor="chat-input">Message AXIC assistant</label><input id="chat-input" maxLength={2000} value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about your next shipment…" disabled={busy}/>{busy?<button type="button" className="chat-send" onClick={()=>void stop()} aria-label="Stop response"><Square size={16}/></button>:<button className="chat-send" disabled={!input.trim()} aria-label="Send message"><Send size={18}/></button>}</form><div className="chat-footnote"><span>AI assistant · Estimates require confirmation.<br/>Avoid sharing sensitive personal information.</span><button aria-label="Clear conversation" disabled={busy} onClick={()=>{setMessages([]);clearError();setInput('');}}><RotateCcw size={15}/></button></div></section></div>}</>;
}
