import './globals.css';
import { ReactNode } from 'react';
import { createClient } from '@/lib/auth/supabaseServer';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const metadata = {
  title: 'TowerOfBabel',
  description: 'Cultural interpretation tool for cross-cultural communication',
};

/**
 * Root layout component for the TowerOfBabel application.
 * Server Component by default (no 'use client' directive).
 *
 * Displays sign-out button in navigation when user is authenticated.
 *
 * @param children - Child components to render in the main content area
 */
export default async function RootLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        {/* Navigation bar with conditional sign-out button */}
        <nav className="border-b p-4 bg-white dark:bg-gray-800">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">TowerOfBabel</div>
              <div className="flex items-center gap-4">
                {user && <SignOutButton />}
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
