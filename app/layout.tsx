import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: 'TowerOfBabel',
  description: 'Cultural interpretation tool for cross-cultural communication',
};

/**
 * Root layout component for the TowerOfBabel application.
 * Server Component by default (no 'use client' directive).
 *
 * Provides basic HTML structure and global components.
 * Navigation is handled by route-specific layouts (dashboard, auth, etc.).
 *
 * @param children - Child components to render in the main content area
 */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
