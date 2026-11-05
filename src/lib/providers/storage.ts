import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { required } from '../config';
export interface StorageProvider { put(key:string,data:Buffer,type:string):Promise<void>; url(key:string,seconds?:number):Promise<string>; remove(key:string):Promise<void>; }
function client(){return new S3Client({endpoint:required('S3_ENDPOINT'),region:required('S3_REGION'),forcePathStyle:true,credentials:{accessKeyId:required('S3_ACCESS_KEY_ID'),secretAccessKey:required('S3_SECRET_ACCESS_KEY')}});}
export const storage:StorageProvider={
  async put(key,data,type){await client().send(new PutObjectCommand({Bucket:required('S3_BUCKET'),Key:key,Body:data,ContentType:type}));},
  async url(key,seconds=900){return getSignedUrl(client(),new GetObjectCommand({Bucket:required('S3_BUCKET'),Key:key}),{expiresIn:seconds});},
  async remove(key){await client().send(new DeleteObjectCommand({Bucket:required('S3_BUCKET'),Key:key}));}
};
