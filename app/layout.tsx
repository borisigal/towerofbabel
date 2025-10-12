import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'TowerOfBabel',
  description: 'Cultural interpretation tool for cross-cultural communication',
};

/**
 * Root layout component for the TowerOfBabel application.
 * Server Component by default (no 'use client' directive).
 *
 * @param children - Child components to render in the main content area
 */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        {/* Placeholder navigation bar - will be populated in later stories */}
        <nav className="border-b p-4 bg-white dark:bg-gray-800">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">TowerOfBabel</div>
              {/* Navigation items will be added in future stories */}
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
