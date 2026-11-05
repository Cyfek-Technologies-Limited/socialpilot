import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { brandAccess } from '@/lib/access';
import { appMode, appUrl } from '@/lib/config';
import { encrypt } from '@/lib/crypto';
import { exchangeCode, instagram } from '@/lib/providers/social';
import { serial } from '@/lib/usage';
export async function GET(request:Request){try{
  if(appMode()!=='live')throw new Error('Not live mode.');const url=new URL(request.url);const state=url.searchParams.get('state');const code=url.searchParams.get('code');if(!state||!code)throw new Error('Missing OAuth state or code.');
  const record=await db.oAuthState.findUnique({where:{id:state}});if(!record||record.expiresAt<new Date())throw new Error('Expired state.');const {actor,workspace}=await brandAccess(record.workspaceId,record.brandId,'manage');if(record.userId!==actor.id||workspace.mode!=='live')throw new Error('OAuth user mismatch.');
  const consumed=await db.oAuthState.deleteMany({where:{id:state,expiresAt:{gt:new Date()}}});if(consumed.count!==1)throw new Error('State already used.');
  const credentials=await exchangeCode(code);const profile=await instagram.profile(credentials.token);const encryptedToken=encrypt(credentials.token);
  await serial(async tx=>{const existing=await tx.socialAccount.findUnique({where:{workspaceId_platform_providerAccountId:{workspaceId:workspace.id,platform:'instagram',providerAccountId:profile.id}}});if(existing&&existing.brandId!==record.brandId)throw new Error('Account already belongs to another brand.');if(!existing&&await tx.socialAccount.count({where:{workspaceId:workspace.id,status:'CONNECTED'}})>=(workspace.limits as Record<string,number>).accounts)throw new Error('Connected accounts limit reached.');await tx.socialAccount.upsert({where:{workspaceId_platform_providerAccountId:{workspaceId:workspace.id,platform:'instagram',providerAccountId:profile.id}},create:{workspaceId:workspace.id,brandId:record.brandId,platform:'instagram',providerAccountId:profile.id,username:profile.username,encryptedToken,tokenExpiresAt:credentials.expiresAt,mode:'live',capabilities:instagram.capabilities},update:{encryptedToken,tokenExpiresAt:credentials.expiresAt,status:'CONNECTED',capabilities:instagram.capabilities}});await tx.auditLog.create({data:{workspaceId:workspace.id,actorId:actor.id,action:'instagram.connected',resourceId:profile.id}});});
  return NextResponse.redirect(new URL('/app/accounts?connected=1',appUrl()));
}catch{return NextResponse.redirect(new URL('/app/accounts?error=authorization-failed',appUrl()));}}
