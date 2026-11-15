'use client';
import { useEffect,useRef,useState } from 'react';
import { z } from 'zod';
import { researchPlatformSchema,sourceSchema } from '@/lib/strategy/schema';

export const researchDraftSchema=z.object({platforms:z.array(researchPlatformSchema).min(1).max(4).default(['youtube']),query:z.string().max(150),competitors:z.string().max(5000),daily:z.boolean(),emailReports:z.boolean(),sources:z.array(sourceSchema).max(10),title:z.string().max(300),url:z.string().max(5000),channel:z.string().max(200),opening:z.string().max(500),comments:z.string().max(20000)});
export type ResearchDraft=z.infer<typeof researchDraftSchema>;
export function researchDraftKey(userId:string,workspaceId:string,brandId:string){return 'soville:research-draft:v1:'+JSON.stringify([userId,workspaceId,brandId]);}
export function restoreResearchDraft(storage:Pick<Storage,'getItem'>,key:string,fallback:ResearchDraft){
 try{const raw=storage.getItem(key);if(!raw)return fallback;const parsed=researchDraftSchema.safeParse(JSON.parse(raw));return parsed.success?parsed.data:fallback;}catch{return fallback;}
}
export function useResearchDraft(key:string,defaults:ResearchDraft){
 const initial=useRef(defaults);const current=useRef(defaults);
 const [draft,setDraft]=useState(defaults),[ready,setReady]=useState(false),[saved,setSaved]=useState(false),[unavailable,setUnavailable]=useState(false);
 useEffect(()=>{try{const stored=restoreResearchDraft(window.localStorage,key,initial.current);current.current=stored;setDraft(stored);setSaved(window.localStorage.getItem(key)!==null);}catch{setUnavailable(true);}setReady(true);},[key]);
 function update(patch:Partial<ResearchDraft>){
  const next={...current.current,...patch};current.current=next;setDraft(next);
  // Write in the input event, so an immediate refresh cannot beat a debounce timer.
  try{window.localStorage.setItem(key,JSON.stringify(next));setSaved(true);setUnavailable(false);}catch{setUnavailable(true);setSaved(false);}
 }
 return {draft,update,ready,saved,unavailable};
}
