import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync } from 'node:fs';
import type { PrismaClient } from '@prisma/client';
const mocks=vi.hoisted(()=>({generate:vi.fn(),put:vi.fn()}));
vi.mock('../src/lib/providers/ai',()=>({textProvider:{generate:mocks.generate}}));
vi.mock('../src/lib/providers/storage',()=>({storage:{put:mocks.put}}));
vi.mock('../src/lib/templates',()=>({renderTemplate:async()=>Buffer.from('test-graphic')}));
let pg:PGlite,server:PGLiteSocketServer,db:PrismaClient,queue:typeof import('../src/lib/autopilot')['queueAutopilot'],generate:typeof import('../src/lib/autopilot')['generateAutopilot'];
const config={enabled:true,accountId:'linkedin-auto',days:[1,3,5],time:'09:00',timezone:'Africa/Lagos',authorizedBy:'owner',enabledAt:'2026-11-09T00:00:00Z'};
beforeAll(async()=>{
 pg=await PGlite.create();await pg.exec(readFileSync('prisma/migrations/202611050001_initial/migration.sql','utf8').replace(/^\uFEFF/,''));server=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:55438,maxConnections:1});await server.start();
 vi.stubEnv('DATABASE_URL','postgresql://postgres:postgres@127.0.0.1:55438/postgres?sslmode=disable&connection_limit=1');vi.stubEnv('APP_MODE','live');for(const key of ['OPENAI_API_KEY','OPENAI_TEXT_MODEL','S3_ENDPOINT','S3_REGION','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','TOKEN_ENCRYPTION_KEY'])vi.stubEnv(key,'configured');
 db=(await import('../src/lib/db')).db;const api=await import('../src/lib/autopilot');queue=api.queueAutopilot;generate=api.generateAutopilot;
 await db.workspace.create({data:{id:'auto-w',name:'Autopilot workspace',mode:'live'}});await db.brand.create({data:{id:'auto-b',workspaceId:'auto-w',name:'Brand',description:'A design studio',audience:'Business owners',preferences:{autopilot:config},automation:{create:{autoPublish:true}}}});
 await db.socialAccount.create({data:{id:'linkedin-auto',workspaceId:'auto-w',brandId:'auto-b',platform:'linkedin',providerAccountId:'urn:li:person:owner',username:'Owner',mode:'live',encryptedToken:'encrypted-test-value',autoPublishConsentAt:new Date(),tokenExpiresAt:new Date('2051-01-01'),capabilities:{publishImage:true}}});
 mocks.generate.mockResolvedValue(JSON.stringify({topic:'Thoughtful design',caption:'Useful professional content.',graphicTitle:'Thoughtful design',graphicBody:'Give your brand room to grow.'}));mocks.put.mockResolvedValue(undefined);
});
afterAll(async()=>{await db?.$disconnect();await server?.stop();await pg?.close();vi.unstubAllEnvs();});
describe('autopilot database lifecycle',()=>{
 it('queues one durable generation job per schedule slot, even when the planner repeats',async()=>{const now=new Date('2050-01-02T18:00:00Z');await queue(now);await queue(now);expect(await db.backgroundJob.count({where:{kind:'autopilot'}})).toBe(1);expect(await db.usageEvent.count({where:{kind:'text'}})).toBe(1);});
 it('creates a caption, graphic, schedule and recorded automatic authorization exactly once',async()=>{const job=await db.backgroundJob.findFirstOrThrow();await generate(job.id);await generate(job.id);const post=await db.platformPost.findUniqueOrThrow({where:{id:job.id},include:{approvals:true,media:true}});expect(post.platform).toBe('linkedin');expect(post.deliveryState).toBe('SCHEDULED');expect(post.caption).toBe('Useful professional content.');expect(post.media?.source).toBe('autopilot');expect(post.approvals[0].actorId).toBe('autopilot:owner');expect(mocks.generate).toHaveBeenCalledTimes(1);expect(await db.platformPost.count()).toBe(1);expect(await db.usageEvent.count({where:{status:'RESERVED'}})).toBe(0);});
 it('refuses generation after autopilot is disabled',async()=>{await queue(new Date('2050-01-04T18:00:00Z'));const jobs=await db.backgroundJob.findMany({orderBy:{createdAt:'desc'}});const job=jobs.find(j=>j.id!==undefined&&!(j.payload as {slot:string}).slot.startsWith('2050-01-03'))!;await db.brand.update({where:{id:'auto-b'},data:{preferences:{autopilot:{...config,enabled:false}}}});await expect(generate(job.id)).rejects.toThrow('settings changed');expect(mocks.generate).toHaveBeenCalledTimes(1);});
});
