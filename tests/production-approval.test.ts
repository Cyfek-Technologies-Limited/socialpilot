import { describe,it,expect,vi,beforeEach } from 'vitest';
const mocks=vi.hoisted(()=>({find:vi.fn(),update:vi.fn(),revision:vi.fn(),content:vi.fn(),audit:vi.fn()}));
vi.mock('../src/lib/access',()=>({user:async()=>({id:'owner'}),checkOrigin:()=>{},access:async()=>({workspace:{mode:'live',paused:false}}),brandAccess:vi.fn(),HttpError:class extends Error{constructor(public status:number,message:string){super(message);}}}));
vi.mock('../src/lib/jobs',()=>({enqueue:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:{platformPost:{findFirst:mocks.find,findFirstOrThrow:mocks.find,update:mocks.update},postRevision:{create:mocks.revision},contentItem:{update:mocks.content},auditLog:{create:mocks.audit}}}));
vi.mock('../src/lib/usage',async()=>{const {db}=await import('../src/lib/db');return {serial:async(fn:(tx:unknown)=>unknown)=>fn(db),reserve:vi.fn(),throttle:vi.fn()};});
import { POST } from '../src/app/api/app/route';
const kit={format:'carousel',sourceIds:[],carousel:Array(3).fill({title:'Useful slide',body:'Practical advice.'})};
const current=()=>({id:'post',version:7,workspaceId:'w',platform:'linkedin',contentItemId:'content',caption:'Caption',hashtags:'',mediaId:null,approvalState:'APPROVED',deliveryState:'SCHEDULED',scheduledAt:new Date(),account:{platform:'linkedin',status:'CONNECTED',mode:'live',autoPublishConsentAt:new Date()},approvals:[{version:7}],contentItem:{graphicBrief:JSON.stringify({production:kit}),brand:{paused:false,preferences:{}}}});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('APP_MODE','live');mocks.find.mockResolvedValue(current());mocks.update.mockResolvedValue({id:'post'});});
function request(body:Record<string,unknown>){return new Request('https://example.com/api/app',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspaceId:'w',...body})});}
describe('production assets and publishing approval',()=>{
 it('requires a fresh approval and cancels scheduling after production edits',async()=>{
   const response=await POST(request({action:'production.save',postId:'post',version:7,production:kit}));expect(response.status).toBe(200);
   expect(mocks.revision).toHaveBeenCalled();expect(mocks.update).toHaveBeenCalledWith({where:{id:'post'},data:expect.objectContaining({version:{increment:1},approvalState:'DRAFT',deliveryState:'UNSCHEDULED',scheduledAt:null,deliveryKey:null})});
 });
 it('rejects stale asset edits without writing a new revision',async()=>{
   const response=await POST(request({action:'production.save',postId:'post',version:6,production:kit}));expect(response.status).toBe(400);expect(mocks.revision).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
 });
 it('does not silently publish a carousel as a caption-only post',async()=>{
   const response=await POST(request({action:'post.schedule',id:'post',version:7,localTime:'2030-01-01T09:00',timezone:'Africa/Lagos'}));expect(response.status).toBe(400);expect((await response.json()).error).toContain('Video and carousel publishing is not connected');expect(mocks.update).not.toHaveBeenCalled();
 });
});
