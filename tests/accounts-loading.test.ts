import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({members:vi.fn(),brands:vi.fn(),accounts:vi.fn(),user:vi.fn(),access:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:{workspaceMember:{findMany:mocks.members},brand:{findMany:mocks.brands},socialAccount:{findMany:mocks.accounts}}}));
vi.mock('../src/lib/access',()=>({user:mocks.user,access:mocks.access,brandAccess:vi.fn(),checkOrigin:vi.fn(),HttpError:class extends Error{constructor(public status:number,message:string){super(message)}}}));
vi.mock('../src/lib/config',()=>({appMode:()=> 'live'}));
vi.mock('../src/lib/jobs',()=>({enqueue:vi.fn()}));
vi.mock('../src/lib/usage',()=>({serial:vi.fn(),reserve:vi.fn(),throttle:vi.fn()}));
vi.mock('../src/lib/providers/ai',()=>({textProvider:{}}));
vi.mock('../src/lib/providers/social',()=>({instagram:{}}));
vi.mock('../src/lib/crypto',()=>({decrypt:vi.fn()}));
import { GET } from '../src/app/api/app/route';
describe('Social Accounts loading',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue({id:'user-1'});mocks.members.mockResolvedValue([{workspaceId:'workspace-1',role:'OWNER',workspace:{id:'workspace-1',name:'Brand',mode:'live',onboardingStep:7}}]);mocks.brands.mockResolvedValue([]);mocks.accounts.mockResolvedValue([]);});
 it('loads account data without querying unrelated dashboard datasets or repeating authorization',async()=>{const response=await GET(new Request('http://localhost/api/app?section=accounts'));expect(response.status).toBe(200);expect((await response.json()).workspace.id).toBe('workspace-1');expect(mocks.user).toHaveBeenCalledTimes(1);expect(mocks.members).toHaveBeenCalledTimes(1);expect(mocks.access).not.toHaveBeenCalled();expect(mocks.accounts).toHaveBeenCalledTimes(1);});
 it('rejects a workspace outside the signed-in user memberships before loading data',async()=>{const response=await GET(new Request('http://localhost/api/app?section=accounts&workspace=other-tenant'));expect(response.status).toBe(403);expect(mocks.accounts).not.toHaveBeenCalled();expect(mocks.brands).not.toHaveBeenCalled();});
});
