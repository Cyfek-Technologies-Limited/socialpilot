import { describe,it,expect } from 'vitest';
import { researchDraftKey,restoreResearchDraft,type ResearchDraft } from '../src/components/use-research-draft';
const empty:ResearchDraft={platforms:['youtube'],query:'Saved brand niche',competitors:'',daily:false,emailReports:false,sources:[],title:'',url:'',channel:'',opening:'',comments:''};
describe('research form refresh persistence',()=>{
 it('restores incomplete inputs and intentional empty values instead of reverting to brand defaults',()=>{
   const draft={...empty,query:'',competitors:'https://www.youtube.com/@raroque',title:'Unfinished evidence',url:'https://',comments:'A comment I am typing',daily:true};
   expect(restoreResearchDraft({getItem:()=>JSON.stringify(draft)},'key',empty)).toEqual(draft);
 });
 it('isolates browser drafts across users, workspaces and brands',()=>{
   const keys=[researchDraftKey('u1','w1','b1'),researchDraftKey('u2','w1','b1'),researchDraftKey('u1','w2','b1'),researchDraftKey('u1','w1','b2')];expect(new Set(keys).size).toBe(4);
   const records=new Map([[keys[0],JSON.stringify({...empty,query:'My private draft'})]]);
   expect(restoreResearchDraft({getItem:key=>records.get(key)||null},keys[1],empty)).toEqual(empty);
 });
 it('uses server defaults safely when storage is unavailable or malformed',()=>{
   expect(restoreResearchDraft({getItem:()=>{throw new Error('Blocked');}},'key',empty)).toEqual(empty);
   expect(restoreResearchDraft({getItem:()=>'{broken'},'key',empty)).toEqual(empty);
   expect(restoreResearchDraft({getItem:()=>'{"daily":"invalid"}'},'key',empty)).toEqual(empty);
 });
});
