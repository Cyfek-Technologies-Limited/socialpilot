import { Temporal } from '@js-temporal/polyfill';
export const permissions = {
  read:['OWNER','ADMIN','EDITOR','VIEWER'], edit:['OWNER','ADMIN','EDITOR'], approve:['OWNER','ADMIN'], manage:['OWNER','ADMIN'], owner:['OWNER']
} as const;
export function can(role:string,action:keyof typeof permissions) { return (permissions[action] as readonly string[]).includes(role); }
export function assertTenant(resourceWorkspace:string,workspace:string) { if(resourceWorkspace!==workspace) throw new Error('Resource not found.'); }
export function localToUtc(local:string,timezone:string) {
  // Reject nonexistent and ambiguous local times. The user must choose an unambiguous slot.
  return new Date(Temporal.PlainDateTime.from(local).toZonedDateTime(timezone,{disambiguation:'reject'}).epochMilliseconds);
}
export function usableFacts<T extends {verified:boolean;expiresAt:Date|null}>(facts:T[],now=new Date()) { return facts.filter(f=>f.verified&&(!f.expiresAt||f.expiresAt>now)); }
export function publishGuard(input:{approvalState:string;version:number;approvedVersion?:number;workspacePaused:boolean;brandPaused:boolean;accountStatus:string;mode:string;accountMode:string;hasConsent:boolean}) {
  if(input.workspacePaused||input.brandPaused) throw new Error('Automation is paused.');
  if(input.approvalState!=='APPROVED'||input.approvedVersion!==input.version) throw new Error('This version needs approval.');
  if(input.accountStatus!=='CONNECTED') throw new Error('Reconnect the social account.');
  if(input.mode!==input.accountMode) throw new Error('Demo and live accounts cannot be mixed.');
  if(!input.hasConsent) throw new Error('Explicit publishing authorization is required.');
}
export function claimable(state:string) { return state==='SCHEDULED'; }
export function sensitiveComment(text:string) {return /refund|complaint|dispute|lawsuit|medical|credit card|password|bank account|angry|scam|guarantee/i.test(text);}
