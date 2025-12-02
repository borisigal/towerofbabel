import { createClient } from '@/lib/auth/supabaseServer';
import { checkCancelledStatus } from '@/lib/middleware/checkCancelledStatus';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { redirect } from 'next/navigation';

/**
 * Dashboard Layout
 *
 * Layout for authenticated dashboard pages with navigation.
 * Includes DashboardNav component with usage indicator (Story 3.2).
 *
 * CRITICAL SECURITY:
 * Calls checkCancelledStatus middleware to block cancelled users from ALL dashboard access.
 * Cancelled users are redirected to subscription-required page (Story 3.5 - AC 8).
 *
 * Server Component - Fetches user data server-side to pass to DashboardNav.
 * Responsive container with proper padding across breakpoints.
 */

/**
 * Dashboard Layout Component
 *
 * @param children - Child pages to render within the layout
 * @returns Dashboard layout with navigation and children
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  // CRITICAL: Check cancelled status on EVERY dashboard page load
  // Blocks cancelled users from ALL dashboard access (financially sensitive)
  await checkCancelledStatus();

  // Get user data for DashboardNav
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
    <div className="min-h-screen bg-gradient-to-br from-[hsl(262,70%,20%)] via-[hsl(220,60%,30%)] to-[hsl(200,50%,35%)] text-white">
      {/* Dashboard Navigation with Usage Indicator (Story 3.2) */}
      <DashboardNav
        userName={user.user_metadata?.name}
        userEmail={user.email || ''}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
