import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { brandAccess } from '@/lib/access';
import { db } from '@/lib/db';
import { appMode } from '@/lib/config';
import { authorizationUrl } from '@/lib/providers/social';
export async function GET(request:Request){try{if(appMode()!=='live')throw new Error('Use the labelled demo connector in demo mode.');const url=new URL(request.url);const workspaceId=url.searchParams.get('workspace')||'';const brandId=url.searchParams.get('brand')||'';if(!workspaceId||!brandId)return NextResponse.redirect(new URL('/app/accounts?error=brand-required',request.url));const {actor,workspace}=await brandAccess(workspaceId,brandId,'manage');if(workspace.mode!=='live')throw new Error('A live workspace is required.');const state=randomBytes(32).toString('hex');const redirect=authorizationUrl(state);await db.oAuthState.create({data:{id:state,workspaceId,brandId,userId:actor.id,expiresAt:new Date(Date.now()+10*60*1000)}});return NextResponse.redirect(redirect);}catch{return NextResponse.redirect(new URL('/app/accounts?error=instagram-setup-required',request.url));}}
