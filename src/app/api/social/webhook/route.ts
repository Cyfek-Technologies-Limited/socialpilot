import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { required, appMode } from '@/lib/config';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
export async function GET(request:Request){const url=new URL(request.url);if(url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===required('INSTAGRAM_WEBHOOK_VERIFY_TOKEN'))return new Response(url.searchParams.get('hub.challenge'));return new Response('Forbidden',{status:403});}
export async function POST(request:Request){
  if(appMode()!=='live')return new Response('Disabled in demo',{status:403});const bytes=Buffer.from(await request.arrayBuffer());if(bytes.length>1024*1024)return new Response('Too large',{status:413});
  const signature=request.headers.get('x-hub-signature-256')||'';const expected='sha256='+createHmac('sha256',required('INSTAGRAM_CLIENT_SECRET')).update(bytes).digest('hex');const supplied=Buffer.from(signature);const wanted=Buffer.from(expected);if(supplied.length!==wanted.length||!timingSafeEqual(supplied,wanted))return new Response('Invalid signature',{status:401});
  const body=JSON.parse(bytes.toString('utf8'));const eventId=createHash('sha256').update(bytes).digest('hex');
  try{await db.$transaction(async tx=>{await tx.webhookEvent.create({data:{id:eventId}});for(const entry of body.entry||[]){for(const change of entry.changes||[]){if(change.field!=='comments')continue;const value=change.value;if(!value?.id||!value?.media?.id||typeof value.text!=='string')continue;const posts=await tx.platformPost.findMany({where:{providerPostId:String(value.media.id),account:{providerAccountId:String(entry.id),mode:'live'}}});for(const post of posts)await tx.comment.upsert({where:{postId_providerCommentId:{postId:post.id,providerCommentId:String(value.id)}},create:{workspaceId:post.workspaceId,postId:post.id,providerCommentId:String(value.id),text:value.text.slice(0,5000),author:value.from?.username||'Instagram user'},update:{text:value.text.slice(0,5000)}});}}});}
  catch(error){if(!(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'))return new Response('Retry later',{status:503});}
  return NextResponse.json({received:true});
}
