import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '../db';
import { serial } from '../usage';
import { sourceSchema,type ResearchSource } from './schema';

export type ResearchPlatform='youtube'|'tiktok'|'linkedin'|'twitter';
export function researchAvailability(){return {youtube:!!process.env.YOUTUBE_API_KEY,tiktok:!!process.env.APIFY_API_TOKEN,linkedin:!!process.env.APIFY_API_TOKEN,twitter:!!process.env.X_BEARER_TOKEN};}
type Row=Record<string,any>;
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:undefined;
export function normalizeSocialRows(platform:'tiktok'|'linkedin'|'twitter',rows:Row[],now=new Date()):ResearchSource[]{
 return rows.flatMap(row=>{
  const text=String(platform==='tiktok'?row.text||'':row.text||row.content||'').slice(0,10000);
  const url=platform==='tiktok'?row.webVideoUrl:platform==='linkedin'?row.postUrl||row.shareUrl:`https://x.com/i/status/${row.id}`;
  if(!text||typeof url!=='string')return [];
  try{const u=new URL(url);const domains=platform==='tiktok'?['tiktok.com']:platform==='linkedin'?['linkedin.com']:['x.com','twitter.com'];if(!domains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))return [];
   const metrics=platform==='twitter'?row.public_metrics||{}:platform==='linkedin'?row.engagement||{}:row;
   const published=platform==='tiktok'?row.createTimeISO:platform==='linkedin'?row.postedAt:row.created_at;
   const source=sourceSchema.safeParse({id:platform+':'+createHash('sha256').update(url).digest('hex').slice(0,24),title:text.slice(0,300),text,url,channel:String(platform==='tiktok'?row.authorMeta?.name||'TikTok creator':platform==='linkedin'?typeof row.author==='string'?row.author:row.author?.name||'LinkedIn author':row.author_id||'X author').slice(0,200),publishedAt:published&&!Number.isNaN(Date.parse(published))?new Date(published).toISOString():undefined,capturedAt:now.toISOString(),views:number(platform==='tiktok'?row.playCount:metrics.impression_count),performance:{likes:number(platform==='tiktok'?row.diggCount:platform==='linkedin'?metrics.reactions:metrics.like_count),replies:number(platform==='tiktok'?row.commentCount:platform==='linkedin'?metrics.comments:metrics.reply_count),shares:number(platform==='tiktok'?row.shareCount:platform==='linkedin'?metrics.reposts:metrics.retweet_count)},comments:(Array.isArray(row.commentsPreview)?row.commentsPreview:[]).map((c:Row)=>String(c.text||'').slice(0,1000)).filter(Boolean).slice(0,20),origin:platform});return source.success?[source.data]:[];
  }catch{return [];}
 }).sort((a,b)=>socialScore(b)-socialScore(a)).slice(0,12);
}
function socialScore(source:ResearchSource){const p=source.performance;return (p?.likes||0)+(p?.replies||0)+(p?.shares||0);}
async function apify(path:string,options:RequestInit={}){const response=await fetch('https://api.apify.com/v2/'+path,{...options,headers:{Authorization:'Bearer '+process.env.APIFY_API_TOKEN,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000),cache:'no-store'});if(!response.ok)throw new Error(`Research provider unavailable (${response.status}). Check Apify access, actor subscription and credits.`);return response.json();}
async function runActor(jobId:string,platform:'tiktok'|'linkedin',query:string){
 const job=await db.backgroundJob.findUniqueOrThrow({where:{id:jobId}});const state=(job.payload as Row).providerRuns?.[platform];let runId:string|undefined=state?.runId;
 if(state?.starting&&!runId)throw new Error('Research provider start could not be confirmed. Check the Apify run before creating a new research request.');
 if(!runId){
  await serial(async tx=>{const current=await tx.backgroundJob.findUniqueOrThrow({where:{id:jobId}});const payload=current.payload as Row;await tx.backgroundJob.update({where:{id:jobId},data:{payload:{...payload,providerRuns:{...payload.providerRuns,[platform]:{starting:true}}}}});});
  const actor=platform==='tiktok'?'clockworks~tiktok-scraper':'yugenox~linkedin-post-search';
  const input=platform==='tiktok'?{searchQueries:[query],searchSection:'/video',videoSearchSorting:'MOST_LIKED',videoSearchDateFilter:'PAST_MONTH',resultsPerPage:12,shouldDownloadVideos:false}:{keyword:query,maxPosts:12,datePosted:'past-month',includeComments:true};
  const response=await apify('actors/'+actor+'/runs?maxItems=12&maxTotalChargeUsd=0.5&timeout=180',{method:'POST',body:JSON.stringify(input)});runId=response.data?.id;if(typeof runId!=='string'||!/^\w+$/.test(runId))throw new Error('Research provider returned an invalid run ID.');
  await serial(async tx=>{const current=await tx.backgroundJob.findUniqueOrThrow({where:{id:jobId}});const payload=current.payload as Row;await tx.backgroundJob.update({where:{id:jobId},data:{payload:{...payload,providerRuns:{...payload.providerRuns,[platform]:{runId}}}}});});
 }
 for(let i=0;i<24;i++){
  const result=await apify('actor-runs/'+runId);const run=result.data;
  if(run.status==='SUCCEEDED'){if(!/^\w+$/.test(run.defaultDatasetId||''))throw new Error('Research provider dataset unavailable.');const rows=await apify('datasets/'+run.defaultDatasetId+'/items?clean=true&limit=50');if(!Array.isArray(rows))throw new Error('Research provider returned an invalid dataset.');return normalizeSocialRows(platform,rows);}
  if(['FAILED','ABORTED','TIMED-OUT'].includes(run.status))throw new Error(platform+' research failed. Check the run in Apify.');
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw new Error('Research provider is still working. Retry this saved job to resume the same provider run.');
}
export async function discoverSocial(platform:'tiktok'|'linkedin'|'twitter',query:string,jobId:string){
 if(platform==='twitter'){
  if(!process.env.X_BEARER_TOKEN)throw new Error('Setup required: configure X_BEARER_TOKEN for X research.');
  const url=new URL('https://api.x.com/2/tweets/search/recent');url.search=new URLSearchParams({query:query+' -is:retweet',max_results:'30','tweet.fields':'public_metrics,created_at,author_id',sort_order:'relevancy'}).toString();
  const response=await fetch(url,{headers:{Authorization:'Bearer '+process.env.X_BEARER_TOKEN},cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`X search unavailable (${response.status}). Check API access and credits.`);const data=await response.json();return {sources:normalizeSocialRows('twitter',data.data||[]),warnings:['X results are a seven-day recent-search sample ranked by observed engagement, not a global trend ranking.']};
 }
 if(!process.env.APIFY_API_TOKEN)throw new Error('Setup required: configure APIFY_API_TOKEN for TikTok and LinkedIn research.');
 return {sources:await runActor(jobId,platform,query),warnings:[platform+' results come from a bounded public-post provider sample. Opening transcripts are unavailable unless supplied; engagement counts do not establish what caused performance.']};
}
