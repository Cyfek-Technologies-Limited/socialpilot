import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({find:vi.fn(),consume:vi.fn(),brandAccess:vi.fn(),exchange:vi.fn(),identity:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:{oAuthState:{findUnique:mocks.find,deleteMany:mocks.consume}}}));
vi.mock('../src/lib/access',()=>({brandAccess:mocks.brandAccess}));
vi.mock('../src/lib/config',()=>({appMode:()=> 'live',appUrl:()=> 'https://socialpilot-amber.vercel.app'}));
vi.mock('../src/lib/crypto',()=>({encrypt:vi.fn()}));
vi.mock('../src/lib/usage',()=>({serial:vi.fn()}));
vi.mock('../src/lib/providers/linkedin',()=>({linkedInExchangeCode:mocks.exchange,linkedInIdentity:mocks.identity,linkedInCapabilities:{}}));
import { GET } from '../src/app/api/social/linkedin/callback/route';
const state='linkedin:personal:member:'+ 'a'.repeat(64);
const request=()=>new Request('https://socialpilot-amber.vercel.app/api/social/linkedin/callback?code=one-use&state='+state);
describe('LinkedIn callback isolation',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.find.mockResolvedValue({userId:'u1',workspaceId:'w1',brandId:'b1',expiresAt:new Date(Date.now()+60000)});mocks.brandAccess.mockResolvedValue({actor:{id:'u1'},workspace:{id:'w1',mode:'live'}});mocks.consume.mockResolvedValue({count:1});});
 it('rejects state from another provider before any database access',async()=>{const r=await GET(new Request('https://socialpilot-amber.vercel.app/api/social/linkedin/callback?state=instagram-state&code=one'));expect(r.headers.get('location')).toContain('linkedin-invalid-state');expect(mocks.find).not.toHaveBeenCalled();});
 it('rejects expired authorization attempts',async()=>{mocks.find.mockResolvedValue({expiresAt:new Date(0)});const r=await GET(request());expect(r.headers.get('location')).toContain('linkedin-expired-state');expect(mocks.exchange).not.toHaveBeenCalled();});
 it('cannot attach credentials to a different signed-in user',async()=>{mocks.brandAccess.mockResolvedValue({actor:{id:'other'},workspace:{mode:'live'}});const r=await GET(request());expect(r.headers.get('location')).toContain('linkedin-access-denied');expect(mocks.consume).not.toHaveBeenCalled();expect(mocks.exchange).not.toHaveBeenCalled();});
 it('rejects a replayed state before exchanging credentials',async()=>{mocks.consume.mockResolvedValue({count:0});const r=await GET(request());expect(r.headers.get('location')).toContain('linkedin-expired-state');expect(mocks.exchange).not.toHaveBeenCalled();});
 it('consumes cancelled authorization without exchanging a token',async()=>{const r=await GET(new Request(request().url+'&error=access_denied'));expect(r.headers.get('location')).toContain('linkedin-cancelled');expect(mocks.consume).toHaveBeenCalledTimes(1);expect(mocks.exchange).not.toHaveBeenCalled();});
});
