import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const base=process.env.SMOKE_URL||'http://localhost:3000';const nonce=randomBytes(6).toString('hex');
class Client {
 cookie='';workspace='';
 async request(path,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(this.cookie?{Cookie:this.cookie}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});const cookies=response.headers.getSetCookie();if(cookies.length)this.cookie=cookies.map(c=>c.split(';')[0]).join('; ');let result;try{result=await response.json();}catch{result={error:`HTTP ${response.status}`};}return {status:response.status,result};}
 async action(action,body={}){return this.request('/api/app',{action,...(this.workspace?{workspaceId:this.workspace}:{}),...body});}
 async register(label){const res=await this.request('/api/auth/sign-up/email',{email:`smoke-${label}-${nonce}@example.test`,password:randomBytes(24).toString('base64url'),name:`Smoke ${label}`});assert.equal(res.status,200,JSON.stringify(res.result));assert.ok(this.cookie);}
 async setup(label){const created=await this.action('workspace.create',{name:`Smoke ${label}`,displayName:`Smoke ${label}`,timezone:'Africa/Lagos',language:'en'});assert.equal(created.status,200,JSON.stringify(created.result));this.workspace=created.result.id;const brand=await this.action('brand.save',{name:`Brand ${label}`,description:'A fictional brand for isolated integration testing.',audience:'Test audience'});assert.equal(brand.status,200,JSON.stringify(brand.result));return brand.result.id;}
}
const a=new Client(),b=new Client();await a.register('Owner');await b.register('Other');const brandId=await a.setup('A');await b.setup('B');
assert.equal((await b.action('brand.save',{id:brandId,name:'Tampered',description:'Unauthorized attempt',audience:'x',workspaceId:a.workspace})).status,403);
assert.equal((await b.request(`/api/app?workspace=${a.workspace}`)).status,403);
const knowledge=await a.action('knowledge.save',{brandId,kind:'hours',question:'Hours?',answer:'Monday to Friday, 9am–5pm.'});assert.equal(knowledge.status,200);
const connected=await a.action('demo.connect',{brandId});assert.equal(connected.status,200);const accountId=connected.result.id;assert.equal((await a.action('account.consent',{id:accountId,allowed:true})).status,200);
const saved=await a.action('post.save',{brandId,topic:'Integration draft',caption:'[DEMO] A test draft',accountId,platform:'instagram'});assert.equal(saved.status,200,JSON.stringify(saved.result));const id=saved.result.id;
assert.notEqual((await a.action('post.schedule',{id,version:1,localTime:'2030-11-10T09:00',timezone:'Africa/Lagos'})).status,200);
assert.equal((await a.action('post.approve',{id,version:1})).status,200);assert.equal((await a.action('post.schedule',{id,version:1,localTime:'2030-11-10T09:00',timezone:'Africa/Lagos'})).status,200);
let snapshot=(await a.request(`/api/app?workspace=${a.workspace}`)).result;let post=snapshot.posts.find(p=>p.id===id);assert.equal(post.scheduledAt,'2030-11-10T08:00:00.000Z');assert.equal(post.deliveryState,'SCHEDULED');
assert.ok(!JSON.stringify(snapshot).includes('encryptedToken'));assert.ok(!JSON.stringify(snapshot).includes('BETTER_AUTH_SECRET'));
assert.equal((await a.action('post.save',{id,version:1,brandId,topic:'Edited topic',caption:'Updated draft',accountId,platform:'instagram'})).status,200);
snapshot=(await a.request(`/api/app?workspace=${a.workspace}`)).result;post=snapshot.posts.find(p=>p.id===id);assert.equal(post.approvalState,'DRAFT');assert.equal(post.deliveryState,'UNSCHEDULED');assert.equal(post.version,2);assert.equal(post.revisions.length,1);
assert.equal((await a.action('post.save',{id,version:1,brandId,topic:'Stale version',caption:'Should fail'})).status,409);
assert.equal((await a.action('member.save',{email:`smoke-Other-${nonce}@example.test`,role:'VIEWER'})).status,200);
assert.equal((await b.action('post.approve',{id,workspaceId:a.workspace})).status,403);assert.equal((await b.action('brand.save',{id:brandId,name:'Viewer edit',workspaceId:a.workspace})).status,403);
assert.equal((await a.action('onboarding.step',{step:7})).status,200);
assert.equal((await a.action('plan.generate',{brandId,count:3,objective:'awareness',instructions:''})).status,200);
for(const path of ['/','/sign-up','/privacy','/terms'])assert.equal((await fetch(base+path)).status,200);
console.log('HTTP smoke passed: registration, sessions, tenant isolation, knowledge persistence, demo connection, consent, approval enforcement, UTC scheduling, edit invalidation, stale-edit rejection, viewer restrictions, secret exclusion, and generation outbox.');
console.log('A labelled Smoke A workspace was created in the local evaluation database. No external publishing occurred.');
