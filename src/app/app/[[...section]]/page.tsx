import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { WorkspaceApp } from '@/components/workspace-app';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{section?:string[]}>}){
  if(!process.env.DATABASE_URL||!process.env.BETTER_AUTH_SECRET||!process.env.APP_MODE)return <main className="legal"><span className="badge warning">SETUP REQUIRED</span><h1>Your workspace is almost ready.</h1><p>Configure DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, APP_URL, and APP_MODE in the server environment. Apply the included Prisma migration, then restart the application.</p><p>Use the README and .env.example in the project folder for exact setup steps. No account activity is simulated in live mode.</p><Link href="/">Back to home</Link></main>;
  const session=await getAuth().api.getSession({headers:await headers()});if(!session)redirect('/sign-in');
  const {section}=await params;return <WorkspaceApp section={section?.[0]||'overview'}/>;
}
