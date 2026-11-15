import { describe,it,expect,vi,afterEach } from 'vitest';
import { normalizeSocialRows,discoverSocial } from '../src/lib/strategy/social-discovery';
import { validatePlatformText,textLength } from '../src/lib/content-platforms';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('platform research and writing rules',()=>{
 it('enforces X weighted limits including emoji, links and hashtags',()=>{
   expect(()=>validatePlatformText('twitter','a'.repeat(280))).not.toThrow();
   expect(()=>validatePlatformText('twitter','a'.repeat(281))).toThrow('280');
   expect(()=>validatePlatformText('twitter','a'.repeat(275),'#more')).toThrow('280');
   expect(textLength('twitter','😀'.repeat(140))).toBe(280);
   expect(textLength('twitter','Read https://example.com/a/very/long/url')).toBe(28);
 });
 it('keeps observed public performance and text when normalizing TikTok and LinkedIn',()=>{
   const tiktok=normalizeSocialRows('tiktok',[{text:'Website tips',webVideoUrl:'https://www.tiktok.com/@creator/video/123',playCount:1000,diggCount:40,commentCount:4,shareCount:2,authorMeta:{name:'Creator'}}]);
   expect(tiktok[0].views).toBe(1000);expect(tiktok[0].performance?.likes).toBe(40);expect(tiktok[0].first3Seconds).toBe('');
   const linkedin=normalizeSocialRows('linkedin',[{text:'A full useful post',postUrl:'https://www.linkedin.com/posts/example',author:'Creator',engagement:{reactions:50,comments:2},commentsPreview:[{text:'How do I start?'}]}]);expect(linkedin[0].text).toBe('A full useful post');expect(linkedin[0].comments).toEqual(['How do I start?']);expect(linkedin[0].views).toBeUndefined();
 });
 it('does not convert a provider error row or unrelated URL into research evidence',()=>{
   expect(normalizeSocialRows('linkedin',[{error:'Failed'},{text:'Unrelated',postUrl:'https://example.com/'}])).toEqual([]);
 });
 it('searches X with the user niche and retains measured engagement',async()=>{
   vi.stubEnv('X_BEARER_TOKEN','test');const fetcher=vi.fn().mockResolvedValue(Response.json({data:[{id:'123',text:'Practical website advice',public_metrics:{like_count:200,reply_count:10,retweet_count:20}}]}));vi.stubGlobal('fetch',fetcher);
   const result=await discoverSocial('twitter','website development','job');const url=new URL(fetcher.mock.calls[0][0]);expect(url.searchParams.get('query')).toContain('website development');expect(result.sources[0].performance?.likes).toBe(200);expect(result.sources[0].origin).toBe('twitter');
 });
});
