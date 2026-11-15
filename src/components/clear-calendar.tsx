'use client';
import { useState } from 'react';
import type { Brand,Snapshot } from '@/lib/types';
import { Button } from './ui/button';
export function ClearCalendar({brand,data,busy,act,onGenerate}:{brand:Brand;data:Snapshot;busy:boolean;act:(action:string,body:Record<string,unknown>)=>Promise<unknown>;onGenerate:()=>void}){
 const [confirm,setConfirm]=useState(false),[error,setError]=useState('');
 if(!['OWNER','ADMIN'].includes(data.role))return null;
 const count=data.posts.filter(p=>p.contentItem.brandId===brand.id&&p.contentItem.planId&&!p.attempts.length&&['UNSCHEDULED','SCHEDULED','FAILED','CANCELLED'].includes(p.deliveryState)).length;
 return <section className="card"><div className="card-heading"><div><h2>Start a fresh calendar</h2><p>Clear generated, unpublished plans for {brand.name} and rebuild from your research.</p></div><Button disabled={busy} variant="outline" onClick={()=>setConfirm(true)}>Clear all</Button></div>{confirm&&<div className="notice"><div><strong>Clear all generated calendar drafts for {brand.name}?</strong><p>This removes {count} currently loaded unpublished posts across all months, cancels scheduled plan posts and stops pending plan generation. Published posts, posts with delivery attempts, manual posts and Autopilot posts remain.</p>{error&&<p role="alert">{error}</p>}<div className="workflow-actions"><Button disabled={busy} onClick={()=>{setError('');void act('calendar.clear',{brandId:brand.id}).then(()=>{setConfirm(false);onGenerate();}).catch(e=>setError(e.message));}}>Clear and regenerate</Button><Button disabled={busy} variant="ghost" onClick={()=>setConfirm(false)}>Keep calendar</Button></div></div></div>}</section>;
}
