import 'server-only';
import { serial } from './usage';
export async function clearGeneratedCalendar(workspaceId:string,brandId:string){
 return serial(async tx=>{
  const plans=await tx.contentItem.findMany({where:{workspaceId,brandId,planId:{not:null}},select:{planId:true}});const planIds=[...new Set(plans.flatMap(p=>p.planId?[p.planId]:[]))];
  const jobs=await tx.backgroundJob.findMany({where:{workspaceId,kind:'plan',status:{in:['PENDING','RUNNING']},payload:{path:['brandId'],equals:brandId}},select:{id:true,key:true}});
  await tx.backgroundJob.updateMany({where:{id:{in:jobs.map(j=>j.id)},workspaceId},data:{status:'CANCELLED',error:null}});
  await tx.usageEvent.updateMany({where:{key:{in:jobs.map(j=>j.key)},status:'RESERVED'},data:{status:'RELEASED'}});
  const deleted=await tx.platformPost.deleteMany({where:{workspaceId,contentItem:{brandId,planId:{not:null}},attempts:{none:{}},deliveryState:{in:['UNSCHEDULED','SCHEDULED','CANCELLED','FAILED']}}});
  await tx.contentItem.deleteMany({where:{workspaceId,brandId,planId:{in:planIds},posts:{none:{}}}});
  await tx.contentPlan.deleteMany({where:{workspaceId,id:{in:planIds},content:{none:{}}}});
  return {cleared:deleted.count,cancelledJobs:jobs.length};
 });
}
