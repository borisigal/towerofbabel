'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/lib/auth/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

/**
 * Sign-in page component for TowerOfBabel authentication.
 *
 * Provides two authentication methods:
 * 1. Magic link via email (passwordless authentication)
 * 2. Google OAuth (social login)
 *
 * Styled to match the landing page with purple gradient background.
 *
 * CRITICAL: This is a client component because it uses:
 * - useState for form state management
 * - Event handlers (onSubmit, onClick)
 * - Browser-side Supabase client
 */
export default function SignInPage(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * Handles magic link email authentication.
   * Sends a one-time password link to the user's email.
   *
   * @param e - Form submit event
   */
  const handleMagicLink = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess('Check your email for the magic link!');
    }

    setLoading(false);
  };

  /**
   * Handles Google OAuth authentication.
   * Redirects user to Google consent screen.
   */
  const handleGoogleSignIn = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
    // Note: Google OAuth redirects automatically, no need to reset loading state
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(262,70%,20%)] via-[hsl(220,60%,30%)] to-[hsl(200,50%,35%)] text-white flex items-center justify-center px-4">
      {/* Back to Home Link - Absolute positioned */}
      <div className="absolute top-6 left-4 sm:left-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Welcome</h1>
              <p className="text-white/70">
                Sign in to continue bridging cultural communication gaps
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded-xl">
                <span className="block sm:inline">{success}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center my-8">
              <div className="flex-1 border-t border-white/20"></div>
              <span className="px-4 text-sm text-white/50">or continue with email magic link</span>
              <div className="flex-1 border-t border-white/20"></div>
            </div>

            {/* Magic Link Form */}
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 rounded-full py-6 text-lg font-semibold"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Magic Link'
                )}
              </Button>
            </form>

            {/* Terms Notice */}
            <p className="mt-6 text-center text-xs text-white/50">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-white/70 hover:text-white underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-white/70 hover:text-white underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
  );
}
