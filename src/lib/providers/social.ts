import 'server-only';
import { required } from '../config';
export type Capabilities={publishImage:boolean;comments:boolean;replies:boolean;metrics:boolean};
export interface SocialProvider {
  capabilities:Capabilities;
  profile(token:string):Promise<{id:string;username:string}>;
  container(accountId:string,token:string,imageUrl:string,caption:string):Promise<string>;
  containerStatus(id:string,token:string):Promise<string>;
  publish(accountId:string,token:string,containerId:string):Promise<string>;
  comments(postId:string,token:string):Promise<Array<{id:string;text:string;username?:string;timestamp:string}>>;
  reply(commentId:string,token:string,text:string):Promise<string>;
}
export class AmbiguousDelivery extends Error {}
export const unifiedLogin=()=>Boolean(process.env.INSTAGRAM_CONFIG_ID);
const root=()=>`https://${unifiedLogin()?'graph.facebook.com':'graph.instagram.com'}/${required('INSTAGRAM_API_VERSION')}`;
const callbackUrl=()=>new URL('/api/social/callback',required('APP_URL')).toString();
async function graph(path:string,token:string,params:Record<string,string>={},write=false) {
  const url=new URL(`${root()}/${path}`);if(!write)for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  let res:Response;
  try {res=await fetch(url,{method:write?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(write?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:write?new URLSearchParams(params):undefined,signal:AbortSignal.timeout(30000)});}catch{throw new AmbiguousDelivery('Provider timed out. Reconcile before retrying.');}
  if(!res.ok){if(res.status>=500&&write)throw new AmbiguousDelivery('Provider response is ambiguous. Reconcile before retrying.');throw new Error(`Instagram request failed (${res.status}). Check permissions, rate limits, and connection.`);}
  return res.json();
}
export const instagram:SocialProvider={
  capabilities:{publishImage:true,comments:true,replies:true,metrics:false},
  async profile(token){if(unifiedLogin()){const result=await graph('me/assigned_instagram_accounts',token,{fields:'id,username',limit:'2'});if(result.paging?.next||result.data?.length>1)throw new Error('multiple-instagram-accounts');const account=result.data?.[0];if(!account?.id||!account?.username)throw new Error('no-instagram-account');return {id:account.id as string,username:account.username as string};}const p=await graph('me',token,{fields:'user_id,username'});if(!p.user_id||!p.username)throw new Error('Instagram did not confirm a professional account.');return {id:p.user_id,username:p.username};},
  async container(id,token,imageUrl,caption){return (await graph(`${id}/media`,token,{image_url:imageUrl,caption},true)).id;},
  async containerStatus(id,token){return (await graph(id,token,{fields:'status_code'})).status_code;},
  async publish(id,token,container){return (await graph(`${id}/media_publish`,token,{creation_id:container},true)).id;},
  async comments(id,token){const body=await graph(`${id}/comments`,token,{fields:'id,text,username,timestamp',limit:'50'});return body.data||[];},
  async reply(id,token,text){return (await graph(`${id}/replies`,token,{message:text},true)).id;}
};
export function authorizationUrl(state:string) {if(unifiedLogin()){const url=new URL('https://www.facebook.com/dialog/oauth');url.search=new URLSearchParams({client_id:required('INSTAGRAM_CLIENT_ID'),config_id:required('INSTAGRAM_CONFIG_ID'),display:'popup',override_default_response_type:'true',redirect_uri:callbackUrl(),response_type:'code',state,prompt:'login'}).toString();return url.toString();}const url=new URL('https://www.instagram.com/oauth/authorize');url.search=new URLSearchParams({client_id:required('INSTAGRAM_CLIENT_ID'),redirect_uri:`${required('APP_URL')}/api/social/callback`,response_type:'code',scope:'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments',state}).toString();return url.toString();}
export async function exchangeCode(code:string) {
  if(unifiedLogin()){const url=new URL(`${root()}/oauth/access_token`);url.search=new URLSearchParams({client_id:required('INSTAGRAM_CLIENT_ID'),client_secret:required('INSTAGRAM_CLIENT_SECRET'),redirect_uri:callbackUrl(),code}).toString();const response=await fetch(url,{signal:AbortSignal.timeout(30000),cache:'no-store'});if(!response.ok)throw new Error('Instagram authorization failed.');const value=await response.json();if(typeof value.access_token!=='string'||!value.access_token)throw new Error('Instagram authorization failed.');return {token:value.access_token,expiresAt:typeof value.expires_in==='number'&&value.expires_in>0?new Date(Date.now()+value.expires_in*1000):null};}

  const response=await fetch('https://api.instagram.com/oauth/access_token',{method:'POST',body:new URLSearchParams({client_id:required('INSTAGRAM_CLIENT_ID'),client_secret:required('INSTAGRAM_CLIENT_SECRET'),grant_type:'authorization_code',redirect_uri:`${required('APP_URL')}/api/social/callback`,code}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Instagram authorization failed.');const short=await response.json();
  const url=new URL('https://graph.instagram.com/access_token');url.search=new URLSearchParams({grant_type:'ig_exchange_token',client_secret:required('INSTAGRAM_CLIENT_SECRET'),access_token:short.access_token}).toString();
  const long=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!long.ok)throw new Error('Instagram long-lived token exchange failed.');const value=await long.json();return {token:value.access_token as string,expiresAt:new Date(Date.now()+value.expires_in*1000)};
}
export async function refreshToken(token:string) {if(unifiedLogin())throw new Error('Reconnect Instagram to renew this credential.');const url=new URL('https://graph.instagram.com/refresh_access_token');url.search=new URLSearchParams({grant_type:'ig_refresh_token',access_token:token}).toString();const res=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!res.ok)throw new Error('Instagram token refresh failed. Reconnect your account.');return res.json() as Promise<{access_token:string;expires_in:number}>;}
