/**
 * Admin Layout
 *
 * Layout for admin pages with navigation and admin badge.
 * Provides consistent structure across all admin pages.
 *
 * Authentication: Required (middleware handles redirect)
 * Authorization: Admin check performed in individual pages
 *
 * @see docs/stories/4.5.story.md
 */

import { createClient } from '@/lib/auth/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, BarChart3, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Admin Layout Component
 *
 * @param children - Child pages to render within the layout
 * @returns Admin layout with navigation and children
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  // Get user data for navigation
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Redirect to sign-in if not authenticated
  if (authError || !user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Brand and Admin Badge */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <Badge
                variant="outline"
                className="gap-1.5 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin View
              </Badge>
            </div>

            {/* Right side - Admin Links */}
            <div className="flex items-center gap-6">
              <Link
                href="/admin/feedback"
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
