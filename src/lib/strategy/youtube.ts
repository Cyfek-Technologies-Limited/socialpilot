import 'server-only';
import { sourceSchema, type ResearchSource } from './schema';
async function api(path:string,params:Record<string,string>){
 const url=new URL('https://www.googleapis.com/youtube/v3/'+path);url.search=new URLSearchParams({...params,key:process.env.YOUTUBE_API_KEY||''}).toString();
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`YouTube ${path} unavailable (${response.status}). Check API key, quota and access.`);
 return response.json();
}
export async function discoverYouTube(query:string,competitors:string[],now=new Date()):Promise<{sources:ResearchSource[];warnings:string[]}>{
 if(!process.env.YOUTUBE_API_KEY)throw new Error('Setup required: add YOUTUBE_API_KEY for live niche research, or add manual evidence.');
 const searches=await Promise.all([{q:query,order:'viewCount'},...competitors.map(channelId=>({channelId,order:'date'}))].map(params=>api('search',{...params,part:'snippet',type:'video',maxResults:'12',publishedAfter:new Date(now.getTime()-30*86400000).toISOString()})));
 const ids=[...new Set<string>(searches.flatMap(data=>data.items.map((v:{id:{videoId:string}})=>v.id.videoId)))];
 if(!ids.length)return {sources:[],warnings:['No matching videos found in the last 30 days. Try a broader niche.']};
 const data=await api('videos',{part:'snippet,statistics',id:ids.slice(0,40).join(',')});const warnings:string[]=[];
 const sources:ResearchSource[]=data.items.map((v:{id:string;snippet:{title:string;channelTitle:string;channelId:string;publishedAt:string};statistics:{viewCount?:string}})=>sourceSchema.parse({id:'yt:'+v.id,title:v.snippet.title,url:'https://www.youtube.com/watch?v='+v.id,channel:v.snippet.channelTitle,channelId:v.snippet.channelId,publishedAt:v.snippet.publishedAt,capturedAt:now.toISOString(),views:Number(v.statistics.viewCount||0),origin:'youtube'}));
 for(const source of sources.slice(0,6)){
  try{const comments=await api('commentThreads',{part:'snippet',videoId:source.id.slice(3),maxResults:'15',order:'relevance',textFormat:'plainText'});source.comments=comments.items.map((c:{snippet:{topLevelComment:{snippet:{textOriginal:string}}}})=>c.snippet.topLevelComment.snippet.textOriginal.slice(0,1000));}catch{warnings.push(`Comments unavailable for ${source.title.slice(0,80)}.`);}
 }
 for(const channelId of competitors){const sample=sources.filter(s=>s.channelId===channelId&&s.views!==undefined);if(sample.length<5)continue;const counts=sample.map(s=>s.views!).sort((a,b)=>a-b);const median=counts[Math.floor(counts.length/2)];if(median>0)for(const source of sample)source.baselineRatio=Math.round(source.views!/median*100)/100;}
 warnings.push('Rankings cover this 30-day YouTube search sample, not all social platforms. Baseline ratios compare lifetime views within the sampled channel; age and topic can affect them. First-three-second transcripts are not supplied by the discovery API.');
 return {sources,warnings};
}
