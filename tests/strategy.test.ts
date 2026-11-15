import { describe,it,expect,vi,afterEach } from 'vitest';
import { validateEvidence,hookEvidence,productionSchema,researchContext,sourceSchema } from '../src/lib/strategy/schema';
import { discoverYouTube } from '../src/lib/strategy/youtube';
const source=sourceSchema.parse({id:'s1',title:'The title is not the spoken hook',channel:'Creator',url:'https://example.com/post',origin:'manual',capturedAt:'2026-11-14T10:00:00Z'});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('sourced strategy',()=>{
 it('rejects invented source references instead of displaying them as evidence',()=>{
   expect(()=>validateEvidence({summary:'Test',themes:[{title:'A theme',detail:'Claim',sourceIds:['invented']}],questions:[],angles:[],hooks:[]},[source])).toThrow('unsupported');
 });
 it('never presents a video title as observed first-three-second dialogue',()=>{
   expect(hookEvidence(source).label).toContain('unavailable');
   expect(hookEvidence({...source,first3Seconds:'Actual supplied opening'})).toEqual({text:'Actual supplied opening',label:'First 3 seconds · user supplied'});
 });
 it('requires real scenes or slides for a production format, including a short hook',()=>{
   expect(productionSchema.safeParse({format:'video'}).success).toBe(false);
   expect(productionSchema.safeParse({format:'carousel'}).success).toBe(false);
   expect(productionSchema.safeParse({format:'video',video:Array(3).fill({seconds:10,onScreen:'Text',narration:'Words',visual:'Scene'})}).success).toBe(false);
 });
 it('passes concise sourced findings to generation without duplicating raw comments',()=>{
   const context=researchContext({research:{generatedAt:'2026-11-14T10:00:00Z',sources:[{...source,comments:['Private reference text']}],warnings:[],analysis:{summary:'Observed evidence',themes:[],questions:[],angles:[],hooks:[]}}});
   expect(context?.sources[0]).toEqual({id:source.id,title:source.title,url:source.url});
   expect(JSON.stringify(context)).not.toContain('Private reference text');
 });
 it('requires a live data key instead of fabricating trend results',async()=>{
   vi.stubEnv('YOUTUBE_API_KEY','');await expect(discoverYouTube('software',[])).rejects.toThrow('YOUTUBE_API_KEY');
 });
 it('retrieves dated videos and comments and reports a sampled competitor baseline',async()=>{
   vi.stubEnv('YOUTUBE_API_KEY','test');const channel='UC'+'a'.repeat(22);const fetcher=vi.fn(async(input:URL)=>{
     const u=new URL(input);if(u.pathname.endsWith('/search'))return Response.json({items:Array.from({length:6},(_,i)=>({id:{videoId:'v'+i}}))});
     if(u.pathname.endsWith('/videos'))return Response.json({items:Array.from({length:6},(_,i)=>({id:'v'+i,snippet:{title:'Video '+i,channelTitle:'Competitor',channelId:channel,publishedAt:'2026-11-01T10:00:00Z'},statistics:{viewCount:String((i+1)*100)}}))});
     return Response.json({items:[{snippet:{topLevelComment:{snippet:{textOriginal:'How do I start?'}}}}]});
   });vi.stubGlobal('fetch',fetcher);const result=await discoverYouTube('software',[channel],new Date('2026-11-14T10:00:00Z'));
   expect(result.sources).toHaveLength(6);expect(result.sources[0].comments).toEqual(['How do I start?']);expect(result.sources[0].first3Seconds).toBe('');expect(result.sources[5].baselineRatio).toBe(1.5);
   expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('publishedAfter')).toBe('2026-10-15T10:00:00.000Z');
 });
});
