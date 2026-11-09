import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { db } from './db';
import { required } from './config';
function createAuth() {
  return betterAuth({ secret: required('BETTER_AUTH_SECRET'), baseURL: required('BETTER_AUTH_URL'), database: prismaAdapter(db, {provider:'postgresql'}),
    emailAndPassword: { enabled:true, minPasswordLength:12, maxPasswordLength:128,
      ...(process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? { sendResetPassword: async ({user,url}:{user:{email:string};url:string}) => {
        const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${required('RESEND_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({from:required('EMAIL_FROM'),to:user.email,subject:'Reset your Soville password',text:`Reset your password: ${url}`})});
        if(!response.ok) throw new Error('Password reset delivery failed.');
      }} : {}) },
    // A persistent cookie with a fixed seven-day lifetime from sign-in.
    session: { expiresIn: 60 * 60 * 24 * 7, disableSessionRefresh: true },
    rateLimit: {enabled:true,storage:'database',window:60,max:60},
    logger:{level:'error',log(){console.error('Authentication operation failed. Check database connectivity and server configuration.');}},
    plugins:[nextCookies()]
  });
}
let instance:ReturnType<typeof createAuth>|undefined;
export function getAuth():ReturnType<typeof createAuth>{return instance??(instance=createAuth());}
