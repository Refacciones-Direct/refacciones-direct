import { getSignUpUrl, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SignupPage() {
  const { user } = await withAuth();

  if (user) {
    redirect('/');
  }

  const signUpUrl = await getSignUpUrl();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        <p className="text-sm text-gray-600">Create your RefaccionesDirect account</p>
        <a
          href={signUpUrl}
          className="inline-block w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Sign Up
        </a>
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="login" className="font-medium text-black hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
