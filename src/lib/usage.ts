import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from './db';
export async function serial<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
  for(let i=0;;i++) {try{return await db.$transaction(fn,{isolationLevel:'Serializable',timeout:15000});}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2034'&&i<3)continue;throw error;}}
}
export async function reserve(tx:Prisma.TransactionClient,workspaceId:string,kind:string,key:string,units=1) {
  const existing=await tx.usageEvent.findUnique({where:{key}}); if(existing) return existing;
  const workspace=await tx.workspace.findUniqueOrThrow({where:{id:workspaceId}});
  const limits=workspace.limits as Record<string,number>;const now=new Date();const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const total=await tx.usageEvent.aggregate({where:{workspaceId,kind,status:{in:kind==='storage'?['RESERVED']:['RESERVED','SETTLED']},...(kind==='storage'?{}:{createdAt:{gte:start}})},_sum:{units:true}});
  const stored=kind==='storage'?(await tx.brandAsset.aggregate({where:{workspaceId},_sum:{fileSize:true}}))._sum.fileSize||0:0;
  if(stored+(total._sum.units||0)+units>(limits[kind]??0))throw new Error(`Workspace ${kind} limit reached. Review Usage or contact your owner.`);
  return tx.usageEvent.create({data:{workspaceId,kind,key,units}});
}
export async function throttle(workspaceId:string,scope:string,limit=10) {
  await serial(async tx=>{const key=`expense:${workspaceId}:${scope}`;const now=Date.now();const row=await tx.rateLimit.findUnique({where:{key}});
    if(!row){await tx.rateLimit.create({data:{key,count:1,lastRequest:BigInt(now)}});return;}
    if(now-Number(row.lastRequest)>60000){await tx.rateLimit.update({where:{key},data:{count:1,lastRequest:BigInt(now)}});return;}
    if(row.count>=limit)throw new Error('Rate limit reached. Wait a minute before retrying.');await tx.rateLimit.update({where:{key},data:{count:{increment:1}}});
  });
}
