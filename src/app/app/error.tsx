'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="legal"><span className="badge warning">WORKSPACE UNAVAILABLE</span><h1>Let’s get you back on track.</h1><p>The workspace could not be loaded. Check database connectivity and server authentication configuration, then try again. Your saved drafts remain in the database.</p><Button onClick={reset}>Try again</Button><p><a className="text-link" href="/sign-in">Back to sign in</a></p></main>;}
