import { NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { access, brandAccess, checkOrigin } from '@/lib/access';
import { db } from '@/lib/db';
import { storage } from '@/lib/providers/storage';
import { renderTemplate, templateNames } from '@/lib/templates';
import { serial,reserve,throttle } from '@/lib/usage';
export async function GET(request:Request){try{const url=new URL(request.url);const workspaceId=url.searchParams.get('workspace')||'';await access(workspaceId);const asset=await db.brandAsset.findFirst({where:{id:url.searchParams.get('id')||'',workspaceId}});if(!asset)return new Response('Not found',{status:404});return NextResponse.redirect(await storage.url(asset.storageKey));}catch{return new Response('Media unavailable. Check storage configuration and access.',{status:400});}}
export async function POST(request:Request){try{
  checkOrigin(request);const length=Number(request.headers.get('content-length')||0);if(length>11*1024*1024)return new Response('Upload must be under 10 MB',{status:413});
  let workspaceId:string,brandId:string,fileName:string,source:string,buffer:Buffer,prompt:string|undefined;
  if(request.headers.get('content-type')?.includes('multipart/form-data')){
    const form=await request.formData();workspaceId=String(form.get('workspaceId'));brandId=String(form.get('brandId'));await brandAccess(workspaceId,brandId);await throttle(workspaceId,'media');
    const file=form.get('file');if(!(file instanceof File)||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choose a PNG, JPEG or WebP under 10 MB.');
    const original=Buffer.from(await file.arrayBuffer());const info=await sharp(original,{limitInputPixels:25000000}).metadata();if(!['png','jpeg','webp'].includes(info.format||''))throw new Error('Unsupported image format.');
    buffer=await sharp(original,{limitInputPixels:25000000}).rotate().png().toBuffer();fileName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100)+'.png';source='uploaded';
  }else{
    const data=z.object({workspaceId:z.string(),brandId:z.string(),title:z.string().min(1).max(100),body:z.string().max(280),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),template:z.enum(templateNames)}).parse(await request.json());workspaceId=data.workspaceId;brandId=data.brandId;const {brand}=await brandAccess(workspaceId,brandId);if(data.template==='Offer'&&!await db.brandKnowledgeEntry.findFirst({where:{workspaceId,brandId,kind:'offer',verified:true,OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}}))throw new Error('Add an active verified offer before rendering an offer graphic.');buffer=await renderTemplate({...data,brand:brand.name});fileName=data.template.toLowerCase().replaceAll(' ','-')+'.png';source='rendered';
  }
  const key=`${workspaceId}/${brandId}/${randomUUID()}.png`;const usageKey=`storage:${key}`;
  await serial(tx=>reserve(tx,workspaceId,'storage',usageKey,buffer.length));
  try{await storage.put(key,buffer,'image/png');const info=await sharp(buffer).metadata();const asset=await db.$transaction(async tx=>{const asset=await tx.brandAsset.create({data:{workspaceId,brandId,fileName,mimeType:'image/png',fileSize:buffer.length,width:info.width,height:info.height,storageKey:key,source,prompt}});await tx.usageEvent.update({where:{key:usageKey},data:{status:'SETTLED'}});return asset;});return NextResponse.json({id:asset.id});}
  catch(error){await db.usageEvent.update({where:{key:usageKey},data:{status:'RELEASED'}});throw error;}
}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Media operation failed.'},{status:400});}}
export async function DELETE(request:Request){try{checkOrigin(request);const body=z.object({workspaceId:z.string(),id:z.string(),confirmed:z.literal(true)}).parse(await request.json());await access(body.workspaceId,'edit');const asset=await db.brandAsset.findFirst({where:{id:body.id,workspaceId:body.workspaceId},include:{_count:{select:{posts:true}}}});if(!asset)throw new Error('Media not found.');if(asset._count.posts)throw new Error('Cannot delete media attached to a post.');await storage.remove(asset.storageKey);await db.brandAsset.delete({where:{id:asset.id}});return NextResponse.json({ok:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Delete failed.'},{status:400});}}
