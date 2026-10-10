'use client';
import {useEffect,useRef,useState} from 'react';
import type {IScannerControls} from '@zxing/browser';
export function ItemScanner({onCode,onClear,busy}:{onCode:(code:string)=>void;onClear:()=>void;busy:boolean}){
 const [code,setCode]=useState(''),[camera,setCamera]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),controls=useRef<IScannerControls|null>(null),generation=useRef(0);
 function stop(){generation.current++;controls.current?.stop();controls.current=null;setCamera(false)}
 useEffect(()=>()=>{generation.current++;controls.current?.stop()},[]);
 async function start(){stop();setCamera(true);setError('');const token=generation.current;try{const [{BrowserQRCodeReader},{DecodeHintType}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);if(token!==generation.current)return;let found=false;const c=await new BrowserQRCodeReader(new Map([[DecodeHintType.TRY_HARDER,true]])).decodeFromVideoDevice(undefined,video.current!,result=>{if(result&&!found){found=true;stop();setCode(result.getText());onCode(result.getText())}});if(token!==generation.current)c.stop();else controls.current=c}catch{if(token===generation.current){stop();setError('Camera unavailable. Enter the code printed on the goods label below.');input.current?.focus()}}}
 return <div className="item-scanner"><video ref={video} muted playsInline className={'scanner-video '+(camera?'':'scanner-hidden')}/><div className="button-row"><button className="btn dark" disabled={busy} onClick={camera?stop:start}>{camera?'Stop camera':'Scan QR label'}</button><button className="btn outline" disabled={busy} onClick={()=>{stop();input.current?.focus()}}>Enter code manually</button></div><form onSubmit={e=>{e.preventDefault();stop();onCode(code)}}><label>Printed item code or QR link<input ref={input} required maxLength={1000} disabled={busy} value={code} onChange={e=>{setCode(e.target.value);onClear()}} placeholder="Type the UUID printed on the label"/></label><button className="btn outline" disabled={busy}>Look up item</button></form>{error&&<p className="error" role="alert">{error}</p>}</div>;
}
