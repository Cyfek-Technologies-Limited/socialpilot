import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { brandAccess, HttpError } from '@/lib/access';
import { db } from '@/lib/db';
import { appMode } from '@/lib/config';
import { linkedInAuthorizationUrl } from '@/lib/providers/linkedin';
export async function GET(request:Request){
 const fail=(code:string)=>NextResponse.redirect(new URL(`/app/accounts?error=${code}`,request.url));
 try{if(appMode()!=='live')return fail('linkedin-live-required');const url=new URL(request.url);const workspaceId=url.searchParams.get('workspace')||'';const brandId=url.searchParams.get('brand')||'';const kind=url.searchParams.get('kind');const organizationId=url.searchParams.get('organization')||'';
 if(!workspaceId||!brandId)return fail('brand-required');if(kind!=='personal'&&kind!=='company')return fail('linkedin-invalid-kind');if(kind==='company'&&!/^\d{1,30}$/.test(organizationId))return fail('linkedin-company-id-required');
 const {actor,workspace}=await brandAccess(workspaceId,brandId,'manage');if(workspace.mode!=='live')return fail('linkedin-live-required');const state=`linkedin:${kind}:${kind==='company'?organizationId:'member'}:${randomBytes(32).toString('hex')}`;const target=linkedInAuthorizationUrl(state,kind);
 await db.oAuthState.create({data:{id:state,workspaceId,brandId,userId:actor.id,expiresAt:new Date(Date.now()+10*60*1000)}});return NextResponse.redirect(target);
 }catch(error){return fail(error instanceof HttpError?'linkedin-access-denied':'linkedin-setup-required');}
}
