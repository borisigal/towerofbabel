'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Sign-out button component.
 *
 * CRITICAL: This is a client component because it uses:
 * - useRouter for navigation
 * - useState for loading state
 * - onClick event handler
 *
 * Calls /api/auth/sign-out POST endpoint to clear session.
 */
export function SignOutButton(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignOut = async (): Promise<void> => {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
      });

      if (response.ok) {
        // Redirect to landing page
        router.push('/');
        router.refresh();
      } else {
        console.error('Sign-out failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('Sign-out error:', error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
