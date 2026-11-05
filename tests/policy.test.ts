import { describe,it,expect } from 'vitest';
import { can,assertTenant,localToUtc,usableFacts,publishGuard,sensitiveComment } from '../src/lib/policy';
describe('tenant and role policy',()=>{
 it('rejects cross-workspace resources',()=>{expect(()=>assertTenant('tenant-b','tenant-a')).toThrow('not found');});
 it('enforces least privilege',()=>{expect(can('VIEWER','read')).toBe(true);expect(can('VIEWER','edit')).toBe(false);expect(can('EDITOR','approve')).toBe(false);expect(can('ADMIN','approve')).toBe(true);expect(can('ADMIN','owner')).toBe(false);expect(can('OWNER','owner')).toBe(true);});
});
describe('timezones',()=>{
 it('converts Lagos local time to UTC',()=>expect(localToUtc('2026-11-10T09:00','Africa/Lagos').toISOString()).toBe('2026-11-10T08:00:00.000Z'));
 it('applies winter and summer offsets',()=>{expect(localToUtc('2026-01-10T09:00','America/New_York').toISOString()).toContain('14:00');expect(localToUtc('2026-07-10T09:00','America/New_York').toISOString()).toContain('13:00');});
 it('rejects missing and duplicated DST times',()=>{expect(()=>localToUtc('2026-03-08T02:30','America/New_York')).toThrow();expect(()=>localToUtc('2026-11-01T01:30','America/New_York')).toThrow();});
});
describe('publishing policy',()=>{
 const valid={approvalState:'APPROVED',version:2,approvedVersion:2,workspacePaused:false,brandPaused:false,accountStatus:'CONNECTED',mode:'live',accountMode:'live',hasConsent:true};
 it('allows only an approved authorized revision',()=>{expect(()=>publishGuard(valid)).not.toThrow();expect(()=>publishGuard({...valid,approvedVersion:1})).toThrow('approval');expect(()=>publishGuard({...valid,approvalState:'DRAFT'})).toThrow('approval');});
 it('blocks workspace or brand pause',()=>{expect(()=>publishGuard({...valid,workspacePaused:true})).toThrow('paused');expect(()=>publishGuard({...valid,brandPaused:true})).toThrow('paused');});
 it('blocks revoked consent, disconnected accounts, and mixed modes',()=>{expect(()=>publishGuard({...valid,hasConsent:false})).toThrow('authorization');expect(()=>publishGuard({...valid,accountStatus:'DISCONNECTED'})).toThrow('Reconnect');expect(()=>publishGuard({...valid,accountMode:'demo'})).toThrow('mixed');});
 it('excludes expired and unverified facts',()=>{const facts=[{verified:true,expiresAt:null},{verified:true,expiresAt:new Date('2026-10-01')},{verified:false,expiresAt:null},{verified:true,expiresAt:new Date('2026-12-01')}];expect(usableFacts(facts,new Date('2026-11-05'))).toEqual([facts[0],facts[3]]);});
 it('escalates refunds and sensitive information',()=>{expect(sensitiveComment('I need a refund')).toBe(true);expect(sensitiveComment('Here is my credit card')).toBe(true);expect(sensitiveComment('What are your hours?')).toBe(false);});
});
