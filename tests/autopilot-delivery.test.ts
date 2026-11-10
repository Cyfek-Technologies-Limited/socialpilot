import { beforeEach,describe,it,expect,vi } from 'vitest';
const mocks=vi.hoisted(()=>({claim:vi.fn(),find:vi.fn(),update:vi.fn(),publish:vi.fn(),source:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:{platformPost:{updateMany:mocks.claim,findUniqueOrThrow:mocks.find,update:mocks.update},backgroundJob:{findUniqueOrThrow:mocks.source},publishAttempt:{create:async()=>({id:'attempt'}),update:async()=>({})},usageEvent:{create:async()=>({})},auditLog:{create:async()=>({})},$transaction:async(values:Promise<unknown>[])=>Promise.all(values)}}));
vi.mock('../src/lib/config',()=>({appMode:()=> 'live'}));
vi.mock('../src/lib/crypto',()=>({decrypt:()=> 'token',encrypt:()=> 'encrypted'}));
vi.mock('../src/lib/providers/linkedin',()=>({linkedInPublish:mocks.publish,linkedInUploadImage:vi.fn()}));
import { deliver } from '../src/lib/jobs';
const config={enabled:true,accountId:'account',days:[1,3,5],time:'09:00',timezone:'Africa/Lagos',authorizedBy:'owner',enabledAt:'2026-11-09T00:00:00Z'};
function post(){return {id:'autopilot-test',workspaceId:'workspace',platform:'linkedin',version:1,approvalState:'APPROVED',caption:'Automatic caption',hashtags:'',providerContainerId:null,media:null,approvals:[{version:1}],account:{id:'account',platform:'linkedin',providerAccountId:'urn:li:person:owner',encryptedToken:'encrypted',tokenExpiresAt:null,status:'CONNECTED',mode:'live',autoPublishConsentAt:new Date()},contentItem:{brand:{paused:false,preferences:{autopilot:config},workspace:{mode:'live',paused:false}}}};}
describe('automatic LinkedIn delivery',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.claim.mockResolvedValue({count:1});mocks.find.mockResolvedValue(post());mocks.source.mockResolvedValue({payload:{enabledAt:config.enabledAt,accountId:'account'}});mocks.update.mockResolvedValue({});mocks.publish.mockResolvedValue('urn:li:share:confirmed');});
 it('publishes an authorized autopilot post and records confirmed delivery',async()=>{expect(await deliver('autopilot-test','slot')).toEqual({providerPostId:'urn:li:share:confirmed'});expect(mocks.publish).toHaveBeenCalledWith('urn:li:person:owner','token','Automatic caption',undefined);expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({deliveryState:'PUBLISHED',providerPostId:'urn:li:share:confirmed'})}));});
 it('never sends the same claimed slot twice',async()=>{mocks.claim.mockResolvedValue({count:0});expect(await deliver('autopilot-test','slot')).toEqual({skipped:true});expect(mocks.publish).not.toHaveBeenCalled();});
 it('does not publish after autopilot authorization is revoked',async()=>{const record=post();record.contentItem.brand.preferences.autopilot={...config,enabled:false};mocks.find.mockResolvedValue(record);await deliver('autopilot-test','slot');expect(mocks.publish).not.toHaveBeenCalled();});
 it('does not publish while the workspace is paused',async()=>{const record=post();record.contentItem.brand.workspace.paused=true;mocks.find.mockResolvedValue(record);await deliver('autopilot-test','slot');expect(mocks.publish).not.toHaveBeenCalled();});
});
