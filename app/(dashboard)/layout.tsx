/**
 * Dashboard Layout
 *
 * Simple wrapper for dashboard pages.
 * Navigation is handled by root layout to avoid duplication (DRY principle).
 *
 * Server Component - Provides consistent layout for all dashboard pages.
 * Responsive container with proper padding across breakpoints.
 */

/**
 * Dashboard Layout Component
 *
 * @param children - Child pages to render within the layout
 * @returns Dashboard layout with children
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
