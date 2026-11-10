import { queueAutopilot, generateAutopilot } from './autopilot';
import { readAutopilot } from './autopilot-config';
import { linkedInUploadImage, linkedInPublish } from './providers/linkedin';
import 'server-only';
import { Inngest } from 'inngest';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { appMode } from './config';
import { publishGuard, usableFacts, localToUtc } from './policy';
import { decrypt, encrypt } from './crypto';
import { instagram, AmbiguousDelivery, refreshToken } from './providers/social';
import { storage } from './providers/storage';
import { generationSystem, textProvider, planSchema, imageProvider } from './providers/ai';
import { serial, reserve } from './usage';
export const inngest=new Inngest({id:'socialpilot-ai'});
export async function deliver(postId:string,expectedKey:string) {
  const claimed=await db.platformPost.updateMany({where:{id:postId,deliveryKey:expectedKey,deliveryState:'SCHEDULED',scheduledAt:{lte:new Date()}},data:{deliveryState:'PROCESSING'}});
  if(claimed.count!==1)return {skipped:true};
  const post=await db.platformPost.findUniqueOrThrow({where:{id:postId},include:{account:true,media:true,approvals:true,contentItem:{include:{brand:{include:{workspace:true}}}}}});
  const brand=post.contentItem.brand;const workspace=brand.workspace;
  const attempt=await db.publishAttempt.create({data:{workspaceId:post.workspaceId,postId:post.id,deliveryKey:expectedKey,status:'PROCESSING'}});
  let externalWrite=false;
  try {
    const account=post.account;if(!account)throw new Error('Choose a connected account.');
    publishGuard({approvalState:post.approvalState,version:post.version,approvedVersion:post.approvals.find(a=>a.version===post.version)?.version,workspacePaused:workspace.paused,brandPaused:brand.paused,accountStatus:account.status,mode:appMode(),accountMode:account.mode,hasConsent:!!account.autoPublishConsentAt});
    if(workspace.mode!==appMode())throw new Error('Workspace mode differs from deployment mode.');
    let providerPostId:string;
    if(workspace.mode==='demo') providerPostId=`demo_${expectedKey}`;
    else {
      if(!account.encryptedToken)throw new Error('A valid account token is required.');
      if(!['instagram','linkedin'].includes(account.platform)||post.platform!==account.platform)throw new Error('Post platform does not match its connected account.');
      if(account.tokenExpiresAt&&account.tokenExpiresAt<=new Date())throw new Error('Account token expired. Reconnect account.');
      const token=decrypt(account.encryptedToken);
      let container=post.providerContainerId;
      if(account.platform==='linkedin'){
        if(post.media&&!container){const response=await fetch(await storage.url(post.media.storageKey,3600),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Media download failed.');container=await linkedInUploadImage(account.providerAccountId,token,new Uint8Array(await response.arrayBuffer()));await db.platformPost.update({where:{id:post.id},data:{providerContainerId:container}});}
      }else{
        if(!post.media)throw new Error('Instagram requires an image.');
        if(!container){container=await instagram.container(account.providerAccountId,token,await storage.url(post.media.storageKey,86400),[post.caption,post.hashtags].filter(Boolean).join('\n\n'));await db.platformPost.update({where:{id:post.id},data:{providerContainerId:container}});}
        const status=await instagram.containerStatus(container,token);if(status!=='FINISHED')throw new Error(`Media is ${status}. Retry once processing finishes.`);
      }
      // Recheck pause, consent, approval, and revision immediately before the irreversible request.
      const latest=await db.platformPost.findUniqueOrThrow({where:{id:post.id},include:{account:true,approvals:true,contentItem:{include:{brand:{include:{workspace:true}}}}}});
      publishGuard({approvalState:latest.approvalState,version:latest.version,approvedVersion:latest.approvals.find(a=>a.version===latest.version)?.version,workspacePaused:latest.contentItem.brand.workspace.paused,brandPaused:latest.contentItem.brand.paused,accountStatus:latest.account?.status||'DISCONNECTED',mode:appMode(),accountMode:latest.account?.mode||'',hasConsent:!!latest.account?.autoPublishConsentAt});
      if(post.id.startsWith('autopilot-')){const source=await db.backgroundJob.findUniqueOrThrow({where:{id:post.id}});const payload=source.payload as {enabledAt:string;accountId:string};const settings=readAutopilot(latest.contentItem.brand.preferences);if(!settings?.enabled||settings.enabledAt!==payload.enabledAt||settings.accountId!==latest.account?.id)throw new Error('Autopilot authorization changed. No post was sent.');}
      externalWrite=true;providerPostId=account.platform==='linkedin'?await linkedInPublish(account.providerAccountId,token,[post.caption,post.hashtags].filter(Boolean).join('\n\n'),container||undefined):await instagram.publish(account.providerAccountId,token,container!);
      if(!providerPostId)throw new AmbiguousDelivery('Instagram returned no publication ID. Reconciliation required.');
    }
    await db.$transaction([
      db.platformPost.update({where:{id:post.id},data:{deliveryState:'PUBLISHED',publishedAt:new Date(),providerPostId,lastError:null}}),
      db.publishAttempt.update({where:{id:attempt.id},data:{status:'PUBLISHED',providerPostId}}),
      db.usageEvent.create({data:{workspaceId:post.workspaceId,kind:'published',key:`published:${expectedKey}`,status:'SETTLED'}}),
      db.auditLog.create({data:{workspaceId:post.workspaceId,actorId:'worker',action:workspace.mode==='demo'?'demo.delivery.simulated':'post.published',resourceId:post.id}})
    ]);return {providerPostId};
  }catch(error){const ambiguous=externalWrite||error instanceof AmbiguousDelivery;const message=error instanceof Error?error.message:'Publishing failed.';await db.$transaction([db.platformPost.update({where:{id:post.id},data:{deliveryState:ambiguous?'RECONCILE':'FAILED',lastError:message}}),db.publishAttempt.update({where:{id:attempt.id},data:{status:ambiguous?'RECONCILE':'FAILED',error:message}})]);return {error:message};}
}
export async function generatePlan(jobId:string) {
  const job=await db.backgroundJob.findUniqueOrThrow({where:{id:jobId}});const data=job.payload as {brandId:string;count:number;objective:string;instructions:string;businessDescription?:string;month?:string;platform?:'linkedin'|'instagram'};
  const brand=await db.brand.findFirstOrThrow({where:{id:data.brandId,workspaceId:job.workspaceId},include:{workspace:true,knowledge:true,products:true,content:{orderBy:{createdAt:'desc'},take:20,select:{topic:true}}}});
  if(brand.workspace.mode!==appMode())throw new Error('Deployment mode mismatch.');
  let generated;
  if(brand.workspace.mode==='demo') {
    generated=planSchema.parse({items:Array.from({length:data.count},(_,i)=>({topic:['A helpful starting point','Meet the brand','Your questions, answered','Small steps, lasting habits','What matters to our community','Behind the scenes','A fresh perspective'][i%7],category:'educational',audience:brand.audience,objective:data.objective,caption:`[DEMO DRAFT] ${brand.name}: ${brand.description||'Share what makes your business special.'}\n\n${brand.cta||'What would you like to learn about next?'}`,cta:brand.cta,graphicBrief:'A clean branded educational graphic with an abstract background.',platform:'instagram'}))});
  } else {const raw=await textProvider.generate(generationSystem+' Use the requested platform instead of the example platform. The supplied businessDescription is user-provided business context.',{brand:{name:brand.name,description:brand.description,niche:brand.niche,audience:brand.audience,tone:brand.tone,cta:brand.cta},verifiedFacts:usableFacts(brand.knowledge),products:brand.products,recentTopics:brand.content,count:data.count,objective:data.objective,instructions:data.instructions,businessDescription:data.businessDescription,month:data.month,platform:data.platform,planningGuidance:"Build a varied month of useful content about the supplied business description and its products or services. Treat the description as business context, never invent prices, results or offers. Mix educational, promotional, community and informational posts. Return the requested platform for every item."});generated=planSchema.parse(JSON.parse(raw));if(generated.items.length!==data.count)throw new Error('AI returned an unexpected number of drafts. Retry generation.');}
  await db.$transaction(async tx=>{const existing=await tx.contentPlan.findUnique({where:{id:job.id}});if(existing)return;await tx.contentPlan.create({data:{id:job.id,workspaceId:job.workspaceId,name:`${brand.name} ${data.month||'content'} plan`,objective:data.objective,content:{create:generated.items.map((item,index)=>({workspaceId:job.workspaceId,brandId:brand.id,topic:item.topic,category:item.category,objective:item.objective,audience:item.audience,graphicBrief:item.graphicBrief,posts:{create:{platform:data.platform||item.platform,caption:item.caption,timezone:brand.workspace.timezone,scheduledAt:data.month?localToUtc(`${data.month}-${String(1+Math.floor(index*new Date(Number(data.month.slice(0,4)),Number(data.month.slice(5)),0).getDate()/data.count)).padStart(2,'0')}T09:00`,brand.workspace.timezone):null}}}))}}});await tx.usageEvent.updateMany({where:{key:job.key},data:{status:'SETTLED'}});});
}
async function generateImage(jobId:string) {const job=await db.backgroundJob.findUniqueOrThrow({where:{id:jobId}});const data=job.payload as {brandId:string;prompt:string};const brand=await db.brand.findFirstOrThrow({where:{id:data.brandId,workspaceId:job.workspaceId},include:{workspace:true}});if(brand.workspace.mode==='demo')throw new Error('AI image generation requires live mode and provider credentials. Use a branded template in demo.');const image=await imageProvider.generate(data.prompt+' . Background illustration only. No product depictions, no text or logos.');const key=`${job.workspaceId}/${brand.id}/${job.id}.png`;await storage.put(key,image,'image/png');await db.$transaction(async tx=>{const existing=await tx.brandAsset.findUnique({where:{storageKey:key}});if(!existing){await reserve(tx,job.workspaceId,'storage',`storage:${job.id}`,image.length);await tx.brandAsset.create({data:{workspaceId:job.workspaceId,brandId:brand.id,fileName:'generated-background.png',mimeType:'image/png',fileSize:image.length,width:1024,height:1024,storageKey:key,source:'generated',prompt:data.prompt}});await tx.usageEvent.updateMany({where:{key:`storage:${job.id}`},data:{status:'SETTLED'}});}await tx.usageEvent.updateMany({where:{key:job.key},data:{status:'SETTLED'}});});}
// A durable cron drains the database outbox. Request handlers never need the queue to be online.
export const drain=inngest.createFunction({id:'drain-outbox',concurrency:{limit:1},retries:3},{cron:'* * * * *'},async({step})=>{
  const ids=await step.run('pending',async()=>{const jobs=await db.backgroundJob.findMany({where:{status:'PENDING'},take:20,select:{id:true}});const posts=await db.platformPost.findMany({where:{deliveryState:'SCHEDULED',scheduledAt:{lte:new Date()}},take:50,select:{id:true,deliveryKey:true}});return {jobs,posts};});
  for(const job of ids.jobs)await step.sendEvent(`job:${job.id}`,{name:'app/job',data:{id:job.id}});
  for(const post of ids.posts)await step.sendEvent(`post:${post.id}`,{name:'app/deliver',data:{id:post.id,key:post.deliveryKey}});
  return ids;
});
export const generate=inngest.createFunction({id:'generation',retries:3,concurrency:[{limit:4},{limit:1,key:'event.data.id'}],onFailure:async({event})=>{
  const id=String(event.data.event.data.id);await db.$transaction([db.backgroundJob.updateMany({where:{id,status:{not:'DONE'}},data:{status:'FAILED',error:'Generation failed after durable retries. Check provider setup and retry.'}}),db.usageEvent.updateMany({where:{key:{in:[`job:${id}`,`storage:${id}`]},status:'RESERVED'},data:{status:'RELEASED'}})]);
}},{event:'app/job'},async({event,step})=>{
  const id=String(event.data.id);
  const claimed=await step.run('claim',()=>db.backgroundJob.updateMany({where:{id,status:'PENDING'},data:{status:'RUNNING'}}));if(!claimed.count)return {skipped:true};
  try {await step.run('generate',async()=>{const job=await db.backgroundJob.findUniqueOrThrow({where:{id}});if(job.kind==='autopilot')await generateAutopilot(id);else if(job.kind==='image')await generateImage(id);else await generatePlan(id);});await step.run('done',()=>db.backgroundJob.update({where:{id},data:{status:'DONE',error:null}}));}
  catch(error){await db.backgroundJob.update({where:{id},data:{error:error instanceof Error?error.message:'Generation failed; durable retry pending.'}});throw error;}
});
export const publish=inngest.createFunction({id:'publish-post',retries:0,concurrency:{limit:1,key:'event.data.id'}},{event:'app/deliver'},async({event,step})=>step.run('deliver',()=>deliver(String(event.data.id),String(event.data.key))));
export const recoverStale=inngest.createFunction({id:'recover-interrupted-work',retries:1},{cron:'*/10 * * * *'},async({step})=>step.run('mark-stale',async()=>{
  // Never republish a process that may have reached the provider before the worker died.
  const cutoff=new Date(Date.now()-15*60*1000);await db.platformPost.updateMany({where:{deliveryState:'PROCESSING',updatedAt:{lt:cutoff}},data:{deliveryState:'RECONCILE',lastError:'Worker interrupted. Reconciliation required before retry.'}});
  await db.backgroundJob.updateMany({where:{status:'RUNNING',updatedAt:{lt:cutoff}},data:{status:'FAILED',error:'Worker interrupted. Retry this job.'}});return true;
}));
export const syncComments=inngest.createFunction({id:'sync-comments',retries:2},{cron:'*/5 * * * *'},async({step})=>step.run('sync',async()=>{
  if(appMode()==='demo')return {demo:true};const posts=await db.platformPost.findMany({where:{deliveryState:'PUBLISHED',account:{status:'CONNECTED',mode:'live',platform:'instagram'},providerPostId:{not:null}},include:{account:true},orderBy:{publishedAt:'desc'},take:30});let count=0;
  for(const post of posts){if(!post.account?.encryptedToken)continue;try{for(const c of await instagram.comments(post.providerPostId!,decrypt(post.account.encryptedToken))){await db.comment.upsert({where:{postId_providerCommentId:{postId:post.id,providerCommentId:c.id}},create:{workspaceId:post.workspaceId,postId:post.id,providerCommentId:c.id,author:c.username||'Instagram user',text:c.text,createdAt:new Date(c.timestamp)},update:{text:c.text}});count++;}}catch{await db.notification.create({data:{workspaceId:post.workspaceId,message:'Comment sync needs attention. Check Instagram connection and permissions.'}});}}return {count};
}));
export async function enqueue(workspaceId:string,kind:'plan'|'image',payload:Record<string,string|number>) {const id=randomUUID();return serial(async tx=>{await reserve(tx,workspaceId,kind==='image'?'image':'text',`job:${id}`);return tx.backgroundJob.create({data:{id,workspaceId,kind,key:`job:${id}`,payload}});});}
export const refreshCredentials=inngest.createFunction({id:'refresh-instagram-tokens',retries:2},{cron:'0 3 * * *'},async({step})=>step.run('refresh',async()=>{
  if(appMode()!=='live')return {demo:true};const accounts=await db.socialAccount.findMany({where:{platform:'instagram',mode:'live',status:'CONNECTED',tokenExpiresAt:{lt:new Date(Date.now()+14*86400000)},encryptedToken:{not:null}}});
  for(const account of accounts){try{if(account.tokenExpiresAt&&account.tokenExpiresAt<=new Date())throw new Error('Expired');const token=await refreshToken(decrypt(account.encryptedToken!));await db.socialAccount.update({where:{id:account.id},data:{encryptedToken:encrypt(token.access_token),tokenExpiresAt:new Date(Date.now()+token.expires_in*1000)}});}catch{await db.socialAccount.update({where:{id:account.id},data:{status:'RECONNECT_REQUIRED'}});await db.notification.create({data:{workspaceId:account.workspaceId,message:`Reconnect @${account.username}: automatic credential refresh failed.`}});}}return {checked:accounts.length};
}));

export const autopilotPlanner=inngest.createFunction({id:'autopilot-planner',retries:2,concurrency:{limit:1}},{cron:'*/10 * * * *'},async({step})=>step.run('queue-autopilot',()=>queueAutopilot()));
