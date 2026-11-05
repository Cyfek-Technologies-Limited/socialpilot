import 'server-only';
import { headers } from 'next/headers';
import { db } from './db';
import { getAuth } from './auth';
import { can, permissions } from './policy';
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export async function user() { const session=await getAuth().api.getSession({headers:await headers()}); if(!session) throw new HttpError(401,'Sign in to continue.'); return session.user; }
export async function access(workspaceId:string,action:keyof typeof permissions='read') {
  const actor=await user(); const member=await db.workspaceMember.findUnique({where:{workspaceId_userId:{workspaceId,userId:actor.id}},include:{workspace:true}});
  if(!member||!can(member.role,action)) throw new HttpError(403,'You do not have permission for this workspace action.');
  return {actor,member,workspace:member.workspace};
}
export async function brandAccess(workspaceId:string,brandId:string,action:keyof typeof permissions='edit') {const context=await access(workspaceId,action);const brand=await db.brand.findFirst({where:{id:brandId,workspaceId}});if(!brand)throw new HttpError(404,'Brand not found.');return {...context,brand};}
export function checkOrigin(request:Request) { if(request.headers.get('origin')!==new URL(process.env.APP_URL||request.url).origin) throw new HttpError(403,'Invalid request origin.'); }
