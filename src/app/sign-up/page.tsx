import { AuthForm } from '@/components/auth-form';
import { redirectIfSignedIn } from '@/lib/session';
export default async function Page(){await redirectIfSignedIn();return <AuthForm mode="sign-up"/>;}
