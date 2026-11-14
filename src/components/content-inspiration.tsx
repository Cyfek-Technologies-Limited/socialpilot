'use client';
import { useState } from 'react';
import { readInspiration } from '@/lib/inspiration';
import type { Brand } from '@/lib/types';
import { Button } from './ui/button';

export function ContentInspiration({brand,busy,act}:{brand:Brand;busy:boolean;act:(action:string,body:Record<string,unknown>)=>Promise<unknown>}){
 const saved=readInspiration(brand.preferences);
 const [links,setLinks]=useState(saved?.links.join('\n')||''),[examples,setExamples]=useState(saved?.examples||''),[preferences,setPreferences]=useState(saved?.preferences||''),[guide,setGuide]=useState(saved?.guide||''),[enabled,setEnabled]=useState(saved?.enabled||false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const input=()=>({brandId:brand.id,links:links.split('\n').map(s=>s.trim()).filter(Boolean),examples,preferences,guide,enabled});
 const [images,setImages]=useState<string[]>([]),[uploading,setUploading]=useState(false);
 async function addImages(files:File[]){setError('');setUploading(true);try{if(files.length+images.length>3)throw new Error('Choose up to 3 screenshots.');const added=await Promise.all(files.map(async file=>{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10000000)throw new Error('Use PNG, JPEG or WebP files up to 10 MB each.');const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image could not be loaded.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',0.8);if(data.length>700000)throw new Error('Screenshot is too detailed. Crop it and try again.');return data;}finally{bitmap.close();}}));setImages(current=>[...current,...added]);}catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setUploading(false);}}
 async function analyze(){setError('');setMessage('');try{const result=await act('inspiration.analyze',{...input(),images}) as {guide:string};setGuide(result.guide);setMessage('Review or edit the suggested guide, then save it to apply.');}catch(e){setError(e instanceof Error?e.message:'Analysis failed.');}}
 return <section className="card"><div className="card-heading"><div><h2>Content inspiration</h2><p>Build an original content style for {brand.name} from examples you like.</p></div></div><form action={async()=>{setError('');setMessage('');try{await act('inspiration.save',input());setMessage('Inspiration saved. Future content will use your enabled style guide.');}catch(e){setError(e instanceof Error?e.message:'Save failed.');}}}>
 <label>Reference page or post links<textarea rows={3} maxLength={20000} value={links} onChange={e=>setLinks(e.target.value)} placeholder="One HTTPS link per line, up to 10 links"/></label>
 <p className="muted">Links are saved as references. Paste captions below for analysis; Soville does not automatically read these pages.</p>
 <label>Example captions<textarea rows={7} maxLength={12000} value={examples} onChange={e=>setExamples(e.target.value)} placeholder="Paste 2-5 posts you like. Separate each example with a blank line."/></label>
 <label>What would you like to adopt?<textarea rows={2} maxLength={1000} value={preferences} onChange={e=>setPreferences(e.target.value)} placeholder="For example: strong hooks, warm educational tone, short paragraphs, practical advice."/></label>
 <label>Reference screenshots<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy||uploading} onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';void addImages(files);}}/></label>
 <small>Up to 3 screenshots. Images are sent for analysis; only the resulting guide is saved.</small>
 <div className="inspiration-images">{images.map((src,index)=><div key={index}><img src={src} alt={`Reference screenshot ${index+1}`}/><Button type="button" size="sm" variant="ghost" disabled={busy||uploading} onClick={()=>setImages(current=>current.filter((_,i)=>i!==index))}>Remove</Button></div>)}</div>
 <Button type="button" variant="outline" disabled={busy||uploading||(examples.trim().length<80&&!images.length)} onClick={()=>void analyze()}>{busy||uploading?'Working...':'Analyze examples'}</Button>
 <label>Your editable style guide<textarea rows={6} maxLength={3000} value={guide} onChange={e=>setGuide(e.target.value)} placeholder="Analyze examples or write your own style guidance here."/></label>
 <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Use this guide for future content</label>
 {error&&<div className="error-box" role="alert">{error}</div>}{message&&<p role="status">{message}</p>}
 <Button disabled={busy||(enabled&&!guide.trim())}>Save inspiration</Button><small>Changes apply to future generations and AI edits. Existing drafts stay editable.</small>
 </form></section>;
}
