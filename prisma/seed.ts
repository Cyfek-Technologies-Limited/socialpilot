import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
async function main(){
 if(process.env.APP_MODE!=='demo')throw new Error('Seed is restricted to APP_MODE=demo.');
 const email=process.env.SEED_USER_EMAIL;if(!email)throw new Error('Register first, then set SEED_USER_EMAIL to your demo login email.');const user=await db.user.findUnique({where:{email}});if(!user)throw new Error('Register the demo user before running the seed.');
 const existing=await db.workspaceMember.findFirst({where:{userId:user.id,workspace:{name:'Olive & Oak · Demo'}}});if(existing){console.log('Demo seed already exists. No data was changed.');return;}
 await db.$transaction(async tx=>{
  const workspace=await tx.workspace.create({data:{name:'Olive & Oak · Demo',mode:'demo',timezone:'Africa/Lagos',onboardingStep:7,members:{create:{userId:user.id,role:'OWNER'}}}});
  const brand=await tx.brand.create({data:{workspaceId:workspace.id,name:'Olive & Oak',description:'A fictional lifestyle brand used to demonstrate content planning. All brand information is sample content.',niche:'Home & lifestyle',audience:'People who enjoy thoughtful everyday routines',tone:'Warm and helpful',goal:'community growth',cta:'Share your favourite everyday ritual.',colors:['#6b806a','#edf2e9'],preferences:{postsPerWeek:3,postingTime:'09:00',postingDays:['Mon','Wed','Fri']},knowledge:{create:[{kind:'hours',question:'Sample business hours',answer:'[DEMO FACT] Monday–Friday, 9am–5pm, Africa/Lagos.'},{kind:'faq',question:'Is this a real business?',answer:'No. Olive & Oak is a fictional brand for demonstration.'}]},automation:{create:{}}}});
  await tx.socialAccount.create({data:{workspaceId:workspace.id,brandId:brand.id,platform:'instagram',providerAccountId:`demo_${brand.id}`,username:'oliveandoak_demo',mode:'demo',capabilities:{publishImage:true,comments:true,replies:true,metrics:false}}});
  for(const [i,topic] of ['Small rituals, better mornings','Made with care, shared with you','Good things grow together'].entries())await tx.contentItem.create({data:{workspaceId:workspace.id,brandId:brand.id,topic,category:['educational','informational','community'][i],posts:{create:{caption:`[DEMO DRAFT] ${topic}. What’s one small detail that makes your day better?`,timezone:'Africa/Lagos'}}}});
  await tx.auditLog.create({data:{workspaceId:workspace.id,actorId:user.id,action:'demo.workspace.seeded'}});
 });console.log('Demo workspace added. Existing data was preserved.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
