import { serve } from 'inngest/next';
import { inngest, drain, generate, publish, recoverStale, syncComments, refreshCredentials } from '@/lib/jobs';
export const { GET,POST,PUT }=serve({client:inngest,functions:[drain,generate,publish,recoverStale,syncComments,refreshCredentials]});
