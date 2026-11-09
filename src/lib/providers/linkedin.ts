import 'server-only';
import { required } from '../config';
import { AmbiguousDelivery } from './social';
export type LinkedInKind='personal'|'company';
const callback=()=>new URL('/api/social/linkedin/callback',required('APP_URL')).toString();
const version=()=>process.env.LINKEDIN_API_VERSION||'202610';
export const linkedInCapabilities={publishImage:true,comments:false,replies:false,metrics:false};
export function linkedInAuthorizationUrl(state:string,kind:LinkedInKind){
 const url=new URL('https://www.linkedin.com/oauth/v2/authorization');
 url.search=new URLSearchParams({response_type:'code',client_id:required('LINKEDIN_CLIENT_ID'),redirect_uri:callback(),state,scope:kind==='company'?'openid profile w_organization_social r_organization_admin':'openid profile w_member_social'}).toString();return url.toString();
}
export async function linkedInExchangeCode(code:string){
 const response=await fetch('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',code,client_id:required('LINKEDIN_CLIENT_ID'),client_secret:required('LINKEDIN_CLIENT_SECRET'),redirect_uri:callback()}),signal:AbortSignal.timeout(30000),cache:'no-store'});
 if(!response.ok)throw new Error('LinkedIn token exchange failed.');const value=await response.json();if(typeof value.access_token!=='string'||!Number.isFinite(value.expires_in)||value.expires_in<=0)throw new Error('Invalid LinkedIn credential.');return {token:value.access_token as string,expiresAt:new Date(Date.now()+value.expires_in*1000)};
}
function apiHeaders(token:string){return {Authorization:`Bearer ${token}`,'LinkedIn-Version':version(),'X-Restli-Protocol-Version':'2.0.0','Content-Type':'application/json'};}
async function get(path:string,token:string){const response=await fetch(`https://api.linkedin.com/${path}`,{headers:apiHeaders(token),cache:'no-store',signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('LinkedIn access failed. Check granted products, permissions and page administrator access.');return response.json();}
export async function linkedInIdentity(token:string,kind:LinkedInKind,organizationId?:string){
 if(kind==='personal'){const profile=await get('v2/userinfo',token);if(typeof profile.sub!=='string'||!profile.sub)throw new Error('LinkedIn profile unavailable.');return {id:`urn:li:person:${profile.sub}`,name:String(profile.name||'LinkedIn member')};}
 if(!organizationId||!/^\d+$/.test(organizationId))throw new Error('Invalid LinkedIn company page ID.');const urn=`urn:li:organization:${organizationId}`;
 let approved=false;
 for(let start=0;start<1000;start+=100){const data=await get(`rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&start=${start}&count=100`,token);const entries=data.elements||[];approved=entries.some((entry:{organization:string;role:string;state:string})=>entry.organization===urn&&entry.role==='ADMINISTRATOR'&&entry.state==='APPROVED');if(approved||entries.length<100)break;}
 if(!approved)throw new Error('LinkedIn company administrator access is required.');const organization=await get(`rest/organizations/${organizationId}`,token);return {id:urn,name:String(organization.localizedName||`Company ${organizationId}`)};
}
export async function linkedInUploadImage(author:string,token:string,bytes:Uint8Array){
 const initialized=await fetch('https://api.linkedin.com/rest/images?action=initializeUpload',{method:'POST',headers:apiHeaders(token),body:JSON.stringify({initializeUploadRequest:{owner:author}}),signal:AbortSignal.timeout(30000)});if(!initialized.ok)throw new Error('LinkedIn image initialization failed.');const {value}=await initialized.json();
 const upload=new URL(value.uploadUrl);if(upload.protocol!=='https:'||!(upload.hostname==='linkedin.com'||upload.hostname.endsWith('.linkedin.com')))throw new Error('Invalid LinkedIn upload destination.');if(typeof value.image!=='string'||!value.image.startsWith('urn:li:image:'))throw new Error('Invalid LinkedIn image reference.');
 const response=await fetch(upload,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/octet-stream'},body:new Blob([Uint8Array.from(bytes)]),redirect:'error',signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error('LinkedIn image upload failed.');return value.image as string;
}
export async function linkedInPublish(author:string,token:string,caption:string,image?:string){
 if(!/^urn:li:(person|organization):[A-Za-z0-9_-]+$/.test(author))throw new Error('Invalid LinkedIn author.');
 let response:Response;try{response=await fetch('https://api.linkedin.com/rest/posts',{method:'POST',headers:apiHeaders(token),body:JSON.stringify({author,commentary:caption,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false,...(image?{content:{media:{id:image}}}:{})}),signal:AbortSignal.timeout(30000)});}catch{throw new AmbiguousDelivery('LinkedIn publishing timed out. Check LinkedIn before retrying.');}
 if(response.status>=500)throw new AmbiguousDelivery('LinkedIn publishing response is ambiguous. Check LinkedIn before retrying.');if(!response.ok)throw new Error(`LinkedIn publishing failed (${response.status}). Check permissions and media readiness.`);const id=response.headers.get('x-restli-id');if(!id)throw new AmbiguousDelivery('LinkedIn returned no post ID. Check LinkedIn before retrying.');return id;
}
