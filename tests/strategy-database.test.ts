import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync } from 'node:fs';
import type { PrismaClient } from '@prisma/client';
const mocks=vi.hoisted(()=>({generate:vi.fn()}));
vi.mock('../src/lib/providers/ai',async()=>({...await vi.importActual<typeof import('../src/lib/providers/ai')>('../src/lib/providers/ai'),textProvider:{generate:mocks.generate}}));
let pg:PGlite,server:PGLiteSocketServer,db:PrismaClient;
const source={id:'manual:evidence',title:'An observed source',url:'https://example.com/post',channel:'Creator',origin:'manual',comments:['How do I start?'],first3Seconds:'Try this first',capturedAt:'2026-11-14T10:00:00Z'};
beforeAll(async()=>{pg=await PGlite.create();await pg.exec(readFileSync('prisma/migrations/202611050001_initial/migration.sql','utf8').replace(/^\uFEFF/,''));server=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:55448,maxConnections:1});await server.start();process.env.DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55448/postgres?sslmode=disable&connection_limit=1';process.env.APP_MODE='live';db=(await import('../src/lib/db')).db;await db.workspace.create({data:{id:'team-w',name:'Team',mode:'live',limits:{text:100}}});await db.brand.create({data:{id:'team-b',workspaceId:'team-w',name:'Brand',preferences:{researchSettings:{query:'Small business software',competitors:[],daily:true},researchSources:[source]}}});});
afterAll(async()=>{await db?.$disconnect();await server?.stop();await pg?.close();});
describe('research and reporting persistence',()=>{
 it('stores findings with source evidence while preserving other brand preferences',async()=>{
   mocks.generate.mockResolvedValueOnce(JSON.stringify({summary:'Evidence-led strategy',themes:[],questions:[{title:'How to start',detail:'Observed question',sourceIds:[source.id]}],hooks:[{sourceId:source.id,hypothesis:'A direct opening may help'}],angles:[]}));
   await db.backgroundJob.create({data:{id:'research-1',key:'job:research-1',workspaceId:'team-w',kind:'research',payload:{brandId:'team-b',live:false}}});
   const {generateResearch}=await import('../src/lib/strategy/service');await generateResearch('research-1');const brand=await db.brand.findUniqueOrThrow({where:{id:'team-b'}});const prefs=brand.preferences as Record<string,any>;
   expect(prefs.research.sources[0].id).toBe(source.id);expect(prefs.researchSettings.query).toBe('Small business software');expect(prefs.research.warnings[0]).toContain('No live');
 });
 it('rejects a cross-tenant brand before sending any data to AI',async()=>{
   await db.workspace.create({data:{id:'other-w',name:'Other',mode:'live'}});await db.backgroundJob.create({data:{id:'cross',key:'job:cross',workspaceId:'other-w',kind:'research',payload:{brandId:'team-b',live:false}}});const before=mocks.generate.mock.calls.length;await expect((await import('../src/lib/strategy/service')).generateResearch('cross')).rejects.toThrow();expect(mocks.generate.mock.calls).toHaveLength(before);
 });
 it('keeps missing engagement unavailable and groups manually entered revenue by currency',async()=>{
   const content=await db.contentItem.create({data:{workspaceId:'team-w',brandId:'team-b',topic:'Published topic'}});await db.platformPost.create({data:{id:'reported',workspaceId:'team-w',contentItemId:content.id,caption:'A complete post',deliveryState:'PUBLISHED',publishedAt:new Date()}});
   mocks.generate.mockResolvedValue(JSON.stringify({summary:'One post published; engagement unavailable.',nextActions:['Collect platform measurements.']}));
   await db.backgroundJob.create({data:{id:'report-1',key:'job:report-1',workspaceId:'team-w',kind:'report',payload:{brandId:'team-b'}}});const {generateReport}=await import('../src/lib/strategy/service');await generateReport('report-1');let brand=await db.brand.findUniqueOrThrow({where:{id:'team-b'}});let prefs=brand.preferences as Record<string,any>;expect(prefs.teamReport.published).toBe(1);expect(prefs.teamReport.impressions).toBeNull();expect(prefs.teamReport.measurementCoverage).toBe(0);
   prefs.postMetrics=[{postId:'reported',impressions:100,reactions:4,comments:2,shares:1,clicks:3,revenue:25000,currency:'NGN',conversions:1,recordedAt:new Date().toISOString()}];await db.brand.update({where:{id:'team-b'},data:{preferences:prefs}});await generateReport('report-1');brand=await db.brand.findUniqueOrThrow({where:{id:'team-b'}});prefs=brand.preferences as Record<string,any>;expect(prefs.teamReport.revenueByCurrency).toEqual({NGN:25000});expect(prefs.teamReport.conversions).toBe(1);expect(prefs.teamReport.impressions).toBe(100);
 });
 it('deduplicates scheduled daily work and respects workspace pause',async()=>{
   process.env.YOUTUBE_API_KEY='test';const {queueStrategy}=await import('../src/lib/strategy/service');const now=new Date('2026-11-15T05:00:00Z');expect((await queueStrategy(now)).queued).toBe(2);expect((await queueStrategy(now)).queued).toBe(0);await db.workspace.update({where:{id:'team-w'},data:{paused:true}});expect((await queueStrategy(new Date('2026-11-16T05:00:00Z'))).queued).toBe(0);
 });
 it('resumes a partially generated month without regenerating successful batches',async()=>{
   await db.workspace.update({where:{id:'team-w'},data:{paused:false}});
   await db.backgroundJob.create({data:{id:'mixed-month',key:'job:mixed-month',workspaceId:'team-w',kind:'plan',payload:{brandId:'team-b',count:5,production:true,objective:'awareness',instructions:'',month:'2026-12',platform:'linkedin'}}});
   const batch=(input:{count:number;itemOffset:number})=>JSON.stringify({items:Array.from({length:input.count},(_,i)=>({topic:'Topic '+(input.itemOffset+i),category:'educational',audience:'Owners',objective:'awareness',caption:'A complete editable caption.',cta:'Ask us',graphicBrief:'A clear branded layout',platform:'linkedin',production:{format:'video',sourceIds:[source.id],video:[{seconds:3,onScreen:'A useful hook',narration:'Start here',visual:'Opening'},{seconds:10,onScreen:'Practical advice',narration:'Explain the idea',visual:'Example'},{seconds:10,onScreen:'Take action',narration:'Try it today',visual:'Closing'}]}}))});
   mocks.generate.mockReset();mocks.generate.mockImplementationOnce(async(_system,input)=>batch(input)).mockRejectedValueOnce(new Error('Temporary provider failure'));
   const {generatePlan}=await import('../src/lib/jobs');await expect(generatePlan('mixed-month')).rejects.toThrow('Temporary');expect(await db.contentPlan.count({where:{id:'mixed-month'}})).toBe(0);
   const cached=await db.backgroundJob.findUniqueOrThrow({where:{id:'mixed-month'}});expect((cached.payload as {draftItems:unknown[]}).draftItems).toHaveLength(4);
   mocks.generate.mockImplementation(async(_system,input)=>batch(input));await generatePlan('mixed-month');await generatePlan('mixed-month');
   expect(mocks.generate).toHaveBeenCalledTimes(3);const posts=await db.platformPost.findMany({where:{contentItem:{planId:'mixed-month'}},include:{contentItem:true}});expect(posts).toHaveLength(5);for(const post of posts){expect(post.approvalState).toBe('DRAFT');expect(post.deliveryState).toBe('UNSCHEDULED');expect(JSON.parse(post.contentItem.graphicBrief).production.video).toHaveLength(3);}
 });
});
