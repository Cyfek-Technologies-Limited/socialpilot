import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { required } from './config';
function key() {const key=Buffer.from(required('TOKEN_ENCRYPTION_KEY'),'base64');if(key.length!==32)throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64.');return key;}
export function encrypt(value:string) {const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key(),iv);const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),ciphertext].map(x=>x.toString('base64')).join('.');}
export function decrypt(value:string) {const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64'));const decipher=createDecipheriv('aes-256-gcm',key(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');}
