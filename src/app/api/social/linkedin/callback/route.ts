import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { brandAccess } from '@/lib/access';
import { appMode, appUrl } from '@/lib/config';
import { encrypt } from '@/lib/crypto';
import { serial } from '@/lib/usage';
import { linkedInExchangeCode, linkedInIdentity, linkedInCapabilities } from '@/lib/providers/linkedin';
export async function GET(request:Request){
 const fail=(code:string)=>NextResponse.redirect(new URL(`/app/accounts?error=${code}`,appUrl()));
 try{if(appMode()!=='live')return fail('linkedin-live-required');const url=new URL(request.url);const state=url.searchParams.get('state')||'';const match=/^linkedin:(personal|company):([A-Za-z0-9]+):[a-f0-9]{64}$/.exec(state);if(!match)return fail('linkedin-invalid-state');
 const record=await db.oAuthState.findUnique({where:{id:state}});if(!record||record.expiresAt<new Date())return fail('linkedin-expired-state');const {actor,workspace}=await brandAccess(record.workspaceId,record.brandId,'manage');if(record.userId!==actor.id||workspace.mode!=='live')return fail('linkedin-access-denied');
 const consumed=await db.oAuthState.deleteMany({where:{id:state,expiresAt:{gt:new Date()}}});if(consumed.count!==1)return fail('linkedin-expired-state');if(url.searchParams.has('error'))return fail('linkedin-cancelled');const code=url.searchParams.get('code');if(!code)return fail('linkedin-authorization-failed');
 const credentials=await linkedInExchangeCode(code);const kind=match[1] as 'personal'|'company';const identity=await linkedInIdentity(credentials.token,kind,kind==='company'?match[2]:undefined);const encryptedToken=encrypt(credentials.token);
 await serial(async tx=>{const key={workspaceId:workspace.id,platform:'linkedin',providerAccountId:identity.id};const existing=await tx.socialAccount.findUnique({where:{workspaceId_platform_providerAccountId:key}});if(existing&&existing.brandId!==record.brandId)throw new Error('Account belongs to another brand.');if(existing?.status!=='CONNECTED'&&await tx.socialAccount.count({where:{workspaceId:workspace.id,status:'CONNECTED'}})>=(workspace.limits as Record<string,number>).accounts)throw new Error('Account limit reached.');
 await tx.socialAccount.upsert({where:{workspaceId_platform_providerAccountId:key},create:{...key,brandId:record.brandId,username:identity.name,encryptedToken,tokenExpiresAt:credentials.expiresAt,mode:'live',capabilities:{...linkedInCapabilities,accountType:kind}},update:{username:identity.name,encryptedToken,tokenExpiresAt:credentials.expiresAt,status:'CONNECTED',autoPublishConsentAt:null,autoReplyConsentAt:null,capabilities:{...linkedInCapabilities,accountType:kind}}});await tx.auditLog.create({data:{workspaceId:workspace.id,actorId:actor.id,action:'linkedin.connected',resourceId:identity.id}});});
 return NextResponse.redirect(new URL('/app/accounts?connected=linkedin',appUrl()));
 }catch{return fail('linkedin-authorization-failed');}
}
