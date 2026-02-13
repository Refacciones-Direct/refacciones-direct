import { getSignInUrl, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function LoginPage() {
  const { user } = await withAuth();

  if (user) {
    redirect('/');
  }

  const signInUrl = await getSignInUrl();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-gray-600">
          Sign in to your RefaccionesDirect account
        </p>
        <a
          href={signInUrl}
          className="inline-block w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Sign In
        </a>
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="signup" className="font-medium text-black hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
