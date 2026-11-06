// One-time conversion of the existing development workspace; never prints credentials.
require('dotenv').config();
const { PrismaClient }=require('@prisma/client');
const db=new PrismaClient({datasources:{db:{url:process.env.DIRECT_URL||process.env.DATABASE_URL}}});
async function main(){
 const workspaces=await db.workspace.findMany({select:{id:true,name:true,mode:true,paused:true}});
 if(!process.argv.includes('--apply')){console.log(JSON.stringify(workspaces));return;}
 const candidates=workspaces.filter(w=>w.mode==='demo');
 const workspace=candidates.length===1?candidates[0]:candidates.find(w=>/^cyfek technologies/i.test(w.name));
 if(!workspace)throw new Error('Cannot uniquely identify the requested development workspace.');
 await db.$transaction(async tx=>{
  const id=workspace.id;
  if(await tx.backgroundJob.count({where:{workspaceId:id,status:'RUNNING'}})||await tx.platformPost.count({where:{workspaceId:id,deliveryState:'PROCESSING'}}))throw new Error('Stop active workers before converting the workspace.');
  const jobs=await tx.backgroundJob.updateMany({where:{workspaceId:id,status:'PENDING'},data:{status:'CANCELLED',error:'Cancelled during demo-to-live conversion.'}});
  const posts=await tx.platformPost.updateMany({where:{workspaceId:id,deliveryState:'SCHEDULED'},data:{deliveryState:'CANCELLED',scheduledAt:null,lastError:'Demo schedule cancelled during live conversion.'}});
  const accounts=await tx.socialAccount.updateMany({where:{workspaceId:id,mode:'demo'},data:{status:'DISCONNECTED',autoPublishConsentAt:null,autoReplyConsentAt:null,encryptedToken:null}});
  await tx.usageEvent.updateMany({where:{workspaceId:id,status:'RESERVED'},data:{status:'RELEASED'}});
  await tx.oAuthState.deleteMany({where:{workspaceId:id}});
  await tx.workspace.update({where:{id},data:{mode:'live',paused:true}});
  await tx.auditLog.create({data:{workspaceId:id,actorId:'setup',action:'workspace.converted_to_live',resourceId:id}});
  console.log(JSON.stringify({workspace:workspace.name,mode:'live',publishingPaused:true,disabledDemoAccounts:accounts.count,cancelledSchedules:posts.count,cancelledJobs:jobs.count}));
 },{timeout:30000});
 const result=await db.workspace.findUniqueOrThrow({where:{id:workspace.id},select:{mode:true,paused:true}});
 if(result.mode!=='live'||!result.paused)throw new Error('Conversion verification failed.');
 console.log('Verified live mode with publishing paused.');
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;}).finally(()=>db.$disconnect());

