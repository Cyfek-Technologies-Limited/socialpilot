'use client';
import { BrandLogo } from '@/components/brand-logo';

import { createAuthClient } from 'better-auth/react';
import { useState } from 'react';
export default function Page(){const [message,setMessage]=useState('');return <main className="legal"><div className="legal-brand"><BrandLogo/></div><h1>Set a new password</h1><form action={async form=>{const token=new URL(window.location.href).searchParams.get('token');if(!token){setMessage('Missing reset token. Request a new reset link.');return;}const result=await createAuthClient().resetPassword({token,newPassword:String(form.get('password'))});setMessage(result.error?.message||'Password updated. You can sign in now.');}}><label>New password<input name="password" type="password" minLength={12} maxLength={128} required/></label><button className="button button-primary">Reset password</button><p role="status">{message}</p><a href="/sign-in">Back to sign in</a></form></main>;}
