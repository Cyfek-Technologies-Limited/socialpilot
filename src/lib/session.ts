import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from './auth';

export async function redirectIfSignedIn() {
  // Keep the public pages accessible before the server is configured.
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) return;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect('/app');
}
