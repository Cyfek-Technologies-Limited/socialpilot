import { describe,it,expect,vi,afterEach } from 'vitest';
import { inspirationSchema,inspirationImagesSchema,inspirationStyle,readInspiration } from '../src/lib/inspiration';
import { textProvider } from '../src/lib/providers/ai';

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('content inspiration',()=>{
 it('only passes an enabled guide to generation, never raw references',()=>{
   const inspiration=inspirationSchema.parse({enabled:true,guide:'Use clear hooks and short paragraphs.',examples:'Reference business sells unrelated products.',links:['https://www.linkedin.com/company/example']});
   expect(inspirationStyle({inspiration})).toEqual({guide:inspiration.guide,preferences:''});
   expect(inspirationStyle({inspiration:{...inspiration,enabled:false}})).toBeUndefined();
   expect(inspirationStyle({inspiration:{...inspiration,guide:' '}})).toBeUndefined();
 });
 it('ignores malformed saved preferences and rejects unsafe reference links',()=>{
   expect(readInspiration(null)).toBeNull();
   expect(inspirationSchema.safeParse({links:['javascript:alert(1)']} ).success).toBe(false);
   expect(inspirationSchema.safeParse({links:['http://example.com']} ).success).toBe(false);
   expect(inspirationSchema.safeParse({examples:'x'.repeat(12001)}).success).toBe(false);
 });
 it('limits analysis screenshots to inline images without remote requests',()=>{
   expect(inspirationImagesSchema.parse(['data:image/jpeg;base64,YQ=='])).toHaveLength(1);
   expect(inspirationImagesSchema.safeParse(['https://example.com/image.png']).success).toBe(false);
   expect(inspirationImagesSchema.safeParse(Array(4).fill('data:image/jpeg;base64,YQ==')).success).toBe(false);
 });
 it('sends reference screenshots using image input while retaining JSON output',async()=>{
   vi.stubEnv('OPENAI_API_KEY','test');vi.stubEnv('OPENAI_TEXT_MODEL','gpt-4.1-mini');
   const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:'{"guide":"Use short paragraphs."}'}}]}),{status:200}));vi.stubGlobal('fetch',fetcher);
   await textProvider.generate('Analyze style',{examples:'Text'},['data:image/jpeg;base64,YQ==']);
   const body=JSON.parse(fetcher.mock.calls[0][1].body);
   expect(body.messages[1].content).toEqual([{type:'text',text:'{"examples":"Text"}'},{type:'image_url',image_url:{url:'data:image/jpeg;base64,YQ==',detail:'auto'}}]);
   expect(body.response_format).toEqual({type:'json_object'});
 });
});
